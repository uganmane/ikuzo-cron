import { useEffect, useMemo, useRef } from 'react';
import {
  describeExpression,
  getLocalTimeZone,
  getNextRunTimes,
  getSyntaxSpec,
  parseExpression,
  type CronLocale,
  type CronSyntax,
  type DescribeResult,
  type NextRunItem,
  type ParseResult,
} from 'cron-kit-core';

import type { CronChangeInfo } from '../types';
import { useControllable, useSyncedState } from './useControllable';

export interface UseCronStateOptions {
  value?: string;
  defaultValue?: string;
  syntax?: CronSyntax;
  defaultSyntax?: CronSyntax;
  onSyntaxChange?: (syntax: CronSyntax) => void;
  timeZone?: string;
  defaultTimeZone?: string;
  onTimeZoneChange?: (timeZone: string) => void;
  locale?: CronLocale;
  nextRunsCount?: number;
  onChange?: (expression: string, info: CronChangeInfo) => void;
  onValidChange?: (valid: boolean) => void;
}

export interface CronState {
  expression: string;
  setExpression: (next: string) => void;
  syntax: CronSyntax;
  setSyntax: (next: CronSyntax) => void;
  timeZone: string;
  setTimeZone: (next: string) => void;
  locale: CronLocale;
  parsed: ParseResult;
  described: DescribeResult;
  nextRuns: NextRunItem[];
  info: CronChangeInfo;
}

/** 统一管理表达式、语法、时区，并派生校验结果、描述与运行时间 */
export function useCronState(options: UseCronStateOptions): CronState {
  const locale = options.locale ?? 'zh-CN';

  const [syntax, setSyntaxInner] = useSyncedState<CronSyntax>(
    options.syntax,
    options.defaultSyntax ?? 'quartz',
  );
  const [timeZone, setTimeZoneInner] = useSyncedState<string>(
    options.timeZone,
    options.defaultTimeZone ?? getLocalTimeZone(),
  );
  const expressionState = useControllable<string>(
    options.value,
    options.defaultValue ?? getSyntaxSpec(options.defaultSyntax ?? 'quartz').defaultExpression,
  );

  const expression = expressionState.value;

  const setSyntax = (next: CronSyntax) => {
    setSyntaxInner(next);
    options.onSyntaxChange?.(next);
    // 切换语法时把表达式迁移到新语法的默认值，避免字段数量不匹配
    const nextDefault = getSyntaxSpec(next).defaultExpression;
    expressionState.setValue(nextDefault);
    options.onChange?.(
      nextDefault,
      buildInfo(nextDefault, next, timeZone, locale, options.nextRunsCount),
    );
  };

  const setTimeZone = (next: string) => {
    setTimeZoneInner(next);
    options.onTimeZoneChange?.(next);
  };

  const parsed = useMemo(() => parseExpression(expression, syntax), [expression, syntax]);
  const described = useMemo(
    () => describeExpression(expression, syntax, locale),
    [expression, syntax, locale],
  );
  const nextRuns = useMemo(() => {
    if (!parsed.valid) return [];
    try {
      return getNextRunTimes(expression, {
        syntax,
        count: options.nextRunsCount ?? 5,
        timeZone,
      });
    } catch {
      return [];
    }
  }, [expression, syntax, timeZone, parsed.valid, options.nextRunsCount]);

  const info = useMemo<CronChangeInfo>(
    () => ({
      expression,
      valid: parsed.valid,
      issues: parsed.issues,
      summary: described.summary,
      nextRuns,
      syntax,
      timeZone,
    }),
    [expression, parsed, described, nextRuns, syntax, timeZone],
  );

  // 仅在表达式真正发生变化后回调，跳过首次渲染
  const lastEmitted = useRef<string | null>(null);
  useEffect(() => {
    if (lastEmitted.current === null) {
      lastEmitted.current = expression;
      return;
    }
    if (lastEmitted.current === expression) return;
    lastEmitted.current = expression;
    options.onChange?.(expression, info);
  }, [expression, info]);

  const lastValid = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastValid.current === parsed.valid) return;
    lastValid.current = parsed.valid;
    options.onValidChange?.(parsed.valid);
  }, [parsed.valid]);

  return {
    expression,
    setExpression: (next: string) => {
      expressionState.setValue(next);
    },
    syntax,
    setSyntax,
    timeZone,
    setTimeZone,
    locale,
    parsed,
    described,
    nextRuns,
    info,
  };
}

function buildInfo(
  expression: string,
  syntax: CronSyntax,
  timeZone: string,
  locale: CronLocale,
  count = 5,
): CronChangeInfo {
  const parsed = parseExpression(expression, syntax);
  const described = describeExpression(expression, syntax, locale);
  return {
    expression,
    valid: parsed.valid,
    issues: parsed.issues,
    summary: described.summary,
    nextRuns: parsed.valid ? getNextRunTimes(expression, { syntax, count, timeZone }) : [],
    syntax,
    timeZone,
  };
}
