import { SPECIAL_CHARS } from 'cron-kit-core';

import { useCronKitStyles } from '../internal/useCronKitStyles';
import { useCronState } from '../internal/useCronState';
import type { CronExplainProps } from '../types';

/** 字段说明：整句描述 + 逐字段拆解 + 特殊字符词典 */
export function CronExplain({
  value,
  defaultValue,
  syntax: syntaxProp,
  defaultSyntax,
  timeZone,
  defaultTimeZone,
  onSyntaxChange,
  locale = 'zh-CN',
  theme = 'light',
  className,
  style,
  showLegend = true,
}: CronExplainProps) {
  useCronKitStyles();

  const state = useCronState({
    value,
    defaultValue,
    syntax: syntaxProp,
    defaultSyntax,
    timeZone,
    defaultTimeZone,
    onSyntaxChange,
    locale,
  });

  const legend = SPECIAL_CHARS.filter((item) => item.syntaxes.includes(state.syntax));
  const invalid = state.parsed.issues[0]?.message;

  return (
    <div
      className={`ck-root ck-col${className ? ` ${className}` : ''}`}
      style={style}
      data-ck-theme={theme}
    >
      {state.parsed.valid ? (
        <div className="ck-summary">
          <span className="ck-summary__icon" aria-hidden="true">
            ↳
          </span>
          <span>{state.described.summary}</span>
        </div>
      ) : (
        <div className="ck-alert ck-alert--error" role="alert">
          <span aria-hidden="true">✕</span>
          <span>{invalid ?? '表达式不合法'}</span>
        </div>
      )}

      <div className="ck-explain">
        {state.described.segments.map((segment) => (
          <div className="ck-explain__card" key={segment.key}>
            <span className="ck-explain__label">{segment.label}</span>
            <span className="ck-explain__raw">{segment.raw}</span>
            <span className="ck-explain__text">{segment.text}</span>
          </div>
        ))}
      </div>

      {showLegend && legend.length > 0 ? (
        <div className="ck-section">
          <h4 className="ck-section__title">
            {locale === 'en-US' ? 'Special characters' : '特殊字符含义'}
          </h4>
          <div className="ck-legend">
            {legend.map((item) => (
              <div className="ck-legend__card" key={item.char}>
                <div className="ck-legend__head">
                  <span className="ck-legend__char">{item.char}</span>
                  <span className="ck-legend__name">{item.name}</span>
                </div>
                <p className="ck-legend__desc">{item.description}</p>
                <p className="ck-legend__example">例：{item.example}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
