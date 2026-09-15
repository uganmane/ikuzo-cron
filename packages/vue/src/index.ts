/**
 * cron-kit-vue
 *
 * Vue 3 版 Cron 表达式可视化组件。支持 v-model，样式自动注入。
 *
 * ```vue
 * <CronInput v-model="cron" />
 * ```
 */

export { default as CronInput } from './components/CronInput.vue';
export { default as CronModal } from './components/CronModal.vue';
export { default as CronPanel } from './components/CronPanel.vue';
export { default as CronBuilder } from './components/CronBuilder.vue';
export { default as CronExpression } from './components/CronExpression.vue';
export { default as CronNextRuns } from './components/CronNextRuns.vue';
export { default as CronExplain } from './components/CronExplain.vue';
export { default as CronTemplates } from './components/CronTemplates.vue';

export { useCronState, useCronKitStyles } from './internal/useCronState';

export type { CronTheme, CronPanelTab, CronChangeInfo, CronValueProps, CronBaseProps } from './types';

export type {
  CronSyntax,
  CronLocale,
  CronIssue,
  NextRunItem,
  ParseResult,
  DescribeResult,
} from 'cron-kit-core';

export { ensureCronKitStyles, removeCronKitStyles, CRON_KIT_CSS } from 'cron-kit-core/styles';
