/**
 * cron-kit-react
 *
 * React 版 Cron 表达式可视化组件。零运行时依赖，样式自动注入。
 *
 * ```tsx
 * import { CronInput } from 'cron-kit-react';
 *
 * <Form.Item name="cron" label="执行时间">
 *   <CronInput />
 * </Form.Item>
 * ```
 */

export { CronInput } from './components/CronInput';
export { CronModal } from './components/CronModal';
export { CronPanel } from './components/CronPanel';
export { CronBuilder } from './components/CronBuilder';
export { CronExpression } from './components/CronExpression';
export { CronNextRuns } from './components/CronNextRuns';
export { CronExplain } from './components/CronExplain';
export { CronTemplates } from './components/CronTemplates';

export type {
  CronBaseProps,
  CronValueProps,
  CronChangeInfo,
  CronTheme,
  CronPanelTab,
  CronPanelProps,
  CronBuilderProps,
  CronExpressionProps,
  CronNextRunsProps,
  CronExplainProps,
  CronTemplatesProps,
  CronModalProps,
  CronInputProps,
} from './types';

export type {
  CronSyntax,
  CronLocale,
  CronIssue,
  NextRunItem,
  ParseResult,
  DescribeResult,
} from 'cron-kit-core';

export { ensureCronKitStyles, removeCronKitStyles, CRON_KIT_CSS } from 'cron-kit-core/styles';
