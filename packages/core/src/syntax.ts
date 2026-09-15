import type {
  CronSyntax,
  FieldKey,
  FieldSpec,
  SpecialCharDoc,
  SyntaxSpec,
} from './types';

/** 月份别名 → 月份数值（1-12），四种语法通用 */
export const MONTH_ALIASES: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

/** 月份中文名（索引 1-12） */
export const MONTH_NAMES_ZH = [
  '',
  '1 月',
  '2 月',
  '3 月',
  '4 月',
  '5 月',
  '6 月',
  '7 月',
  '8 月',
  '9 月',
  '10 月',
  '11 月',
  '12 月',
];

/** 月份英文名（索引 1-12） */
export const MONTH_NAMES_EN = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * 星期别名 → 归一化星期值（0=周日 … 6=周六）。
 * Quartz 使用 1=周日 … 7=周六，其余语法使用 0=周日 … 6=周六。
 */
export const DOW_ALIASES: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

/** 归一化星期 → 别名 */
export const DOW_TO_ALIAS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** 归一化星期中文名（索引 0-6） */
export const DOW_NAMES_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 归一化星期英文名（索引 0-6） */
export const DOW_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * 把源语法中的星期数值归一化为 0=周日 … 6=周六。
 *
 * - Quartz：1=周日 … 7=周六
 * - Spring / Linux / Node：0=周日 … 7=周日，1=周一 … 6=周六
 */
export function normalizeDow(value: number, syntax: CronSyntax): number {
  if (syntax === 'quartz') {
    if (value < 1 || value > 7) return -1;
    return value - 1;
  }
  if (value < 0 || value > 7) return -1;
  return value % 7;
}

/** 把归一化星期（0-6）还原为该语法下的最小可用数值 */
export function denormalizeDow(normalized: number, syntax: CronSyntax): number {
  if (syntax === 'quartz') return normalized + 1;
  return normalized;
}

/** 解析月份/星期别名，返回数值；不是别名返回 null */
export function resolveAlias(
  token: string,
  key: FieldKey,
): number | null {
  const upper = token.toUpperCase();
  if (key === 'month' && upper in MONTH_ALIASES) return MONTH_ALIASES[upper];
  if (key === 'week' && upper in DOW_ALIASES) return DOW_ALIASES[upper];
  return null;
}

/** 各语法允许出现的特殊字符 */
export const ALLOWED_CHARS: Record<CronSyntax, string[]> = {
  quartz: ['*', '?', ',', '-', '/', 'L', 'W', '#'],
  spring: ['*', '?', ',', '-', '/', 'L', '#'],
  linux: ['*', ',', '-', '/'],
  node: ['*', '?', ',', '-', '/'],
};

/**
 * 各语法下的字段规格表。
 * 键为语法，值为该语法字段顺序的规格数组。
 */
export const SYNTAX_FIELD_SPECS: Record<CronSyntax, FieldSpec[]> = {
  quartz: [
    {
      key: 'second',
      label: '秒',
      labelEn: 'Second',
      kind: 'number',
      min: 0,
      max: 59,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-59',
    },
    {
      key: 'minute',
      label: '分',
      labelEn: 'Minute',
      kind: 'number',
      min: 0,
      max: 59,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-59',
    },
    {
      key: 'hour',
      label: '时',
      labelEn: 'Hour',
      kind: 'number',
      min: 0,
      max: 23,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-23',
    },
    {
      key: 'day',
      label: '日',
      labelEn: 'Day of month',
      kind: 'dayOfMonth',
      min: 1,
      max: 31,
      allowAny: true,
      allowLast: true,
      allowWeekday: true,
      allowNth: false,
      optional: false,
      range: '1-31',
    },
    {
      key: 'month',
      label: '月',
      labelEn: 'Month',
      kind: 'month',
      min: 1,
      max: 12,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '1-12',
    },
    {
      key: 'week',
      label: '周',
      labelEn: 'Day of week',
      kind: 'dayOfWeek',
      min: 1,
      max: 7,
      allowAny: true,
      allowLast: true,
      allowWeekday: false,
      allowNth: true,
      optional: false,
      range: '1-7 / SUN-SAT',
    },
    {
      key: 'year',
      label: '年',
      labelEn: 'Year',
      kind: 'year',
      min: 1970,
      max: 2199,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: true,
      range: '1970-2199',
    },
  ],
  spring: [
    {
      key: 'second',
      label: '秒',
      labelEn: 'Second',
      kind: 'number',
      min: 0,
      max: 59,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-59',
    },
    {
      key: 'minute',
      label: '分',
      labelEn: 'Minute',
      kind: 'number',
      min: 0,
      max: 59,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-59',
    },
    {
      key: 'hour',
      label: '时',
      labelEn: 'Hour',
      kind: 'number',
      min: 0,
      max: 23,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-23',
    },
    {
      key: 'day',
      label: '日',
      labelEn: 'Day of month',
      kind: 'dayOfMonth',
      min: 1,
      max: 31,
      allowAny: true,
      allowLast: true,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '1-31',
    },
    {
      key: 'month',
      label: '月',
      labelEn: 'Month',
      kind: 'month',
      min: 1,
      max: 12,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '1-12',
    },
    {
      key: 'week',
      label: '周',
      labelEn: 'Day of week',
      kind: 'dayOfWeek',
      min: 0,
      max: 7,
      allowAny: true,
      allowLast: true,
      allowWeekday: false,
      allowNth: true,
      optional: false,
      range: '0-7 / SUN-SAT',
    },
  ],
  linux: [
    {
      key: 'minute',
      label: '分',
      labelEn: 'Minute',
      kind: 'number',
      min: 0,
      max: 59,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-59',
    },
    {
      key: 'hour',
      label: '时',
      labelEn: 'Hour',
      kind: 'number',
      min: 0,
      max: 23,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-23',
    },
    {
      key: 'day',
      label: '日',
      labelEn: 'Day of month',
      kind: 'dayOfMonth',
      min: 1,
      max: 31,
      allowAny: false,
      allowLast: true,
      allowWeekday: true,
      allowNth: false,
      optional: false,
      range: '1-31',
    },
    {
      key: 'month',
      label: '月',
      labelEn: 'Month',
      kind: 'month',
      min: 1,
      max: 12,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '1-12',
    },
    {
      key: 'week',
      label: '周',
      labelEn: 'Day of week',
      kind: 'dayOfWeek',
      min: 0,
      max: 7,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-7 / SUN-SAT',
    },
  ],
  node: [
    {
      key: 'second',
      label: '秒',
      labelEn: 'Second',
      kind: 'number',
      min: 0,
      max: 59,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: true,
      range: '0-59',
    },
    {
      key: 'minute',
      label: '分',
      labelEn: 'Minute',
      kind: 'number',
      min: 0,
      max: 59,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-59',
    },
    {
      key: 'hour',
      label: '时',
      labelEn: 'Hour',
      kind: 'number',
      min: 0,
      max: 23,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-23',
    },
    {
      key: 'day',
      label: '日',
      labelEn: 'Day of month',
      kind: 'dayOfMonth',
      min: 1,
      max: 31,
      allowAny: true,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '1-31',
    },
    {
      key: 'month',
      label: '月',
      labelEn: 'Month',
      kind: 'month',
      min: 1,
      max: 12,
      allowAny: false,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '1-12',
    },
    {
      key: 'week',
      label: '周',
      labelEn: 'Day of week',
      kind: 'dayOfWeek',
      min: 0,
      max: 7,
      allowAny: true,
      allowLast: false,
      allowWeekday: false,
      allowNth: false,
      optional: false,
      range: '0-7 / SUN-SAT',
    },
  ],
};

/** 四种语法的总览规格 */
export const SYNTAX_SPECS: Record<CronSyntax, SyntaxSpec> = {
  quartz: {
    id: 'quartz',
    label: 'Quartz',
    labelEn: 'Quartz',
    description: '7 个字段（秒 分 时 日 月 周 年），支持 ? L W # 等语义，年为可选项。',
    fields: ['second', 'minute', 'hour', 'day', 'month', 'week', 'year'],
    fieldCount: 7,
    defaultExpression: '0 * * * * ? *',
    example: '0 0 9 ? * MON-FRI *',
  },
  spring: {
    id: 'spring',
    label: 'Spring',
    labelEn: 'Spring',
    description: '6 个字段（秒 分 时 日 月 周），以秒开头，支持 ? L #。',
    fields: ['second', 'minute', 'hour', 'day', 'month', 'week'],
    fieldCount: 6,
    defaultExpression: '0 * * * * *',
    example: '0 0 9 ? * MON-FRI',
  },
  linux: {
    id: 'linux',
    label: 'Linux',
    labelEn: 'Linux crontab',
    description: '经典 5 个字段（分 时 日 月 周），不支持秒，不支持 ?。',
    fields: ['minute', 'hour', 'day', 'month', 'week'],
    fieldCount: 5,
    defaultExpression: '* * * * *',
    example: '0 9 * * 1-5',
  },
  node: {
    id: 'node',
    label: 'Node',
    labelEn: 'Node cron',
    description: '6 个字段（秒 分 时 日 月 周），秒可省略，兼容 ? 占位。',
    fields: ['second', 'minute', 'hour', 'day', 'month', 'week'],
    fieldCount: 6,
    defaultExpression: '0 * * * * *',
    example: '0 0 9 * * 1-5',
  },
};

/** 全部语法 id */
export const CRON_SYNTAXES: CronSyntax[] = ['quartz', 'spring', 'linux', 'node'];

/** 取语法规格，非法值回退到 quartz */
export function getSyntaxSpec(syntax: CronSyntax): SyntaxSpec {
  return SYNTAX_SPECS[syntax] ?? SYNTAX_SPECS.quartz;
}

/** 取某语法下的字段规格表 */
export function getFieldSpecs(syntax: CronSyntax): FieldSpec[] {
  return SYNTAX_FIELD_SPECS[syntax] ?? SYNTAX_FIELD_SPECS.quartz;
}

/** 取某语法下指定字段的规格 */
export function getFieldSpec(key: FieldKey, syntax: CronSyntax): FieldSpec {
  const specs = getFieldSpecs(syntax);
  const found = specs.find((spec) => spec.key === key);
  if (found) return found;
  // 该语法下不存在此字段时，回退到 quartz 的规格以便界面仍可渲染
  return (
    SYNTAX_FIELD_SPECS.quartz.find((spec) => spec.key === key) ??
    SYNTAX_FIELD_SPECS.quartz[0]
  );
}

/** 特殊字符词典，供界面渲染「看懂一条 Cron 表达式」区块 */
export const SPECIAL_CHARS: SpecialCharDoc[] = [
  {
    char: '*',
    name: '任意值',
    description: '表示该字段的每一个取值，也就是「每」。',
    example: '在「时」字段写 * 即每小时',
    syntaxes: ['quartz', 'spring', 'linux', 'node'],
  },
  {
    char: '?',
    name: '不指定',
    description: '表示该字段不参与限制，只能用在「日」或「周」字段，用来避免两者冲突。',
    example: '0 0 9 ? * MON-FRI',
    syntaxes: ['quartz', 'spring', 'node'],
  },
  {
    char: ',',
    name: '枚举',
    description: '列出多个离散取值，满足任意一个即触发。',
    example: '在「月」字段写 1,4,7,10 即每季度首月',
    syntaxes: ['quartz', 'spring', 'linux', 'node'],
  },
  {
    char: '-',
    name: '区间',
    description: '表示一段连续的取值范围，闭区间。',
    example: '在「周」字段写 MON-FRI 即周一到周五',
    syntaxes: ['quartz', 'spring', 'linux', 'node'],
  },
  {
    char: '/',
    name: '步长',
    description: '按固定间隔执行。写在 * 后表示从最小值起算，写在数字后表示从该值起算。',
    example: '在「分」字段写 0/5 即每 5 分钟',
    syntaxes: ['quartz', 'spring', 'linux', 'node'],
  },
  {
    char: 'L',
    name: '最后',
    description: 'Last 的缩写。「日」字段表示当月最后一天；「周」字段表示当月最后一个星期几。',
    example: '日字段写 L 即每月最后一天，周字段写 FRI L 即每月最后一个周五',
    syntaxes: ['quartz', 'spring'],
  },
  {
    char: 'W',
    name: '最近工作日',
    description: 'Weekday 的缩写，表示离指定日期最近的工作日（周一到周五）。',
    example: '日字段写 15W 即每月最接近 15 号的工作日',
    syntaxes: ['quartz'],
  },
  {
    char: '#',
    name: '第几个星期几',
    description: '井号前写星期几，井号后写当月第几个，序号取 1-5。',
    example: '周字段写 MON#2 即每月第二个周一',
    syntaxes: ['quartz', 'spring'],
  },
];

/** 常用时区列表 */
export const COMMON_TIME_ZONES: Array<{ value: string; label: string }> = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+08:00)' },
  { value: 'Asia/Hong_Kong', label: '中国香港时间 (UTC+08:00)' },
  { value: 'Asia/Taipei', label: '中国台北时间 (UTC+08:00)' },
  { value: 'Asia/Tokyo', label: '东京时间 (UTC+09:00)' },
  { value: 'Asia/Singapore', label: '新加坡时间 (UTC+08:00)' },
  { value: 'Asia/Kolkata', label: '印度时间 (UTC+05:30)' },
  { value: 'Asia/Dubai', label: '迪拜时间 (UTC+04:00)' },
  { value: 'Europe/London', label: '伦敦时间 (UTC+00:00/+01:00)' },
  { value: 'Europe/Paris', label: '巴黎时间 (UTC+01:00/+02:00)' },
  { value: 'Europe/Moscow', label: '莫斯科时间 (UTC+03:00)' },
  { value: 'America/New_York', label: '纽约时间 (UTC-05:00/-04:00)' },
  { value: 'America/Chicago', label: '芝加哥时间 (UTC-06:00/-05:00)' },
  { value: 'America/Los_Angeles', label: '洛杉矶时间 (UTC-08:00/-07:00)' },
  { value: 'America/Sao_Paulo', label: '圣保罗时间 (UTC-03:00)' },
  { value: 'Australia/Sydney', label: '悉尼时间 (UTC+10:00/+11:00)' },
  { value: 'UTC', label: '协调世界时 (UTC+00:00)' },
];
