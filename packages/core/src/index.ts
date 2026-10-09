/**
 * cron-kit-core
 *
 * 零依赖的 Cron 表达式引擎，支持 Quartz / Spring / Linux crontab / Node cron 四种语法。
 *
 * 主要能力：
 * - `parseExpression` 解析与校验，支持 ? L W # 等特殊语法
 * - `buildExpression` 可视化配置 → 表达式
 * - `expressionToConfig` 表达式 → 可视化配置（反解析回填）
 * - `describeExpression` 自然语言描述与逐字段说明
 * - `getNextRunTimes` 时区感知的最近 N 次运行时间
 * - `getTemplates` 常用定时模板
 */

export type {
  CronSyntax,
  FieldKey,
  CronLocale,
  FieldMode,
  FieldValue,
  CronConfig,
  FieldKind,
  FieldSpec,
  SyntaxSpec,
  SpecialRule,
  FieldRule,
  CronIssue,
  ParseResult,
  FieldDescription,
  DescribeResult,
  NextRunOptions,
  NextRunItem,
  SpecialCharDoc,
} from './types';

export {
  MONTH_ALIASES,
  MONTH_NAMES_ZH,
  MONTH_NAMES_EN,
  DOW_ALIASES,
  DOW_TO_ALIAS,
  DOW_NAMES_ZH,
  DOW_NAMES_EN,
  ALLOWED_CHARS,
  SYNTAX_FIELD_SPECS,
  SYNTAX_SPECS,
  CRON_SYNTAXES,
  SPECIAL_CHARS,
  COMMON_TIME_ZONES,
  normalizeDow,
  denormalizeDow,
  resolveAlias,
  getSyntaxSpec,
  getFieldSpecs,
  getFieldSpec,
} from './syntax';

export {
  splitFields,
  parseField,
  parseExpression,
  validateExpression,
  expressionToConfig,
} from './parse';

export {
  buildField,
  normalizeConfig,
  buildExpression,
  ruleToFieldValue,
  formatFieldValue,
} from './build';

export { describeRule, describeExpression } from './describe';

export type { ModeOption, ValueOption, ExpressionToken } from './editor';

export {
  getModeOptions,
  createFieldValue,
  getValueOptions,
  applySelection,
  previewField,
  getExpressionTokens,
  stringifyValueList,
  parseValueListText,
  getFieldLabel,
} from './editor';

export type { WallClock, FormatDateTimeOptions } from './timezone';

export {
  getLocalTimeZone,
  isValidTimeZone,
  getWallClockParts,
  getOffsetMinutes,
  zonedTimeToDate,
  normalizeWallClock,
  getDaysInMonth,
  getWeekdayOf,
  getLastWeekdayOfMonth,
  getNearestWeekday,
  formatOffset,
  formatOffsetText,
  formatDateTime,
  formatWeekday,
  formatIso,
} from './timezone';

export { getNextRunTimes, getNextRunTime, getNextRunDates, willEverRun } from './next';

export type { TemplateDefinition, CronTemplate } from './templates';

export { TEMPLATE_DEFINITIONS, getTemplates, getAllTemplates } from './templates';

/** 版本号 */
export const VERSION = '0.2.0';
