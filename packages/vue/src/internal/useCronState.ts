import { computed, ref, watch } from 'vue';
import {
  describeExpression,
  getLocalTimeZone,
  getNextRunTimes,
  getSyntaxSpec,
  parseExpression,
  type CronLocale,
  type CronSyntax,
  type NextRunItem,
} from 'cron-kit-core';
import { ensureCronKitStyles } from 'cron-kit-core/styles';

import type { CronChangeInfo } from '../types';

export interface UseCronStateOptions {
  modelValue?: string;
  value?: string;
  defaultValue?: string;
  syntax?: CronSyntax;
  defaultSyntax?: CronSyntax;
  timeZone?: string;
  defaultTimeZone?: string;
  locale?: CronLocale;
  nextRunsCount?: number;
  /** nextRunsCount 的别名 */
  count?: number;
}

/**
 * 组件 emit 的宽松签名。
 *
 * 各 SFC 的 `defineEmits` 会生成精确的重载类型，这里放宽是为了让同一份
 * composable 能被所有组件复用，同时组件对外暴露的 emit 类型仍然精确。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CronStateEmit = (event: any, ...args: any[]) => void;

let stylesReady = false;

/** 保证共享样式已注入（幂等） */
export function useCronKitStyles(): void {
  if (stylesReady) return;
  stylesReady = true;
  ensureCronKitStyles();
}

function initialExpression(options: UseCronStateOptions, syntax: CronSyntax): string {
  const given = options.modelValue ?? options.value;
  if (given !== undefined) return given;
  if (options.defaultValue !== undefined) return options.defaultValue;
  return getSyntaxSpec(syntax).defaultExpression;
}

/**
 * Vue 版的 Cron 状态管理。
 *
 * 语法与时区采用「内部优先、外部变更则同步」的策略，
 * 表达式则遵循标准的 v-model 受控语义。
 */
export function useCronState(options: UseCronStateOptions, emit?: CronStateEmit) {
  useCronKitStyles();

  const locale = options.locale ?? 'zh-CN';
  const syntax = ref<CronSyntax>(options.syntax ?? options.defaultSyntax ?? 'quartz');
  const timeZone = ref<string>(
    options.timeZone ?? options.defaultTimeZone ?? getLocalTimeZone(),
  );
  const innerExpression = ref<string>(initialExpression(options, syntax.value));

  // 外部改了语法 / 时区就跟随
  watch(
    () => options.syntax,
    (next) => {
      if (next && next !== syntax.value) syntax.value = next;
    },
  );
  watch(
    () => options.timeZone,
    (next) => {
      if (next && next !== timeZone.value) timeZone.value = next;
    },
  );
  watch(
    () => options.modelValue ?? options.value,
    (next) => {
      if (next !== undefined && next !== innerExpression.value) innerExpression.value = next;
    },
  );

  const expression = computed(() => options.modelValue ?? options.value ?? innerExpression.value);

  const resolveCount = () => options.nextRunsCount ?? options.count ?? 5;

  const parsed = computed(() => parseExpression(expression.value, syntax.value));
  const described = computed(() =>
    describeExpression(expression.value, syntax.value, locale),
  );
  const nextRuns = computed<NextRunItem[]>(() => {
    if (!parsed.value.valid) return [];
    try {
      return getNextRunTimes(expression.value, {
        syntax: syntax.value,
        count: resolveCount(),
        timeZone: timeZone.value,
      });
    } catch {
      return [];
    }
  });

  const info = computed<CronChangeInfo>(() => ({
    expression: expression.value,
    valid: parsed.value.valid,
    issues: parsed.value.issues,
    summary: described.value.summary,
    nextRuns: nextRuns.value,
    syntax: syntax.value,
    timeZone: timeZone.value,
  }));

  const buildInfo = (next: string): CronChangeInfo => {
    const snapshot = parseExpression(next, syntax.value);
    return {
      expression: next,
      valid: snapshot.valid,
      issues: snapshot.issues,
      summary: describeExpression(next, syntax.value, locale).summary,
      nextRuns: snapshot.valid
        ? getNextRunTimes(next, {
            syntax: syntax.value,
            count: resolveCount(),
            timeZone: timeZone.value,
          })
        : [],
      syntax: syntax.value,
      timeZone: timeZone.value,
    };
  };

  // 记录自己刚刚派发出去的表达式，避免同一个值回调两次
  let lastEmitted: string | null = null;

  watch(expression, (next) => {
    if (lastEmitted === null) {
      lastEmitted = next;
      return;
    }
    if (lastEmitted === next) return;
    lastEmitted = next;
    emit?.('change', next, info.value);
  });

  let lastValid: boolean | null = null;
  watch(
    () => parsed.value.valid,
    (next) => {
      if (lastValid === next) return;
      lastValid = next;
      emit?.('validChange', next);
    },
  );

  const setExpression = (next: string) => {
    lastEmitted = next;
    innerExpression.value = next;
    emit?.('update:modelValue', next);
    emit?.('change', next, buildInfo(next));
  };

  const setSyntax = (next: CronSyntax) => {
    syntax.value = next;
    emit?.('syntaxChange', next);
    const nextDefault = getSyntaxSpec(next).defaultExpression;
    lastEmitted = nextDefault;
    innerExpression.value = nextDefault;
    emit?.('update:modelValue', nextDefault);
    emit?.('change', nextDefault, buildInfo(nextDefault));
  };

  const setTimeZone = (next: string) => {
    timeZone.value = next;
    emit?.('timeZoneChange', next);
  };

  return {
    locale,
    syntax,
    timeZone,
    expression,
    parsed,
    described,
    nextRuns,
    info,
    setExpression,
    setSyntax,
    setTimeZone,
  };
}
