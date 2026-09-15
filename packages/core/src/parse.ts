import {
  ALLOWED_CHARS,
  DOW_ALIASES,
  MONTH_ALIASES,
  getFieldSpec,
  getFieldSpecs,
  getSyntaxSpec,
  normalizeDow,
} from './syntax';
import type {
  CronIssue,
  CronSyntax,
  FieldKey,
  FieldRule,
  ParseResult,
  SpecialRule,
} from './types';

/** 合法的字符集 */
const TOKEN_RE = /^[0-9A-Za-z*?,\-/LW#]+$/;
/** 纯数字 */
const DIGIT_RE = /^\d+$/;

/** 按空白拆分为字段数组 */
export function splitFields(expression: string): string[] {
  return String(expression ?? '')
    .trim()
    .split(/\s+/)
    .filter((item) => item.length > 0);
}

/** 把字段文本中的别名解析为「源编号」（周字段使用该语法自身的编号规则） */
function aliasToSourceNumber(
  token: string,
  key: FieldKey,
  syntax: CronSyntax,
): number | null {
  const upper = token.toUpperCase();
  if (key === 'month' && upper in MONTH_ALIASES) return MONTH_ALIASES[upper];
  if (key === 'week' && upper in DOW_ALIASES) {
    const normalized = DOW_ALIASES[upper];
    return syntax === 'quartz' ? normalized + 1 : normalized;
  }
  return null;
}

/** 源编号 → 归一化编号（周字段换算为 0=周日 … 6=周六，其余原样返回） */
function sourceToNormalized(value: number, key: FieldKey, syntax: CronSyntax): number {
  return key === 'week' ? normalizeDow(value, syntax) : value;
}

/** 解析单个「值」token，返回源编号；失败返回 null 并写入 issue */
function parseValueToken(
  token: string,
  key: FieldKey,
  syntax: CronSyntax,
  issues: CronIssue[],
): number | null {
  const spec = getFieldSpec(key, syntax);
  const trimmed = token.trim();
  if (!trimmed) {
    issues.push({
      field: key,
      code: 'invalid-value',
      message: `「${spec.label}」字段存在空值，请检查逗号分隔`,
    });
    return null;
  }

  const alias = aliasToSourceNumber(trimmed, key, syntax);
  if (alias !== null) {
    if (key === 'week') return alias;
    if (alias < spec.min || alias > spec.max) {
      issues.push({
        field: key,
        code: 'out-of-range',
        message: `「${spec.label}」字段的取值 ${trimmed} 超出范围（${spec.range}）`,
      });
      return null;
    }
    return alias;
  }

  if (!DIGIT_RE.test(trimmed)) {
    issues.push({
      field: key,
      code: 'unknown-alias',
      message: `「${spec.label}」字段出现无法识别的值「${trimmed}」`,
    });
    return null;
  }

  const num = Number.parseInt(trimmed, 10);
  if (key === 'week') {
    if (normalizeDow(num, syntax) < 0) {
      issues.push({
        field: key,
        code: 'out-of-range',
        message: `「${spec.label}」字段的取值 ${num} 超出范围（${spec.range}）`,
      });
      return null;
    }
    return num;
  }
  if (num < spec.min || num > spec.max) {
    issues.push({
      field: key,
      code: 'out-of-range',
      message: `「${spec.label}」字段的取值 ${num} 超出范围（${spec.range}）`,
    });
    return null;
  }
  return num;
}

/**
 * 把「起点 / 终点 / 步长」展开为有序列表并按步长抽样。
 * 起点大于终点时按环绕处理（如周字段的 FRI-MON）。
 */
function expandSequence(
  from: number,
  to: number,
  step: number,
  min: number,
  max: number,
): number[] {
  let ordered: number[] = [];
  if (from === to) {
    ordered = [from];
  } else if (from < to) {
    for (let i = from; i <= to; i += 1) ordered.push(i);
  } else {
    for (let i = from; i <= max; i += 1) ordered.push(i);
    for (let i = min; i <= to; i += 1) ordered.push(i);
  }
  if (step <= 1) return ordered;
  return ordered.filter((_, index) => index % step === 0);
}

/** 单个逗号段的解析结果 */
interface SegmentResult {
  values: number[];
  specials: SpecialRule[];
}

/**
 * 解析一个逗号分隔段，如 `*`、`5`、`1-10/2`、`L`、`15W`、`MON#2`。
 * 无匹配项时推入 issues。
 */
function parseSegment(
  segment: string,
  key: FieldKey,
  syntax: CronSyntax,
  issues: CronIssue[],
): SegmentResult | null {
  const spec = getFieldSpec(key, syntax);
  const seg = segment.trim();
  if (!seg) {
    issues.push({
      field: key,
      code: 'invalid-value',
      message: `「${spec.label}」字段存在空值，请检查逗号分隔`,
    });
    return null;
  }

  // 1. `#` —— 当月第 n 个星期几
  if (seg.includes('#')) {
    const match = /^([A-Za-z]+|\d+)#(\d+)$/.exec(seg);
    if (!match) {
      issues.push({
        field: key,
        code: 'invalid-value',
        message: `「${spec.label}」字段的 # 写法不正确，应形如 MON#2 或 2#2`,
      });
      return null;
    }
    if (key !== 'week' || !spec.allowNth) {
      issues.push({
        field: key,
        code: 'unsupported-char',
        message: `「${spec.label}」字段不支持 # 语法`,
      });
      return null;
    }
    const dow = parseValueToken(match[1], key, syntax, issues);
    const nth = Number.parseInt(match[2], 10);
    if (dow === null) return null;
    if (nth < 1 || nth > 5) {
      issues.push({
        field: key,
        code: 'out-of-range',
        message: `「${spec.label}」字段的 # 序号只能是 1-5，收到 ${nth}`,
      });
      return null;
    }
    return {
      values: [],
      specials: [{ kind: 'nthWeekday', dow: sourceToNormalized(dow, key, syntax), nth }],
    };
  }

  // 2. `W` —— 最近的工作日
  if (seg.toUpperCase().includes('W')) {
    if (key !== 'day' || !spec.allowWeekday) {
      issues.push({
        field: key,
        code: 'unsupported-char',
        message: `「${spec.label}」字段不支持 W 语法（仅 Quartz 的「日」字段可用）`,
      });
      return null;
    }
    const upper = seg.toUpperCase();
    if (upper === 'LW') {
      return { values: [], specials: [{ kind: 'lastWeekdayOfMonth' }] };
    }
    const match = /^(\d+)W$/.exec(upper);
    if (!match) {
      issues.push({
        field: key,
        code: 'invalid-value',
        message: `「${spec.label}」字段的 W 写法不正确，应形如 15W 或 LW`,
      });
      return null;
    }
    const day = Number.parseInt(match[1], 10);
    if (day < 1 || day > 31) {
      issues.push({
        field: key,
        code: 'out-of-range',
        message: `「${spec.label}」字段的 W 取值只能是 1-31，收到 ${day}`,
      });
      return null;
    }
    return { values: [], specials: [{ kind: 'nearestWeekday', day }] };
  }

  // 3. `L` —— 最后一天 / 最后一个星期几
  if (/L/i.test(seg)) {
    if (!spec.allowLast) {
      issues.push({
        field: key,
        code: 'unsupported-char',
        message: `「${spec.label}」字段不支持 L 语法`,
      });
      return null;
    }
    const upper = seg.toUpperCase();
    if (upper === 'L') {
      if (key === 'week') {
        // 周字段单独的 L 等价于当月最后一个周六
        return { values: [], specials: [{ kind: 'lastOfWeek', dow: 6 }] };
      }
      return { values: [], specials: [{ kind: 'lastDay', offset: 0 }] };
    }
    const offsetMatch = /^L-(\d+)$/.exec(upper);
    if (offsetMatch) {
      if (key !== 'day') {
        issues.push({
          field: key,
          code: 'unsupported-char',
          message: `「${spec.label}」字段不支持 L-n 语法（仅「日」字段可用）`,
        });
        return null;
      }
      const offset = Number.parseInt(offsetMatch[1], 10);
      return { values: [], specials: [{ kind: 'lastDay', offset }] };
    }
    const dowMatch = /^([A-Za-z]+|\d+)L$/.exec(upper);
    if (dowMatch && key === 'week') {
      const dow = parseValueToken(dowMatch[1], key, syntax, issues);
      if (dow === null) return null;
      return {
        values: [],
        specials: [{ kind: 'lastOfWeek', dow: sourceToNormalized(dow, key, syntax) }],
      };
    }
    issues.push({
      field: key,
      code: 'invalid-value',
      message: `「${spec.label}」字段的 L 写法不正确，可用写法：L、L-3、15W、LW、MON#2`,
    });
    return null;
  }

  // 4. `/` —— 步长
  if (seg.includes('/')) {
    const parts = seg.split('/');
    if (parts.length !== 2) {
      issues.push({
        field: key,
        code: 'invalid-value',
        message: `「${spec.label}」字段的步长写法不正确，应形如 */5、0/5、10-50/5`,
      });
      return null;
    }
    const step = Number.parseInt(parts[1], 10);
    if (!DIGIT_RE.test(parts[1]) || step <= 0) {
      issues.push({
        field: key,
        code: 'invalid-step',
        message: `「${spec.label}」字段的步长必须是大于 0 的整数，收到「${parts[1]}」`,
      });
      return null;
    }
    const base = parts[0].trim();
    if (!base) {
      issues.push({
        field: key,
        code: 'invalid-value',
        message: `「${spec.label}」字段的步长缺少起始值`,
      });
      return null;
    }
    let from: number;
    let to: number;
    if (base === '*') {
      from = spec.min;
      to = key === 'week' ? spec.max : spec.max;
    } else if (base.includes('-')) {
      const [rawFrom, rawTo] = base.split('-');
      const start = parseValueToken(rawFrom, key, syntax, issues);
      const end = parseValueToken(rawTo, key, syntax, issues);
      if (start === null || end === null) return null;
      from = start;
      to = end;
    } else {
      const start = parseValueToken(base, key, syntax, issues);
      if (start === null) return null;
      from = start;
      to = spec.max;
    }
    const sequence = expandSequence(from, to, step, spec.min, spec.max);
    return {
      values: sequence.map((value) => sourceToNormalized(value, key, syntax)),
      specials: [],
    };
  }

  // 5. `-` —— 区间
  if (seg.includes('-')) {
    const parts = seg.split('-');
    if (parts.length !== 2) {
      issues.push({
        field: key,
        code: 'invalid-range',
        message: `「${spec.label}」字段的区间写法不正确，应形如 1-10`,
      });
      return null;
    }
    const start = parseValueToken(parts[0], key, syntax, issues);
    const end = parseValueToken(parts[1], key, syntax, issues);
    if (start === null || end === null) return null;
    const sequence = expandSequence(
      Math.min(start, end),
      Math.max(start, end),
      1,
      spec.min,
      spec.max,
    );
    // 周字段的 FRI-MON 需要环绕，上面用 min/max 已丢失顺序信息，这里单独处理
    const ordered =
      key === 'week' && start > end
        ? expandSequence(start, end, 1, spec.min, spec.max)
        : sequence;
    return {
      values: ordered.map((value) => sourceToNormalized(value, key, syntax)),
      specials: [],
    };
  }

  // 6. 单值
  const single = parseValueToken(seg, key, syntax, issues);
  if (single === null) return null;
  return {
    values: [sourceToNormalized(single, key, syntax)],
    specials: [],
  };
}

/** 解析单个字段 */
export function parseField(
  raw: string,
  key: FieldKey,
  syntax: CronSyntax = 'quartz',
): { rule: FieldRule; issues: CronIssue[] } {
  const issues: CronIssue[] = [];
  const spec = getFieldSpec(key, syntax);
  const text = String(raw ?? '').trim();
  const allowed = ALLOWED_CHARS[syntax] ?? ALLOWED_CHARS.quartz;

  const rule: FieldRule = {
    key,
    raw: text,
    every: false,
    any: false,
    values: [],
    specials: [],
    restricted: false,
  };

  if (!text) {
    issues.push({
      field: key,
      code: 'empty-field',
      message: `「${spec.label}」字段不能为空`,
    });
    return { rule, issues };
  }

  if (!TOKEN_RE.test(text)) {
    issues.push({
      field: key,
      code: 'invalid-char',
      message: `「${spec.label}」字段包含非法字符，只允许数字、字母和 * ? , - / L W #`,
    });
    return { rule, issues };
  }

  // 该语法不支持的字符
  const specialChars = ['?', 'L', 'W', '#'];
  for (const char of specialChars) {
    if (text.toUpperCase().includes(char) && !allowed.includes(char)) {
      issues.push({
        field: key,
        code: 'unsupported-char',
        message: `${getSyntaxSpec(syntax).label} 语法的「${spec.label}」字段不支持 ${char} 语法`,
      });
      return { rule, issues };
    }
  }

  if (text === '*') {
    rule.every = true;
    for (let i = spec.min; i <= spec.max; i += 1) {
      rule.values.push(sourceToNormalized(i, key, syntax));
    }
    if (key === 'week') rule.values = Array.from(new Set(rule.values));
    return { rule, issues };
  }

  if (text === '?') {
    if (!spec.allowAny) {
      issues.push({
        field: key,
        code: 'unsupported-char',
        message: `「${spec.label}」字段不支持 ?（只能用在「日」或「周」字段）`,
      });
      return { rule, issues };
    }
    rule.any = true;
    return { rule, issues };
  }

  const segments = text.split(',');
  const valueSet = new Set<number>();
  for (const segment of segments) {
    const parsed = parseSegment(segment, key, syntax, issues);
    if (parsed) {
      parsed.values.forEach((value) => valueSet.add(value));
      rule.specials.push(...parsed.specials);
    }
  }

  rule.values = Array.from(valueSet).sort((a, b) => a - b);
  rule.restricted = true;

  if (issues.length === 0 && rule.values.length === 0 && rule.specials.length === 0) {
    issues.push({
      field: key,
      code: 'invalid-value',
      message: `「${spec.label}」字段「${text}」无法解析`,
    });
    rule.restricted = false;
  }

  return { rule, issues };
}

/**
 * 解析一条 Cron 表达式。
 *
 * @param expression 表达式文本
 * @param syntax     语法类型，默认 `quartz`
 */
export function parseExpression(
  expression: string,
  syntax: CronSyntax = 'quartz',
): ParseResult {
  const issues: CronIssue[] = [];
  const spec = getSyntaxSpec(syntax);
  const raw = String(expression ?? '').trim();
  let tokens = splitFields(raw);

  // —— 字段数量校验与自动补全 ——
  if (syntax === 'quartz') {
    if (tokens.length === 6) {
      tokens = [...tokens, '*'];
    } else if (tokens.length !== 7) {
      issues.push({
        field: undefined,
        code: 'field-count',
        message: `Quartz 表达式需要 7 个字段（秒 分 时 日 月 周 年），年可省略；当前收到 ${tokens.length} 个`,
      });
    }
  } else if (syntax === 'node') {
    if (tokens.length === 5) {
      tokens = ['0', ...tokens];
    } else if (tokens.length !== 6) {
      issues.push({
        field: undefined,
        code: 'field-count',
        message: `Node 表达式需要 6 个字段（秒 分 时 日 月 周），秒可省略；当前收到 ${tokens.length} 个`,
      });
    }
  } else if (tokens.length !== spec.fieldCount) {
    issues.push({
      field: undefined,
      code: 'field-count',
      message: `${spec.label} 表达式需要 ${spec.fieldCount} 个字段（${spec.fields
        .map((key) => getFieldSpec(key, syntax).label)
        .join(' ')}）；当前收到 ${tokens.length} 个`,
    });
  }

  const rules: Partial<Record<FieldKey, FieldRule>> = {};

  if (issues.some((issue) => issue.code === 'field-count')) {
    return {
      expression: raw,
      syntax,
      valid: false,
      issues,
      rules,
      normalized: raw,
    };
  }

  const fieldSpecs = getFieldSpecs(syntax);
  fieldSpecs.forEach((fieldSpec, index) => {
    const text = tokens[index] ?? '*';
    const { rule, issues: fieldIssues } = parseField(text, fieldSpec.key, syntax);
    rules[fieldSpec.key] = rule;
    issues.push(...fieldIssues);
  });

  // —— 日 / 周 冲突校验 ——
  const dayRule = rules.day;
  const weekRule = rules.week;
  if (dayRule && weekRule && (syntax === 'quartz' || syntax === 'spring')) {
    const dayIsAny = dayRule.any;
    const weekIsAny = weekRule.any;
    if (!dayIsAny && !weekIsAny) {
      issues.push({
        field: 'week',
        code: 'day-week-conflict',
        message: `${spec.label} 语法要求「日」和「周」字段中必须有一个是 ?，避免两条规则冲突`,
      });
    }
    if (dayIsAny && weekIsAny) {
      issues.push({
        field: 'day',
        code: 'day-week-conflict',
        message: `${spec.label} 语法要求「日」和「周」字段中必须有一个不是 ?，否则无法确定执行日期`,
      });
    }
  }

  const hardErrors = issues.filter((issue) => issue.code !== 'unknown-alias');
  const valid = hardErrors.length === 0;

  return {
    expression: raw,
    syntax,
    valid,
    issues,
    rules,
    normalized: valid ? tokens.join(' ') : raw,
  };
}

/** 仅校验表达式是否合法 */
export function validateExpression(
  expression: string,
  syntax: CronSyntax = 'quartz',
): { valid: boolean; issues: CronIssue[]; message: string } {
  const result = parseExpression(expression, syntax);
  return {
    valid: result.valid,
    issues: result.issues,
    message: result.issues.length ? result.issues[0].message : '',
  };
}

/** 反解析：把表达式转换回可视化配置，供编辑器回填 */
export function expressionToConfig(
  expression: string,
  syntax: CronSyntax = 'quartz',
): { config: ParseResult['rules']; valid: boolean; issues: CronIssue[] } {
  const result = parseExpression(expression, syntax);
  return { config: result.rules, valid: result.valid, issues: result.issues };
}
