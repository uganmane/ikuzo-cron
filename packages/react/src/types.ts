import type { CSSProperties, ReactNode } from 'react';
import type { CronIssue, CronLocale, CronSyntax, FieldKey, NextRunItem } from 'cron-kit-core';

/** 主题模式 */
export type CronTheme = 'light' | 'dark' | 'auto';

/** 面板内的标签页 */
export type CronPanelTab = 'builder' | 'expression' | 'templates' | 'explain';

/** 变化回调携带的完整信息 */
export interface CronChangeInfo {
  /** 当前表达式 */
  expression: string;
  /** 是否合法 */
  valid: boolean;
  /** 错误列表 */
  issues: CronIssue[];
  /** 自然语言描述 */
  summary: string;
  /** 最近运行时间 */
  nextRuns: NextRunItem[];
  /** 当前语法 */
  syntax: CronSyntax;
  /** 当前时区 */
  timeZone?: string;
}

/** 所有组件共用的基础属性 */
export interface CronBaseProps {
  /** 表达式语法，传入即为受控 */
  syntax?: CronSyntax;
  /** 非受控时的初始语法，默认 quartz */
  defaultSyntax?: CronSyntax;
  /** 语法变化回调 */
  onSyntaxChange?: (syntax: CronSyntax) => void;
  /** IANA 时区，传入即为受控 */
  timeZone?: string;
  /** 非受控时的初始时区，默认跟随系统 */
  defaultTimeZone?: string;
  /** 时区变化回调 */
  onTimeZoneChange?: (timeZone: string) => void;
  /** 语言，默认 zh-CN */
  locale?: CronLocale;
  /** 主题，默认 light */
  theme?: CronTheme;
  /** 计算并展示的运行时间条数，默认 5 */
  nextRunsCount?: number;
  /** 是否禁用交互 */
  disabled?: boolean;
  /** 自定义类名，会挂到根节点 */
  className?: string;
  /** 自定义样式 */
  style?: CSSProperties;
}

/** 表单友好的受控 / 非受控表达式属性 */
export interface CronValueProps {
  /** 表达式，传入即为受控 */
  value?: string;
  /** 非受控时的初始表达式 */
  defaultValue?: string;
  /**
   * 表达式变化回调。
   * 第一个参数是表达式字符串，因此可直接对接 antd 的 `Form.Item` 与 rc-field-form。
   */
  onChange?: (expression: string, info: CronChangeInfo) => void;
  /** 合法性变化回调 */
  onValidChange?: (valid: boolean) => void;
}

/** 面板属性 */
export interface CronPanelProps extends CronBaseProps, CronValueProps {
  /** 当前标签页，传入即为受控 */
  activeTab?: CronPanelTab;
  /** 非受控时的初始标签页，默认 builder */
  defaultActiveTab?: CronPanelTab;
  /** 标签页变化回调 */
  onTabChange?: (tab: CronPanelTab) => void;
  /** 需要展示的标签页 */
  tabs?: CronPanelTab[];
  /** 是否展示右侧的最近运行时间，默认 true */
  showNextRuns?: boolean;
  /** 是否展示顶部标题栏，默认 true */
  showHeader?: boolean;
  /** 标题内容 */
  title?: ReactNode;
  /** 是否展示语法切换，默认 true */
  showSyntaxSwitch?: boolean;
  /** 语法切换里可选展示的语法，默认四种全给；用于把用户限定在真实运行环境 */
  syntaxes?: CronSyntax[];
  /** 是否展示时区选择，默认 true */
  showTimeZone?: boolean;
  /** 是否在表达式下方常驻展示自然语言摘要，默认 true */
  showSummary?: boolean;
  /** 去掉外框与内边距，便于嵌进弹窗，默认 false */
  flat?: boolean;
  /** 底部自定义内容 */
  footer?: ReactNode;
}

/** 表达式输入框属性 */
export interface CronExpressionProps extends CronBaseProps, CronValueProps {
  /** 输入框占位文本 */
  placeholder?: string;
  /** 合法时是否展示成功提示，默认 false */
  showSuccessTip?: boolean;
  /** 是否展示描述摘要，默认 true */
  showSummary?: boolean;
  /** 是否受控为只读（仅由外部修改） */
  readOnly?: boolean;
  /** 输入框尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/** 最近运行时间组件属性 */
export interface CronNextRunsProps extends CronBaseProps {
  /** 表达式 */
  value?: string;
  defaultValue?: string;
  /** 标题，传 null 隐藏 */
  title?: ReactNode;
  /** 展示条数 */
  count?: number;
}

/** 字段说明组件属性 */
export interface CronExplainProps extends CronBaseProps {
  /** 表达式 */
  value?: string;
  defaultValue?: string;
  /** 是否展示特殊字符词典，默认 true */
  showLegend?: boolean;
}

/** 模板组件属性 */
export interface CronTemplatesProps extends CronBaseProps {
  /** 表达式 */
  value?: string;
  defaultValue?: string;
  /** 选中模板回调，参数为该语法下的表达式 */
  onSelect?: (expression: string) => void;
}

/** 可视化编辑器属性 */
export interface CronBuilderProps extends CronBaseProps, CronValueProps {
  /** 字段编辑区显示方式：标签页或全部平铺，默认 tabs */
  layout?: 'tabs' | 'stack';
  /** 当前正在编辑的字段，传入即为受控 */
  activeField?: FieldKey;
  /** 非受控时的初始字段，默认为该语法的第一个字段 */
  defaultActiveField?: FieldKey;
  /** 当前字段变化回调，可用于在表达式栏高亮对应片段 */
  onActiveFieldChange?: (field: FieldKey) => void;
}

/** 弹窗属性 */
export interface CronModalProps {
  /** 是否打开 */
  open: boolean;
  /** 标题，默认「Cron 表达式配置」 */
  title?: ReactNode;
  /** 宽度，默认 920 */
  width?: number | string;
  /** 层级，默认 1000 */
  zIndex?: number;
  /** 点击遮罩是否关闭，默认 true */
  maskClosable?: boolean;
  /** 是否展示右上角关闭按钮，默认 true */
  closable?: boolean;
  /** 确认按钮文案 */
  okText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 是否展示页脚，默认 true */
  showFooter?: boolean;
  /** 确认回调 */
  onOk?: () => void;
  /** 取消 / 关闭回调 */
  onCancel?: () => void;
  /** 自定义页脚 */
  footer?: ReactNode;
  /** 语言 */
  locale?: CronLocale;
  /** 主题 */
  theme?: CronTheme;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: CSSProperties;
  /** 弹窗内容 */
  children?: ReactNode;
  /** 打开时是否锁定 body 滚动，默认 true */
  lockScroll?: boolean;
}

/** 表单触发器属性 */
export interface CronInputProps extends CronBaseProps, CronValueProps {
  /** 弹窗标题 */
  modalTitle?: ReactNode;
  /** 弹窗宽度 */
  modalWidth?: number | string;
  /** 弹窗层级 */
  zIndex?: number;
  /**
   * 应用方式：
   * - `confirm`（默认）在弹窗内确认后才回调 onChange
   * - `live` 弹窗内每次改动都实时回调 onChange
   */
  applyMode?: 'confirm' | 'live';
  /** 输入框占位文本 */
  placeholder?: string;
  /** 打开弹窗按钮文案，默认「配置」 */
  buttonText?: string;
  /** 是否隐藏打开弹窗的按钮，仅保留手写表达式，默认 false */
  hideButton?: boolean;
  /** 是否在输入框下方展示描述摘要，默认 true */
  showSummary?: boolean;
  /** 确认按钮文案 */
  okText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 是否禁用 */
  disabled?: boolean;
}
