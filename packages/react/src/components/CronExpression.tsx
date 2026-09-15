import { useEffect, useState } from 'react';
import { getFieldLabel, getSyntaxSpec } from 'cron-kit-core';

import { useCronKitStyles } from '../internal/useCronKitStyles';
import { useCronState } from '../internal/useCronState';
import type { CronExpressionProps } from '../types';

/**
 * 表达式输入框：手写表达式 + 实时校验 + 自然语言摘要。
 *
 * 输入框的第一个参数通过 `onChange` 回传，可直接接入表单。
 */
export function CronExpression({
  value,
  defaultValue,
  syntax: syntaxProp,
  defaultSyntax,
  onSyntaxChange,
  timeZone,
  defaultTimeZone,
  onTimeZoneChange,
  locale = 'zh-CN',
  theme = 'light',
  nextRunsCount,
  onChange,
  onValidChange,
  disabled,
  className,
  style,
  placeholder,
  showSuccessTip = false,
  showSummary = true,
  readOnly,
  size = 'md',
}: CronExpressionProps) {
  useCronKitStyles();

  const state = useCronState({
    value,
    defaultValue,
    syntax: syntaxProp,
    defaultSyntax,
    onSyntaxChange,
    timeZone,
    defaultTimeZone,
    onTimeZoneChange,
    locale,
    nextRunsCount,
    onChange,
    onValidChange,
  });

  // 输入框草稿，避免用户输入中间态被上层回传覆盖
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    setDraft(null);
  }, [state.expression]);

  const text = draft ?? state.expression;
  const preview = state.parsed;
  const fieldHint = getSyntaxSpec(state.syntax)
    .fields.map((key) => getFieldLabel(key, locale))
    .join(' ');

  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <div
      className={`ck-root${className ? ` ${className}` : ''}`}
      style={style}
      data-ck-theme={theme}
    >
      <div className="ck-expr__field">
        <input
          type="text"
          className={`ck-expr__input${preview.valid ? '' : ' is-invalid'}`}
          style={{ fontSize }}
          value={text}
          disabled={disabled}
          readOnly={readOnly}
          spellCheck={false}
          aria-label="Cron 表达式"
          aria-invalid={!preview.valid}
          placeholder={placeholder ?? `例如 ${getSyntaxSpec(state.syntax).example}`}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            state.setExpression(next);
          }}
          onBlur={() => setDraft(null)}
        />

        {!preview.valid ? (
          <div className="ck-alert ck-alert--error" role="alert">
            <span aria-hidden="true">✕</span>
            <span>{preview.issues[0]?.message ?? '表达式不合法'}</span>
          </div>
        ) : showSuccessTip ? (
          <div className="ck-alert ck-alert--success" role="status">
            <span aria-hidden="true">✓</span>
            <span>表达式合法</span>
          </div>
        ) : null}

        {showSummary && preview.valid && state.described.summary ? (
          <div className="ck-summary">
            <span className="ck-summary__icon" aria-hidden="true">
              ↳
            </span>
            <span>{state.described.summary}</span>
          </div>
        ) : null}

        <p className="ck-hint">
          共 {getSyntaxSpec(state.syntax).fieldCount} 个字段：{fieldHint}
        </p>
      </div>
    </div>
  );
}
