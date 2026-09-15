import { useEffect, useState } from 'react';
import { describeExpression, getSyntaxSpec, parseExpression } from 'cron-kit-core';

import { useCronKitStyles } from '../internal/useCronKitStyles';
import { useCronState } from '../internal/useCronState';
import type { CronInputProps } from '../types';
import { CronModal } from './CronModal';
import { CronPanel } from './CronPanel';

/**
 * 表单友好的 Cron 输入框：直接手写表达式，或点按钮在弹窗里可视化配置。
 *
 * 改动通过 `onChange(expression)` 回传，因此可以直接放进表单：
 *
 * ```tsx
 * <Form.Item name="cron" label="执行时间">
 *   <CronInput />
 * </Form.Item>
 * ```
 */
export function CronInput({
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
  nextRunsCount = 5,
  onChange,
  onValidChange,
  disabled,
  className,
  style,
  modalTitle,
  modalWidth = 920,
  zIndex = 1000,
  applyMode = 'confirm',
  placeholder,
  buttonText,
  hideButton = false,
  showSummary = true,
  okText,
  cancelText,
}: CronInputProps) {
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

  const [draftText, setDraftText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(state.expression);

  useEffect(() => {
    setDraftText(null);
  }, [state.expression]);

  const text = draftText ?? state.expression;
  const parsed = parseExpression(text, state.syntax);
  const summary = parsed.valid ? describeExpression(text, state.syntax, locale).summary : '';

  const t = (zh: string, en: string) => (locale === 'en-US' ? en : zh);

  const openModal = () => {
    setDraft(state.expression);
    setOpen(true);
  };

  const confirm = () => {
    state.setExpression(draft);
    setOpen(false);
  };

  return (
    <div
      className={`ck-root${className ? ` ${className}` : ''}`}
      style={style}
      data-ck-theme={theme}
    >
      <div className="ck-trigger">
        <input
          type="text"
          className={`ck-trigger__input${parsed.valid ? '' : ' is-invalid'}`}
          value={text}
          disabled={disabled}
          spellCheck={false}
          aria-label={t('Cron 表达式', 'Cron expression')}
          aria-invalid={!parsed.valid}
          placeholder={placeholder ?? `例如 ${getSyntaxSpec(state.syntax).example}`}
          onChange={(event) => {
            const next = event.target.value;
            setDraftText(next);
            state.setExpression(next);
          }}
          onBlur={() => setDraftText(null)}
        />

        {hideButton ? null : (
          <button
            type="button"
            className="ck-btn"
            disabled={disabled}
            onClick={openModal}
          >
            {buttonText ?? t('配置', 'Configure')}
          </button>
        )}
      </div>

      {showSummary ? (
        parsed.valid ? (
          <div className="ck-trigger__summary">
            <span aria-hidden="true">↳</span>
            <span>{summary}</span>
          </div>
        ) : (
          <div className="ck-trigger__summary ck-trigger__summary--error">
            <span aria-hidden="true">✕</span>
            <span>{parsed.issues[0]?.message ?? t('表达式不合法', 'Invalid expression')}</span>
          </div>
        )
      ) : null}

      <CronModal
        open={open}
        width={modalWidth}
        zIndex={zIndex}
        theme={theme}
        locale={locale}
        title={modalTitle}
        okText={okText}
        cancelText={cancelText}
        onOk={confirm}
        onCancel={() => setOpen(false)}
      >
        <CronPanel
          value={draft}
          syntax={state.syntax}
          timeZone={state.timeZone}
          locale={locale}
          theme={theme}
          disabled={disabled}
          nextRunsCount={nextRunsCount}
          title={null}
          flat
          showNextRuns
          onSyntaxChange={(next) => state.setSyntax(next)}
          onTimeZoneChange={(next) => state.setTimeZone(next)}
          onChange={(next) => {
            setDraft(next);
            if (applyMode === 'live') state.setExpression(next);
          }}
        />
      </CronModal>
    </div>
  );
}
