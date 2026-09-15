import { parseExpression } from './parse';
import {
  DOW_NAMES_EN,
  DOW_NAMES_ZH,
  MONTH_NAMES_EN,
  MONTH_NAMES_ZH,
  getFieldSpec,
  getSyntaxSpec,
} from './syntax';
import type {
  CronLocale,
  CronSyntax,
  DescribeResult,
  FieldDescription,
  FieldKey,
  FieldRule,
} from './types';

interface LocalePack {
  everyText: Record<FieldKey, string>;
  anyText: Record<FieldKey, string>;
  listSep: string;
  and: string;
  or: string;
  everyDay: string;
  runSuffix: string;
  unitText(key: FieldKey): string;
  valueText(value: number, key: FieldKey): string;
  intervalText(step: number, from: number | null, key: FieldKey): string;
  rangeText(from: number, to: number, key: FieldKey): string;
  lastDayText(offset: number): string;
  lastWeekdayOfMonthText: string;
  nearestWeekdayText(day: number): string;
  lastOfWeekText(dow: number): string;
  nthWeekdayText(dow: number, nth: number): string;
  weekPrefix: string;
}

const ZH: LocalePack = {
  everyText: {
    second: '每秒',
    minute: '每分钟',
    hour: '每小时',
    day: '每天',
    month: '每月',
    week: '每周',
    year: '每年',
  },
  anyText: {
    second: '不指定',
    minute: '不指定',
    hour: '不指定',
    day: '不指定',
    month: '不指定',
    week: '不指定',
    year: '不指定',
  },
  listSep: '、',
  and: '和',
  or: '或',
  everyDay: '每天',
  runSuffix: '执行',
  unitText(key) {
    return (
      {
        second: '秒',
        minute: '分钟',
        hour: '小时',
        day: '天',
        month: '个月',
        week: '天',
        year: '年',
      } as Record<FieldKey, string>
    )[key];
  },
  valueText(value, key) {
    switch (key) {
      case 'second':
        return `第 ${value} 秒`;
      case 'minute':
        return `第 ${value} 分`;
      case 'hour':
        return `${value} 时`;
      case 'day':
        return `${value} 日`;
      case 'month':
        return MONTH_NAMES_ZH[value] ?? `${value} 月`;
      case 'week':
        return DOW_NAMES_ZH[value] ?? `${value}`;
      case 'year':
        return `${value} 年`;
      default:
        return String(value);
    }
  },
  intervalText(step, from, key) {
    if (from === null) return `每 ${step} ${this.unitText(key)}`;
    return `从${this.valueText(from, key)}开始，每 ${step} ${this.unitText(key)}`;
  },
  rangeText(from, to, key) {
    if (key === 'week' || key === 'month') {
      return `${this.valueText(from, key)}至${this.valueText(to, key)}`;
    }
    return `${this.valueText(from, key)}到${this.valueText(to, key)}`;
  },
  lastDayText(offset) {
    return offset > 0 ? `每月最后一天往前推 ${offset} 天` : '每月最后一天';
  },
  lastWeekdayOfMonthText: '每月最后一个工作日',
  nearestWeekdayText(day) {
    return `每月最接近 ${day} 日的工作日`;
  },
  lastOfWeekText(dow) {
    return `每月最后一个${DOW_NAMES_ZH[dow]}`;
  },
  nthWeekdayText(dow, nth) {
    const ordinal = ['', '第一个', '第二个', '第三个', '第四个', '第五个'][nth] ?? `第 ${nth} 个`;
    return `每月${ordinal}${DOW_NAMES_ZH[dow]}`;
  },
  weekPrefix: '每',
};

const EN: LocalePack = {
  everyText: {
    second: 'every second',
    minute: 'every minute',
    hour: 'every hour',
    day: 'every day',
    month: 'every month',
    week: 'every week',
    year: 'every year',
  },
  anyText: {
    second: 'unspecified',
    minute: 'unspecified',
    hour: 'unspecified',
    day: 'unspecified',
    month: 'unspecified',
    week: 'unspecified',
    year: 'unspecified',
  },
  listSep: ', ',
  and: 'and',
  or: 'or',
  everyDay: 'Every day',
  runSuffix: '',
  unitText(key) {
    return (
      {
        second: 'second',
        minute: 'minute',
        hour: 'hour',
        day: 'day',
        month: 'month',
        week: 'day of week',
        year: 'year',
      } as Record<FieldKey, string>
    )[key];
  },
  valueText(value, key) {
    switch (key) {
      case 'second':
        return `second ${value}`;
      case 'minute':
        return `minute ${value}`;
      case 'hour':
        return `hour ${value}`;
      case 'day':
        return `day ${value}`;
      case 'month':
        return MONTH_NAMES_EN[value] ?? `month ${value}`;
      case 'week':
        return DOW_NAMES_EN[value] ?? `${value}`;
      case 'year':
        return `year ${value}`;
      default:
        return String(value);
    }
  },
  intervalText(step, from, key) {
    const unit = this.unitText(key);
    const plural = step === 1 ? unit : `${unit}s`;
    if (from === null) return `every ${step} ${plural}`;
    return `starting at ${this.valueText(from, key)}, every ${step} ${plural}`;
  },
  rangeText(from, to, key) {
    return `${this.valueText(from, key)} to ${this.valueText(to, key)}`;
  },
  lastDayText(offset) {
    return offset > 0 ? `last day of month minus ${offset} days` : 'last day of month';
  },
  lastWeekdayOfMonthText: 'last weekday of month',
  nearestWeekdayText(day) {
    return `weekday nearest to day ${day}`;
  },
  lastOfWeekText(dow) {
    return `last ${DOW_NAMES_EN[dow]} of month`;
  },
  nthWeekdayText(dow, nth) {
    const ordinal = ['', 'first', 'second', 'third', 'fourth', 'fifth'][nth] ?? `#${nth}`;
    return `the ${ordinal} ${DOW_NAMES_EN[dow]} of month`;
  },
  weekPrefix: '',
};

function getPack(locale: CronLocale): LocalePack {
  return locale === 'en-US' ? EN : ZH;
}

/** 判断字段是否是「单一简单值」（无区间、步长、枚举、特殊规则） */
function isSimpleSingle(rule: FieldRule): boolean {
  if (rule.specials.length > 0) return false;
  if (rule.values.length !== 1) return false;
  const raw = rule.raw;
  return !raw.includes('/') && !raw.includes('-') && !raw.includes(',');
}

/** 生成单个字段的自然语言说明 */
export function describeRule(
  rule: FieldRule,
  syntax: CronSyntax = 'quartz',
  locale: CronLocale = 'zh-CN',
): string {
  const pack = getPack(locale);
  const key = rule.key;

  if (rule.every) return pack.everyText[key];
  if (rule.any) return pack.anyText[key];

  // 特殊规则（L / W / #）
  if (rule.specials.length > 0 && rule.values.length === 0) {
    const texts = rule.specials.map((special) => {
      switch (special.kind) {
        case 'lastDay':
          return pack.lastDayText(special.offset);
        case 'lastWeekdayOfMonth':
          return pack.lastWeekdayOfMonthText;
        case 'nearestWeekday':
          return pack.nearestWeekdayText(special.day);
        case 'lastOfWeek':
          return pack.lastOfWeekText(special.dow);
        case 'nthWeekday':
          return pack.nthWeekdayText(special.dow, special.nth);
        default:
          return rule.raw;
      }
    });
    return texts.join(pack.listSep);
  }

  const raw = rule.raw;

  // 步长
  if (raw.includes('/')) {
    const [base, stepText] = raw.split('/');
    const step = Number.parseInt(stepText, 10);
    if (Number.isFinite(step) && step > 0) {
      const spec = getFieldSpec(key, syntax);
      const startsAtMin =
        base === '*' ||
        rule.values.length === 0 ||
        (key !== 'week' && rule.values[0] === spec.min) ||
        (key === 'week' && rule.values[0] === 0);
      const fromValue = startsAtMin ? null : rule.values[0];
      return pack.intervalText(step, fromValue, key);
    }
  }

  // 区间
  if (raw.includes('-') && rule.values.length > 1) {
    const sorted = [...rule.values].sort((a, b) => a - b);
    return pack.rangeText(sorted[0], sorted[sorted.length - 1], key);
  }

  // 枚举
  if (rule.values.length > 0) {
    return rule.values.map((value) => pack.valueText(value, key)).join(pack.listSep);
  }

  const spec = getFieldSpec(key, syntax);
  return `${spec.label}：${rule.raw}`;
}

/** 组成「日期部分」的描述 */
function buildDateText(
  rules: Record<string, FieldRule | undefined>,
  syntax: CronSyntax,
  locale: CronLocale,
  pack: LocalePack,
): string {
  const dayRule = rules.day;
  const weekRule = rules.week;
  const monthRule = rules.month;

  const dayRestricted = dayRule && !dayRule.every && !dayRule.any;
  const weekRestricted = weekRule && !weekRule.every && !weekRule.any;
  const monthRestricted = monthRule && !monthRule.every && !monthRule.any;
  const yearRule = rules.year;
  const yearRestricted = yearRule && !yearRule.every && !yearRule.any;

  const parts: string[] = [];

  if (weekRestricted && weekRule) {
    const weekText = describeRule(weekRule, syntax, locale);
    if (isSimpleSingle(weekRule)) {
      parts.push(
        locale === 'en-US' ? `every ${weekText}` : `每${DOW_NAMES_ZH[weekRule.values[0]] ?? weekText}`,
      );
    } else if (weekRule.specials.length > 0) {
      parts.push(weekText);
    } else {
      parts.push(`${pack.weekPrefix}${weekText}`);
    }
  }

  if (dayRestricted && dayRule) {
    const dayText = describeRule(dayRule, syntax, locale);
    const isSpecial = dayRule.specials.length > 0;
    if (monthRestricted && monthRule) {
      const monthText = describeRule(monthRule, syntax, locale);
      const bare = dayText.replace(/^每月/, '');
      const separator = /^\d/.test(bare) ? ' ' : locale === 'en-US' ? ' ' : '的';
      parts.push(`${monthText}${separator}${bare}`);
    } else if (isSpecial) {
      parts.push(dayText);
    } else {
      parts.push(locale === 'en-US' ? `every month on ${dayText}` : `每月 ${dayText}`);
    }
  } else if (monthRestricted && monthRule && !weekRestricted) {
    const monthText = describeRule(monthRule, syntax, locale);
    parts.push(locale === 'en-US' ? `every ${monthText}` : `每年 ${monthText}`);
  }

  if (yearRestricted && yearRule) {
    parts.push(describeRule(yearRule, syntax, locale));
  }

  if (parts.length === 0) return pack.everyDay;
  return parts.join(` ${pack.or} `);
}

/** 组成「时间部分」的描述 */
function buildTimeText(
  rules: Record<string, FieldRule | undefined>,
  syntax: CronSyntax,
  locale: CronLocale,
  pack: LocalePack,
): string {
  const secondRule = rules.second;
  const minuteRule = rules.minute;
  const hourRule = rules.hour;

  // 该语法本身没有「秒」字段（如 Linux crontab），语义下移一级
  const hasSecondField = secondRule !== undefined;
  const pad = (value: number) => String(value).padStart(2, '0');
  const joinSep = locale === 'en-US' ? ', ' : '、';

  const isFree = (rule?: FieldRule) => !rule || rule.every || rule.any;
  const clockValue = (rule?: FieldRule) =>
    rule && isSimpleSingle(rule) ? rule.values[0] : null;
  const isZero = (rule?: FieldRule) => clockValue(rule) === 0;

  const hourFree = isFree(hourRule);
  const minuteFree = isFree(minuteRule);
  const secondFree = isFree(secondRule);

  const hourValue = clockValue(hourRule);
  const minuteValue = clockValue(minuteRule);
  const secondValue = hasSecondField ? clockValue(secondRule) : 0;

  // 秒固定为 0 时，等价于「分钟级」调度
  const secondIsZero = !hasSecondField || isZero(secondRule);

  // A. 秒 / 分 / 时全部任意
  if (hourFree && minuteFree && secondFree) {
    return hasSecondField ? pack.everyText.second : pack.everyText.minute;
  }
  if (hourFree && minuteFree && secondIsZero) {
    return pack.everyText.minute;
  }

  // B. 时、分、秒都是单一值 —— 直接给时刻
  if (hourValue !== null && minuteValue !== null && secondValue !== null) {
    return hasSecondField
      ? `${pad(hourValue)}:${pad(minuteValue)}:${pad(secondValue)}`
      : `${pad(hourValue)}:${pad(minuteValue)}`;
  }

  // C. 分、秒固定为 0，只有「时」在变化 —— 列出具体时刻
  if (
    minuteValue !== null &&
    secondIsZero &&
    hourRule &&
    !hourFree &&
    hourRule.specials.length === 0 &&
    hourRule.values.length > 1 &&
    hourRule.values.length <= 6
  ) {
    return hourRule.values
      .map((value) => `${pad(value)}:${pad(minuteValue)}`)
      .join(joinSep);
  }

  // D. 每小时的第 0 分（等价于每小时）
  if (hourFree && minuteValue === 0 && secondIsZero) {
    return pack.everyText.hour;
  }

  // D. 小时任意，分钟（或秒）被限定
  if (hourFree && !minuteFree) {
    const minuteText = describeRule(minuteRule as FieldRule, syntax, locale);
    if (secondIsZero || !hasSecondField) return minuteText;
    return `${minuteText}${locale === 'en-US' ? ' ' : ''}${describeRule(
      secondRule as FieldRule,
      syntax,
      locale,
    )}`;
  }

  // E. 兜底：逐字段拼接，省略「第 0 分」「第 0 秒」这类无信息量的片段
  const pieces: string[] = [];
  if (hourRule) pieces.push(describeRule(hourRule, syntax, locale));
  if (minuteRule && !(minuteValue === 0 && secondIsZero)) {
    pieces.push(describeRule(minuteRule, syntax, locale));
  }
  if (hasSecondField && secondRule && !isZero(secondRule)) {
    pieces.push(describeRule(secondRule, syntax, locale));
  }
  return pieces.join(locale === 'en-US' ? ' ' : '');
}

/**
 * 生成表达式的自然语言描述与逐字段说明。
 *
 * @param expression Cron 表达式
 * @param syntax     语法类型，默认 `quartz`
 * @param locale     语言，默认 `zh-CN`
 */
export function describeExpression(
  expression: string,
  syntax: CronSyntax = 'quartz',
  locale: CronLocale = 'zh-CN',
): DescribeResult {
  const pack = getPack(locale);
  const parsed = parseExpression(expression, syntax);
  const spec = getSyntaxSpec(syntax);

  const segments: FieldDescription[] = spec.fields.map((key) => {
    const rule = parsed.rules[key];
    const fieldSpec = getFieldSpec(key, syntax);
    const label = locale === 'en-US' ? fieldSpec.labelEn : fieldSpec.label;
    return {
      key,
      label,
      raw: rule?.raw ?? '*',
      text: rule ? describeRule(rule, syntax, locale) : '',
    };
  });

  if (!parsed.valid) {
    return {
      expression,
      syntax,
      valid: false,
      issues: parsed.issues,
      summary: '',
      segments,
    };
  }

  const rules = parsed.rules as Record<string, FieldRule | undefined>;
  const dateText = buildDateText(rules, syntax, locale, pack);
  const timeText = buildTimeText(rules, syntax, locale, pack);
  const isClock = timeText.includes(':');

  let summary: string;
  if (locale === 'en-US') {
    summary =
      dateText === pack.everyDay
        ? `${timeText} ${pack.everyDay.toLowerCase()}`
        : `${dateText} at ${timeText}`;
  } else if (dateText === pack.everyDay) {
    summary = isClock
      ? `每天 ${timeText} ${pack.runSuffix}`
      : `${timeText}${pack.runSuffix}`;
  } else {
    summary = isClock
      ? `${dateText} ${timeText} ${pack.runSuffix}`
      : `${dateText} ${timeText}${pack.runSuffix}`;
  }

  return {
    expression,
    syntax,
    valid: true,
    issues: parsed.issues,
    summary,
    segments,
  };
}
