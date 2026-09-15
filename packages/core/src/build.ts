import { getFieldSpec, getFieldSpecs, denormalizeDow } from './syntax';
import type {
  CronConfig,
  CronSyntax,
  FieldKey,
  FieldRule,
  FieldValue,
} from './types';

/**
 * 把归一化数值格式化为该字段的写法。
 *
 * 周字段输出该语法下的数字编号：Quartz 为 1=周日 … 7=周六，其余语法为 0=周日 … 6=周六。
 * 数字编号在所有语法中都可解析，避免部分 cron 实现不认 MON 这类别名。
 */
export function formatFieldValue(value: number, key: FieldKey, syntax: CronSyntax): string {
  if (key === 'week') return String(denormalizeDow(value, syntax));
  return String(value);
}

const formatValue = formatFieldValue;

/** 取该字段在某语法下的最小源编号 */
function minSource(key: FieldKey, syntax: CronSyntax): number {
  if (key === 'week') return denormalizeDow(0, syntax);
  return getFieldSpec(key, syntax).min;
}

/** 判断一个配置是否等于「不限定」（* 或 ?） */
function isUnrestricted(value: FieldValue | undefined): boolean {
  if (!value) return true;
  return value.mode === 'every' || value.mode === 'any';
}

/**
 * 把单个字段的可视化配置转换为 Cron 字段文本。
 *
 * @param key    字段键名
 * @param value  字段配置；不传时按语法默认值处理
 * @param syntax 语法类型
 */
export function buildField(
  key: FieldKey,
  value: FieldValue | undefined,
  syntax: CronSyntax = 'quartz',
): string {
  const spec = getFieldSpec(key, syntax);
  if (!value) return '*';

  switch (value.mode) {
    case 'every':
      return '*';

    case 'any':
      return spec.allowAny ? '?' : '*';

    case 'raw':
      return value.raw && value.raw.trim() ? value.raw.trim() : '*';

    case 'specific': {
      const list = value.list?.length
        ? value.list
        : value.from !== undefined
          ? [value.from]
          : [];
      if (!list.length) return '*';
      const unique = Array.from(new Set(list)).sort((a, b) => a - b);
      return unique.map((item) => formatValue(item, key, syntax)).join(',');
    }

    case 'range': {
      if (value.from === undefined || value.to === undefined) return '*';
      const base = `${formatValue(value.from, key, syntax)}-${formatValue(value.to, key, syntax)}`;
      return value.step && value.step > 1 ? `${base}/${value.step}` : base;
    }

    case 'interval': {
      const step = value.step && value.step > 0 ? value.step : 1;
      if (value.from === undefined || value.from === minSource(key, syntax)) {
        return `*/${step}`;
      }
      return `${formatValue(value.from, key, syntax)}/${step}`;
    }

    case 'last':
      return value.offset && value.offset > 0 ? `L-${value.offset}` : 'L';

    case 'lastWeekday':
      return 'LW';

    case 'nearestWeekday':
      return `${value.from ?? 1}W`;

    case 'lastOfWeek':
      return `${formatValue(value.from ?? 0, key, syntax)}L`;

    case 'nthWeekday':
      return `${formatValue(value.from ?? 0, key, syntax)}#${value.nth ?? 1}`;

    default:
      return '*';
  }
}

/**
 * 规整配置：处理「日」与「周」的互斥关系，补全缺失字段。
 *
 * Quartz / Spring 要求两者中必须有一个是 `?`；Linux / Node 没有 `?`，两者可同时限定（取或）。
 */
export function normalizeConfig(
  config: CronConfig,
  prefer: 'day' | 'week' = 'day',
): CronConfig {
  const syntax = config.syntax ?? 'quartz';
  const fields: Partial<Record<FieldKey, FieldValue>> = { ...config.fields };

  if (syntax === 'quartz' || syntax === 'spring') {
    const daySet = !isUnrestricted(fields.day);
    const weekSet = !isUnrestricted(fields.week);

    if (daySet && weekSet) {
      // 冲突：以 prefer 指定的字段为准，另一个置为 ?
      if (prefer === 'day') {
        fields.week = { mode: 'any' };
      } else {
        fields.day = { mode: 'any' };
      }
    } else if (!daySet && !weekSet) {
      // 两者都没被限定，必须保证恰好有一个是 ?，另一个是 *
      const dayIsAny = fields.day?.mode === 'any';
      const weekIsAny = fields.week?.mode === 'any';
      if (dayIsAny && weekIsAny) {
        fields.week = { mode: 'every' };
      } else if (!dayIsAny && !weekIsAny) {
        fields.day = { mode: 'any' };
        fields.week = fields.week ?? { mode: 'every' };
      }
    } else if (daySet) {
      fields.week = { mode: 'any' };
    } else {
      fields.day = { mode: 'any' };
    }
  }

  return { syntax, fields };
}

/**
 * 把可视化配置转换为 Cron 表达式。
 *
 * @param config 配置
 * @param prefer 当日/周同时被限定时，以哪个字段为准，默认 `day`
 */
export function buildExpression(
  config: CronConfig,
  prefer: 'day' | 'week' = 'day',
): string {
  const syntax = config.syntax ?? 'quartz';
  const normalized = normalizeConfig(config, prefer);
  const fieldSpecs = getFieldSpecs(syntax);

  return fieldSpecs
    .map((fieldSpec) => buildField(fieldSpec.key, normalized.fields[fieldSpec.key], syntax))
    .join(' ');
}

/** 把解析出的规则还原为可视化配置，用于编辑器回填 */
export function ruleToFieldValue(rule: FieldRule, syntax: CronSyntax): FieldValue {
  const raw = rule.raw;
  const key = rule.key;
  const spec = getFieldSpec(key, syntax);

  if (rule.every) return { mode: 'every' };
  if (rule.any) return { mode: 'any' };

  // 单一特殊规则
  if (rule.specials.length === 1 && rule.values.length === 0) {
    const special = rule.specials[0];
    switch (special.kind) {
      case 'lastDay':
        return special.offset > 0
          ? { mode: 'last', offset: special.offset }
          : { mode: 'last' };
      case 'lastWeekdayOfMonth':
        return { mode: 'lastWeekday' };
      case 'nearestWeekday':
        return { mode: 'nearestWeekday', from: special.day };
      case 'lastOfWeek':
        return { mode: 'lastOfWeek', from: special.dow, list: [special.dow] };
      case 'nthWeekday':
        return { mode: 'nthWeekday', from: special.dow, nth: special.nth, list: [special.dow] };
      default:
        break;
    }
  }

  // 含特殊规则且混有普通值 —— 超出编辑器表达能力，按原文处理
  if (rule.specials.length > 0) {
    return { mode: 'raw', raw };
  }

  const values = rule.values;

  // 步长写法
  if (raw.includes('/')) {
    const [base, stepText] = raw.split('/');
    const step = Number.parseInt(stepText, 10);
    if (Number.isFinite(step) && step > 0 && values.length > 0) {
      if (base.includes('-') && values.length > 1) {
        return { mode: 'range', from: values[0], to: values[values.length - 1], step, list: values };
      }
      if (base === '*') {
        return { mode: 'interval', from: spec.min === undefined ? values[0] : minSource(key, syntax), step, list: values };
      }
      return { mode: 'interval', from: values[0], step, list: values };
    }
    return { mode: 'raw', raw };
  }

  // 区间写法：仅当展开后的值是一个连续递增序列时才认为是标准区间
  if (raw.includes('-') && values.length > 1) {
    const sorted = [...values].sort((a, b) => a - b);
    const isContiguous = sorted.every((item, index) =>
      index === 0 ? true : item === sorted[index - 1] + 1,
    );
    if (isContiguous) {
      return { mode: 'range', from: sorted[0], to: sorted[sorted.length - 1], list: sorted };
    }
    return { mode: 'raw', raw };
  }

  if (values.length === 1) {
    return { mode: 'specific', list: values, from: values[0] };
  }

  if (values.length > 0) {
    return { mode: 'specific', list: values, from: values[0] };
  }

  return { mode: 'raw', raw };
}
