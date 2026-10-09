/**
 * 面向可视化编辑器的元数据。
 *
 * 把「某个字段有哪些可配置模式、每种模式的默认值、可选值列表」这类信息集中在这里，
 * React 与 Vue 两套组件只需渲染，不需要各写一遍规则。
 */

import { buildField, formatFieldValue } from './build';
import { parseField, splitFields } from './parse';
import {
  DOW_NAMES_EN,
  DOW_NAMES_ZH,
  MONTH_NAMES_EN,
  MONTH_NAMES_ZH,
  getFieldSpec,
  getFieldSpecs,
} from './syntax';
import type { CronLocale, CronSyntax, FieldKey, FieldMode, FieldValue } from './types';

/** 字段单位（中文） */
const UNIT_ZH: Record<FieldKey, string> = {
  second: '秒',
  minute: '分钟',
  hour: '小时',
  day: '天',
  month: '月',
  week: '周',
  year: '年',
};

/** 字段单位（英文） */
const UNIT_EN: Record<FieldKey, string> = {
  second: 'second',
  minute: 'minute',
  hour: 'hour',
  day: 'day',
  month: 'month',
  week: 'week',
  year: 'year',
};

/** 编辑器里可选的配置模式 */
export interface ModeOption {
  mode: FieldMode;
  label: string;
  labelEn: string;
}

/** 可选值条目（用于多选栅格 / 下拉框） */
export interface ValueOption {
  /** 归一化后的数值（周字段为 0=周日 … 6=周六） */
  value: number;
  label: string;
  labelEn: string;
}

/** 表达式拆分后的单个字段 token（用于逐字段高亮展示） */
export interface ExpressionToken {
  key: FieldKey;
  /** 字段短标签，如「秒」 */
  label: string;
  /** 该字段在表达式中的原文 */
  value: string;
}

/** 默认星期几：周五 */
const DEFAULT_DOW = 5;

/** 取某字段在某语法下可用的配置模式 */
export function getModeOptions(key: FieldKey, syntax: CronSyntax = 'quartz'): ModeOption[] {
  const spec = getFieldSpec(key, syntax);
  const options: ModeOption[] = [];

  options.push({
    mode: 'every',
    label: `每${UNIT_ZH[key]}`,
    labelEn: `Every ${UNIT_EN[key]}`,
  });

  if (spec.allowAny) {
    options.push({ mode: 'any', label: '不指定', labelEn: 'Unspecified' });
  }

  options.push({ mode: 'specific', label: '指定', labelEn: 'Specific' });

  options.push({ mode: 'range', label: '范围', labelEn: 'Range' });
  options.push({ mode: 'interval', label: '周期', labelEn: 'Interval' });

  if (spec.allowLast && key === 'day') {
    options.push({ mode: 'last', label: '最后一天', labelEn: 'Last day' });
  }
  if (spec.allowLast && key === 'week') {
    options.push({ mode: 'lastOfWeek', label: '最后一个星期几', labelEn: 'Last weekday' });
  }
  if (spec.allowWeekday && key === 'day') {
    options.push({ mode: 'lastWeekday', label: '最后一个工作日', labelEn: 'Last weekday of month' });
    options.push({ mode: 'nearestWeekday', label: '最近的工作日', labelEn: 'Nearest weekday' });
  }
  if (spec.allowNth && key === 'week') {
    options.push({ mode: 'nthWeekday', label: '第几个星期几', labelEn: 'Nth weekday' });
  }

  return options;
}

/** 进入某个模式时的默认配置 */
export function createFieldValue(
  mode: FieldMode,
  key: FieldKey,
  syntax: CronSyntax = 'quartz',
): FieldValue {
  const spec = getFieldSpec(key, syntax);

  switch (mode) {
    case 'every':
      return { mode: 'every' };
    case 'any':
      return { mode: 'any' };
    case 'specific': {
      let initial: number;
      if (key === 'week') initial = 1;
      else if (key === 'month') initial = 1;
      else if (key === 'day') initial = 1;
      else initial = spec.min;
      return { mode: 'specific', from: initial, list: [initial] };
    }
    case 'range': {
      const from = key === 'week' ? 1 : key === 'hour' ? 9 : spec.min;
      const to = key === 'week' ? DEFAULT_DOW : key === 'hour' ? 18 : spec.min;
      return { mode: 'range', from, to };
    }
    case 'interval': {
      const step =
        key === 'second' ? 10 : key === 'minute' ? 5 : key === 'hour' ? 2 : key === 'day' ? 2 : 1;
      return { mode: 'interval', from: spec.min, step };
    }
    case 'last':
      return { mode: 'last' };
    case 'lastWeekday':
      return { mode: 'lastWeekday' };
    case 'nearestWeekday':
      return { mode: 'nearestWeekday', from: 15 };
    case 'lastOfWeek':
      return { mode: 'lastOfWeek', from: DEFAULT_DOW, list: [DEFAULT_DOW] };
    case 'nthWeekday':
      return { mode: 'nthWeekday', from: 1, nth: 2, list: [1] };
    case 'raw':
      return { mode: 'raw', raw: '' };
    default:
      return { mode: 'every' };
  }
}

/** 取某字段的可选值列表，用于多选栅格与下拉框 */
export function getValueOptions(
  key: FieldKey,
  syntax: CronSyntax = 'quartz',
  locale: CronLocale = 'zh-CN',
): ValueOption[] {
  const spec = getFieldSpec(key, syntax);
  const options: ValueOption[] = [];

  if (key === 'week') {
    for (let value = 0; value <= 6; value += 1) {
      options.push({
        value,
        label: DOW_NAMES_ZH[value],
        labelEn: DOW_NAMES_EN[value],
      });
    }
    return options;
  }

  if (key === 'month') {
    for (let value = 1; value <= 12; value += 1) {
      options.push({
        value,
        label: locale === 'en-US' ? MONTH_NAMES_EN[value] : MONTH_NAMES_ZH[value],
        labelEn: MONTH_NAMES_EN[value],
      });
    }
    return options;
  }

  if (key === 'year') {
    const start = new Date().getFullYear();
    for (let value = start; value <= start + 10; value += 1) {
      options.push({ value, label: String(value), labelEn: String(value) });
    }
    return options;
  }

  for (let value = spec.min; value <= spec.max; value += 1) {
    options.push({ value, label: String(value), labelEn: String(value) });
  }
  return options;
}

/**
 * 把一组值按「涂色」语义并入 / 移出当前选区。
 *
 * 栅格的单击切换与鼠标滑动框选共用这一份逻辑：`paint` 为 `true` 表示把划过的值并入选区，
 * 为 `false` 表示移出。**移空时会退回原选区** —— 该字段一旦为空就会变成非法表达式，
 * 所以「至少保留一个值」这条约束在这里兜底，两端组件不必各写一遍。
 *
 * 返回值始终按升序去重，方便直接交给 `list` / `from`。
 */
export function applySelection(current: number[], values: number[], paint: boolean): number[] {
  const merged = new Set(current);
  for (const value of values) {
    if (paint) merged.add(value);
    else merged.delete(value);
  }
  const next = [...merged].sort((a, b) => a - b);
  return next.length ? next : [...current].sort((a, b) => a - b);
}

/** 把配置渲染为字段文本，供编辑器实时预览 */
export function previewField(
  key: FieldKey,
  value: FieldValue | undefined,
  syntax: CronSyntax = 'quartz',
): string {
  return buildField(key, value, syntax);
}

/**
 * 把表达式拆成与当前语法字段一一对应的 token，用于「逐字段高亮」展示。
 *
 * 字段数量与语法不匹配时返回空数组，调用方应退化为直接展示原文。
 */
export function getExpressionTokens(
  expression: string,
  syntax: CronSyntax = 'quartz',
  locale: CronLocale = 'zh-CN',
): ExpressionToken[] {
  const keys = getFieldSpecs(syntax).map((item) => item.key);
  const tokens = splitFields(expression);
  if (tokens.length !== keys.length) return [];

  return keys.map((key, index) => ({
    key,
    label: getFieldLabel(key, locale),
    value: tokens[index],
  }));
}

/** 把数值列表序列化为输入框文本 */
export function stringifyValueList(
  values: number[],
  key: FieldKey,
  syntax: CronSyntax = 'quartz',
): string {
  return [...values]
    .sort((a, b) => a - b)
    .map((value) => formatFieldValue(value, key, syntax))
    .join(',');
}

/**
 * 解析输入框里的纯枚举文本（只接受 `1,5,9` 这类写法）。
 * 输入了区间或步长等写法时返回 valid=false，由调用方提示。
 */
export function parseValueListText(
  text: string,
  key: FieldKey,
  syntax: CronSyntax = 'quartz',
): { values: number[]; valid: boolean } {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { values: [], valid: false };

  const { rule, issues } = parseField(trimmed, key, syntax);
  const isPlainList =
    !rule.every && !rule.any && rule.specials.length === 0 && !/[/\-]/.test(rule.raw);

  return {
    values: rule.values,
    valid: issues.length === 0 && isPlainList && rule.values.length > 0,
  };
}

/** 供编辑器使用的字段短标签 */
export function getFieldLabel(key: FieldKey, locale: CronLocale = 'zh-CN'): string {
  const spec = getFieldSpec(key, 'quartz');
  return locale === 'en-US' ? spec.labelEn : spec.label;
}
