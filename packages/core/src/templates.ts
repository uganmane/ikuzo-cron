import { buildExpression } from './build';
import { describeExpression } from './describe';
import { parseExpression } from './parse';
import type { CronSyntax, FieldKey, FieldValue } from './types';

/** 模板的语义定义（与语法无关，输出时按目标语法裁剪字段） */
export interface TemplateDefinition {
  id: string;
  /** 中文标签 */
  label: string;
  /** 英文标签 */
  labelEn: string;
  /** 字段配置 */
  fields: Partial<Record<FieldKey, FieldValue>>;
  /** 仅在这些语法下提供 */
  syntaxes?: CronSyntax[];
}

/** 最终产出的模板 */
export interface CronTemplate {
  id: string;
  label: string;
  labelEn: string;
  expression: string;
  description: string;
}

const WEEKDAYS: FieldValue = { mode: 'range', from: 1, to: 5, list: [1, 2, 3, 4, 5] };
const MONDAY: FieldValue = { mode: 'specific', from: 1, list: [1] };
const SUNDAY: FieldValue = { mode: 'specific', from: 0, list: [0] };
const FIRST_DAY: FieldValue = { mode: 'specific', from: 1, list: [1] };

/** 内置常用定时模板 */
export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: 'every-second',
    label: '每秒',
    labelEn: 'Every second',
    // Linux crontab 没有「秒」字段，最小粒度为分钟
    syntaxes: ['quartz', 'spring', 'node'],
    fields: {
      second: { mode: 'every' },
      minute: { mode: 'every' },
      hour: { mode: 'every' },
    },
  },
  {
    id: 'every-minute',
    label: '每分钟',
    labelEn: 'Every minute',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'every' },
      hour: { mode: 'every' },
    },
  },
  {
    id: 'every-5-minutes',
    label: '每 5 分钟',
    labelEn: 'Every 5 minutes',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'interval', from: 0, step: 5 },
      hour: { mode: 'every' },
    },
  },
  {
    id: 'every-10-minutes',
    label: '每 10 分钟',
    labelEn: 'Every 10 minutes',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'interval', from: 0, step: 10 },
      hour: { mode: 'every' },
    },
  },
  {
    id: 'every-30-minutes',
    label: '每 30 分钟',
    labelEn: 'Every 30 minutes',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'interval', from: 0, step: 30 },
      hour: { mode: 'every' },
    },
  },
  {
    id: 'every-hour',
    label: '每小时',
    labelEn: 'Every hour',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'every' },
    },
  },
  {
    id: 'every-2-hours',
    label: '每 2 小时',
    labelEn: 'Every 2 hours',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'interval', from: 0, step: 2 },
    },
  },
  {
    id: 'daily-midnight',
    label: '每天零点',
    labelEn: 'Daily at midnight',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
    },
  },
  {
    id: 'daily-9am',
    label: '每天 9 点',
    labelEn: 'Daily at 9:00',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 9, list: [9] },
    },
  },
  {
    id: 'daily-6pm',
    label: '每天 18 点',
    labelEn: 'Daily at 18:00',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 18, list: [18] },
    },
  },
  {
    id: 'weekdays-9am',
    label: '工作日 9 点',
    labelEn: 'Weekdays at 9:00',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 9, list: [9] },
      week: WEEKDAYS,
    },
  },
  {
    id: 'weekly-monday',
    label: '每周一零点',
    labelEn: 'Weekly on Monday',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
      week: MONDAY,
    },
  },
  {
    id: 'weekly-sunday',
    label: '每周日零点',
    labelEn: 'Weekly on Sunday',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
      week: SUNDAY,
    },
  },
  {
    id: 'monthly-first',
    label: '每月 1 日零点',
    labelEn: 'Monthly on day 1',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
      day: FIRST_DAY,
    },
  },
  {
    id: 'monthly-last-day',
    label: '每月最后一天',
    labelEn: 'Last day of month',
    // L 语法只有 Quartz / Spring 支持，传统 Linux crontab 不认
    syntaxes: ['quartz', 'spring'],
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
      day: { mode: 'last' },
    },
  },
  {
    id: 'monthly-last-weekday',
    label: '每月最后一个工作日',
    labelEn: 'Last weekday of month',
    // W 语法只有 Quartz 支持
    syntaxes: ['quartz'],
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
      day: { mode: 'lastWeekday' },
    },
  },
  {
    id: 'quarterly-first',
    label: '每季度第一天',
    labelEn: 'First day of each quarter',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
      day: FIRST_DAY,
      month: { mode: 'specific', list: [1, 4, 7, 10] },
    },
  },
  {
    id: 'yearly-first',
    label: '每年 1 月 1 日',
    labelEn: 'Yearly on Jan 1',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 0, list: [0] },
      hour: { mode: 'specific', from: 0, list: [0] },
      day: FIRST_DAY,
      month: { mode: 'specific', from: 1, list: [1] },
    },
  },
  {
    id: 'yearly-last-day',
    label: '每年最后一天 23:59',
    labelEn: 'Yearly last day 23:59',
    fields: {
      second: { mode: 'specific', from: 0, list: [0] },
      minute: { mode: 'specific', from: 59, list: [59] },
      hour: { mode: 'specific', from: 23, list: [23] },
      day: { mode: 'specific', from: 31, list: [31] },
      month: { mode: 'specific', from: 12, list: [12] },
    },
  },
];

/** 取指定语法下的模板列表（含表达式与描述） */
export function getTemplates(syntax: CronSyntax = 'quartz'): CronTemplate[] {
  return TEMPLATE_DEFINITIONS.filter(
    (definition) => !definition.syntaxes || definition.syntaxes.includes(syntax),
  ).map((definition) => {
    const expression = buildExpression({ syntax, fields: definition.fields });
    const parsed = parseExpression(expression, syntax);
    return {
      id: definition.id,
      label: definition.label,
      labelEn: definition.labelEn,
      expression,
      description: parsed.valid ? describeExpression(expression, syntax).summary : '',
    };
  });
}

/** 全部语法下的模板映射 */
export function getAllTemplates(): Record<CronSyntax, CronTemplate[]> {
  return {
    quartz: getTemplates('quartz'),
    spring: getTemplates('spring'),
    linux: getTemplates('linux'),
    node: getTemplates('node'),
  };
}
