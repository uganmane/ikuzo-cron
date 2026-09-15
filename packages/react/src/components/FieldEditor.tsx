import { useEffect, useState } from 'react';
import {
  createFieldValue,
  getFieldSpec,
  getModeOptions,
  getValueOptions,
  previewField,
  type CronLocale,
  type CronSyntax,
  type FieldKey,
  type FieldMode,
  type FieldValue,
  type ValueOption,
} from 'cron-kit-core';

interface NumberInputProps {
  value?: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number | undefined) => void;
}

/** 带草稿状态的数字输入框，允许中途清空 */
function NumberInput({ value, min, max, disabled, onChange }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined ? '' : String(value));

  useEffect(() => {
    setDraft(null);
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      className="ck-input ck-input--num"
      value={shown}
      disabled={disabled}
      aria-label={`取值 ${min}-${max}`}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (!/^\d*$/.test(next)) return;
        if (next === '') {
          onChange(undefined);
          return;
        }
        const num = Number(next);
        if (Number.isFinite(num)) onChange(num);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

interface OptionSelectProps {
  value?: number;
  options: ValueOption[];
  locale: CronLocale;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function OptionSelect({ value, options, locale, disabled, onChange }: OptionSelectProps) {
  return (
    <select
      className="ck-select"
      value={value === undefined ? '' : String(value)}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {locale === 'en-US' ? option.labelEn : option.label}
        </option>
      ))}
    </select>
  );
}

export interface FieldEditorProps {
  fieldKey: FieldKey;
  syntax: CronSyntax;
  value: FieldValue | undefined;
  locale: CronLocale;
  disabled?: boolean;
  onChange: (value: FieldValue) => void;
}

/** 单个字段的可视化编辑器 */
export function FieldEditor({
  fieldKey,
  syntax,
  value,
  locale,
  disabled,
  onChange,
}: FieldEditorProps) {
  const spec = getFieldSpec(fieldKey, syntax);
  const mode: FieldMode = value?.mode ?? 'every';
  const modeOptions = getModeOptions(fieldKey, syntax);
  const valueOptions = getValueOptions(fieldKey, syntax, locale);
  // 月 / 周用带名称的栅格，其余数值字段用紧凑数字栅格
  const isGridField = fieldKey === 'month' || fieldKey === 'week';

  const selectedList = value?.list ?? [];
  const selectedLabels = valueOptions
    .filter((option) => selectedList.includes(option.value))
    .map((option) => (locale === 'en-US' ? option.labelEn : option.label));
  const selectedText =
    selectedLabels.length > 12
      ? `${selectedLabels.slice(0, 12).join('、')} 等 ${selectedLabels.length} 个`
      : selectedLabels.join('、');

  const emit = (patch: Partial<FieldValue>) => {
    onChange({ ...(value ?? { mode }), ...patch, mode } as FieldValue);
  };

  const switchMode = (nextMode: FieldMode) => {
    onChange(createFieldValue(nextMode, fieldKey, syntax));
  };

  const toggleGridValue = (item: number) => {
    const current = value?.list ?? [];
    // 至少保留一个值，否则该字段会变成空表达式
    if (current.includes(item) && current.length === 1) return;
    const next = current.includes(item)
      ? current.filter((entry) => entry !== item)
      : [...current, item];
    onChange({ mode: 'specific', list: next, from: [...next].sort((a, b) => a - b)[0] });
  };

  return (
    <div className="ck-field">
      <div className="ck-field__head">
        <span className="ck-field__name">
          {locale === 'en-US' ? spec.labelEn : spec.label}
        </span>
        <span className="ck-field__range">{spec.range}</span>
        <span className="ck-field__raw" style={{ marginLeft: 'auto' }}>
          {previewField(fieldKey, value, syntax)}
        </span>
      </div>

      <div className="ck-chips" role="radiogroup" aria-label={`${spec.label} 配置方式`}>
        {modeOptions.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={mode === option.mode}
            className={`ck-chip${mode === option.mode ? ' is-active' : ''}`}
            disabled={disabled}
            onClick={() => switchMode(option.mode)}
          >
            {locale === 'en-US' ? option.labelEn : option.label}
          </button>
        ))}
      </div>

      {mode === 'specific' && (
        <>
          <div
            className={`ck-grid ${
              fieldKey === 'month'
                ? 'ck-grid--12'
                : fieldKey === 'week'
                  ? 'ck-grid--7'
                  : 'ck-grid--num'
            }${valueOptions.length > 31 ? ' ck-grid--scroll' : ''}`}
          >
            {valueOptions.map((option) => {
              const active = selectedList.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={`ck-check${active ? ' is-active' : ''}`}
                  disabled={disabled}
                  onClick={() => toggleGridValue(option.value)}
                >
                  {locale === 'en-US' ? option.labelEn : option.label}
                </button>
              );
            })}
          </div>
          <span className="ck-hint">
            {selectedLabels.length ? `已选 ${selectedLabels.length} 个：${selectedText}` : '点击上方数值进行多选'}
          </span>
        </>
      )}

      {mode === 'range' && (
        <div className="ck-inline">
          {isGridField ? (
            <OptionSelect
              options={valueOptions}
              locale={locale}
              disabled={disabled}
              value={value?.from}
              onChange={(next) => emit({ from: next })}
            />
          ) : (
            <NumberInput
              min={spec.min}
              max={spec.max}
              disabled={disabled}
              value={value?.from}
              onChange={(next) => emit({ from: next })}
            />
          )}
          <span className="ck-label">到</span>
          {isGridField ? (
            <OptionSelect
              options={valueOptions}
              locale={locale}
              disabled={disabled}
              value={value?.to}
              onChange={(next) => emit({ to: next })}
            />
          ) : (
            <NumberInput
              min={spec.min}
              max={spec.max}
              disabled={disabled}
              value={value?.to}
              onChange={(next) => emit({ to: next })}
            />
          )}
          <span className="ck-label">周期</span>
          <NumberInput
            min={1}
            max={spec.max}
            disabled={disabled}
            value={value?.step}
            onChange={(next) => emit({ step: next })}
          />
          <span className="ck-hint">周期留空表示连续</span>
        </div>
      )}

      {mode === 'interval' && (
        <div className="ck-inline">
          <span className="ck-label">从</span>
          <NumberInput
            min={spec.min}
            max={spec.max}
            disabled={disabled}
            value={value?.from}
            onChange={(next) => emit({ from: next })}
          />
          <span className="ck-label">开始，每</span>
          <NumberInput
            min={1}
            max={spec.max}
            disabled={disabled}
            value={value?.step}
            onChange={(next) => emit({ step: next })}
          />
          <span className="ck-hint">个{spec.label}执行一次</span>
        </div>
      )}

      {mode === 'last' && (
        <div className="ck-inline">
          <span className="ck-label">倒数第</span>
          <NumberInput
            min={0}
            max={30}
            disabled={disabled}
            value={value?.offset}
            onChange={(next) => emit({ offset: next })}
          />
          <span className="ck-hint">天，填 0 表示当月最后一天</span>
        </div>
      )}

      {mode === 'lastWeekday' && (
        <p className="ck-hint">当月最后一个工作日（周一至周五）执行</p>
      )}

      {mode === 'nearestWeekday' && (
        <div className="ck-inline">
          <span className="ck-label">最接近第</span>
          <NumberInput
            min={1}
            max={31}
            disabled={disabled}
            value={value?.from}
            onChange={(next) => emit({ from: next })}
          />
          <span className="ck-hint">天的工作日执行</span>
        </div>
      )}

      {mode === 'lastOfWeek' && (
        <div className="ck-inline">
          <span className="ck-label">当月最后一个</span>
          <OptionSelect
            options={valueOptions}
            locale={locale}
            disabled={disabled}
            value={value?.from}
            onChange={(next) => emit({ from: next, list: [next] })}
          />
        </div>
      )}

      {mode === 'nthWeekday' && (
        <div className="ck-inline">
          <span className="ck-label">当月第</span>
          <select
            className="ck-select"
            value={String(value?.nth ?? 1)}
            disabled={disabled}
            onChange={(event) => emit({ nth: Number(event.target.value) })}
          >
            {[1, 2, 3, 4, 5].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span className="ck-label">个</span>
          <OptionSelect
            options={valueOptions}
            locale={locale}
            disabled={disabled}
            value={value?.from}
            onChange={(next) => emit({ from: next, list: [next] })}
          />
        </div>
      )}

      {mode === 'raw' && (
        <div className="ck-inline">
          <input
            type="text"
            className="ck-input ck-input--mono ck-input--full"
            placeholder="直接填写该字段的表达式"
            value={value?.raw ?? ''}
            disabled={disabled}
            onChange={(event) => emit({ raw: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}
