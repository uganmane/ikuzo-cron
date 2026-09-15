import type { CronIssue, CronLocale, CronSyntax, NextRunItem } from 'cron-kit-core';

/** 主题模式 */
export type CronTheme = 'light' | 'dark' | 'auto';

/** 面板内的标签页 */
export type CronPanelTab = 'builder' | 'expression' | 'templates' | 'explain';

/** 变化事件携带的完整信息 */
export interface CronChangeInfo {
  expression: string;
  valid: boolean;
  issues: CronIssue[];
  summary: string;
  nextRuns: NextRunItem[];
  syntax: CronSyntax;
  timeZone?: string;
}

/** 表达式值属性（支持 v-model 与 value 两种写法） */
export interface CronValueProps {
  /** 表达式，配合 v-model 使用 */
  modelValue?: string;
  /** 表达式，modelValue 的别名 */
  value?: string;
  /** 非受控时的初始表达式 */
  defaultValue?: string;
}

/** 所有组件共用的基础属性 */
export interface CronBaseProps {
  /** 表达式语法 */
  syntax?: CronSyntax;
  /** 非受控时的初始语法，默认 quartz */
  defaultSyntax?: CronSyntax;
  /** IANA 时区 */
  timeZone?: string;
  /** 非受控时的初始时区，默认跟随系统 */
  defaultTimeZone?: string;
  /** 语言，默认 zh-CN */
  locale?: CronLocale;
  /** 主题，默认 light */
  theme?: CronTheme;
  /** 计算并展示的运行时间条数，默认 5 */
  nextRunsCount?: number;
  /** 是否禁用交互 */
  disabled?: boolean;
}
