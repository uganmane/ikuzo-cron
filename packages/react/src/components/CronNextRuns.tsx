import { useCronKitStyles } from '../internal/useCronKitStyles';
import { useCronState } from '../internal/useCronState';
import type { CronNextRunsProps } from '../types';

/** 接下来若干次运行时间 */
export function CronNextRuns({
  value,
  defaultValue,
  syntax: syntaxProp,
  defaultSyntax,
  timeZone,
  defaultTimeZone,
  locale = 'zh-CN',
  theme = 'light',
  count = 5,
  className,
  style,
  title,
}: CronNextRunsProps) {
  useCronKitStyles();

  const state = useCronState({
    value,
    defaultValue,
    syntax: syntaxProp,
    defaultSyntax,
    timeZone,
    defaultTimeZone,
    locale,
    nextRunsCount: count,
  });

  const heading = title === undefined ? (locale === 'en-US' ? 'Next runs' : '最近运行时间') : title;

  return (
    <div
      className={`ck-root ck-runs${className ? ` ${className}` : ''}`}
      style={style}
      data-ck-theme={theme}
    >
      {heading ? (
        <div className="ck-runs__head">
          <span className="ck-runs__title">{heading}</span>
          <span className="ck-runs__tz">{state.nextRuns[0]?.offset ?? state.timeZone}</span>
        </div>
      ) : null}

      {state.nextRuns.length === 0 ? (
        <div className="ck-runs__empty">
          {state.parsed.valid ? '该表达式在未来没有可执行的时刻' : '表达式不合法'}
        </div>
      ) : (
        <ol className="ck-runs__list">
          {state.nextRuns.map((item, index) => (
            <li className="ck-runs__item" key={`${item.timestamp}-${index}`}>
              <span className="ck-runs__index">{index + 1}</span>
              <span className="ck-runs__time">{item.text}</span>
              <span className="ck-runs__weekday">{item.weekday}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
