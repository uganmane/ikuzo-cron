/**
 * cron-kit-core 公共类型定义
 */

/** 支持的 Cron 语法类型 */
export type CronSyntax = 'quartz' | 'spring' | 'linux' | 'node';

/** Cron 字段键名 */
export type FieldKey = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'week' | 'year';

/** 界面语言 */
export type CronLocale = 'zh-CN' | 'en-US';

/**
 * 可视化编辑器使用的字段配置模式。
 *
 * 每个模式对应一类 Cron 写法：
 * - `every`          `*`            任意值
 * - `any`            `?`            不指定（仅 Quartz / Spring 的日、周字段）
 * - `specific`       `1,5,9`        指定多个值
 * - `range`          `3-8`          区间
 * - `interval`       `0/5`、`*​/5`   按步长
 * - `last`           `L`、`L-2`     最后一天 / 倒数第 n 天（日字段）
 * - `lastWeekday`    `LW`           当月最后一个工作日（日字段）
 * - `nearestWeekday` `15W`          最接近指定日期的工作日（日字段）
 * - `lastOfWeek`     `5L`           当月最后一个星期几（周字段）
 * - `nthWeekday`     `MON#2`        当月第 n 个星期几（周字段）
 * - `raw`            原文直写         无法归类时兜底
 */
export type FieldMode =
  | 'every'
  | 'any'
  | 'specific'
  | 'range'
  | 'interval'
  | 'last'
  | 'lastWeekday'
  | 'nearestWeekday'
  | 'lastOfWeek'
  | 'nthWeekday'
  | 'raw';

/** 单个字段的可视化配置值 */
export interface FieldValue {
  mode: FieldMode;
  /** `interval` 的起点、`range` 的起点、`specific` 的单值、`nearestWeekday` 的日期 */
  from?: number;
  /** `range` 的终点 */
  to?: number;
  /** `interval` 的步长 */
  step?: number;
  /** `specific` 的值列表 */
  list?: number[];
  /** `last` 的倒推天数：`L-2` → 2 */
  offset?: number;
  /** `nthWeekday` 的序号：`MON#2` → 2 */
  nth?: number;
  /** `mode` 为 `raw` 时直接写入的文本 */
  raw?: string;
}

/** 一份完整的可视化配置 */
export interface CronConfig {
  syntax: CronSyntax;
  fields: Partial<Record<FieldKey, FieldValue>>;
}

/** 字段类型（值域 + 语义标记），由语法决定 */
export type FieldKind = 'number' | 'dayOfMonth' | 'dayOfWeek' | 'month' | 'year';

/** 单个字段的语法规格 */
export interface FieldSpec {
  key: FieldKey;
  /** 中文标签，如「秒」 */
  label: string;
  /** 英文标签，如 "Second" */
  labelEn: string;
  /** 语义类型 */
  kind: FieldKind;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 是否允许 `?` */
  allowAny: boolean;
  /** 是否允许 `L` */
  allowLast: boolean;
  /** 是否允许 `W` */
  allowWeekday: boolean;
  /** 是否允许 `#` */
  allowNth: boolean;
  /** 是否可选（Quartz 的「年」可以不写） */
  optional: boolean;
  /** 值域提示，如 `0-59` */
  range: string;
}

/** 一种 Cron 语法的完整规格 */
export interface SyntaxSpec {
  id: CronSyntax;
  /** 中文名 */
  label: string;
  /** 英文名 */
  labelEn: string;
  /** 一句话说明 */
  description: string;
  /** 字段顺序 */
  fields: FieldKey[];
  /** 字段数量 */
  fieldCount: number;
  /** 默认表达式 */
  defaultExpression: string;
  /** 示例表达式 */
  example: string;
}

/** 解析后的特殊规则（L / W / # 等无法展开成普通数值的写法） */
export type SpecialRule =
  | { kind: 'lastDay'; offset: number }
  | { kind: 'lastWeekdayOfMonth' }
  | { kind: 'nearestWeekday'; day: number }
  | { kind: 'lastOfWeek'; dow: number }
  | { kind: 'nthWeekday'; dow: number; nth: number };

/** 单个字段的解析结果（内部规则） */
export interface FieldRule {
  key: FieldKey;
  /** 原始文本 */
  raw: string;
  /** 是否为 `*` */
  every: boolean;
  /** 是否为 `?` */
  any: boolean;
  /** 展开后的具体值集合（周字段已归一化为 0=周日 … 6=周六） */
  values: number[];
  /** 特殊规则 */
  specials: SpecialRule[];
  /** 是否被限定（既不是 `*` 也不是 `?`） */
  restricted: boolean;
}

/** 解析错误 / 警告 */
export interface CronIssue {
  /** 字段键名，整体错误时为 undefined */
  field?: FieldKey;
  /** 错误码 */
  code:
    | 'field-count'
    | 'empty-field'
    | 'invalid-char'
    | 'out-of-range'
    | 'invalid-step'
    | 'invalid-range'
    | 'invalid-value'
    | 'unknown-alias'
    | 'unsupported-char'
    | 'day-week-conflict'
    | 'invalid-timezone';
  /** 面向用户的中文提示 */
  message: string;
}

/** `parseExpression` 返回值 */
export interface ParseResult {
  /** 输入原文 */
  expression: string;
  syntax: CronSyntax;
  valid: boolean;
  issues: CronIssue[];
  /** 解析成功时的字段规则 */
  rules: Partial<Record<FieldKey, FieldRule>>;
  /** 规范化后的表达式（字段补全、大小写统一） */
  normalized: string;
}

/** `describeExpression` 中的单字段说明 */
export interface FieldDescription {
  key: FieldKey;
  label: string;
  raw: string;
  text: string;
}

/** `describeExpression` 返回值 */
export interface DescribeResult {
  expression: string;
  syntax: CronSyntax;
  valid: boolean;
  issues: CronIssue[];
  /** 整句中文描述，如「每周一至周五 09:00:00 执行」 */
  summary: string;
  /** 逐字段说明 */
  segments: FieldDescription[];
}

/** 下一次运行时间的选项 */
export interface NextRunOptions {
  /** 表达式语法，默认 quartz */
  syntax?: CronSyntax;
  /** 计算条数，默认 5 */
  count?: number;
  /** 起始时间，默认当前时间 */
  from?: Date | number | string;
  /** IANA 时区，如 `Asia/Shanghai`；不传则使用系统本地时区 */
  timeZone?: string;
}

/** 一条最近运行时间记录 */
export interface NextRunItem {
  /** 该次执行对应的 UTC 瞬时 */
  date: Date;
  /** 在目标时区下的时间戳（毫秒） */
  timestamp: number;
  /** 目标时区下的 `YYYY-MM-DD HH:mm:ss` */
  text: string;
  /** 目标时区下的星期，如 `周二` */
  weekday: string;
  /** 目标时区下的 UTC 偏移文本，如 `UTC+08:00` */
  offset: string;
}

/** 特殊字符词典条目 */
export interface SpecialCharDoc {
  char: string;
  name: string;
  description: string;
  example: string;
  /** 支持该字符的语法 */
  syntaxes: CronSyntax[];
}
