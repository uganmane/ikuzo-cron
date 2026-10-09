import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  applySelection,
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

/** 鼠标滑动框选过程中的临时状态，松手才提交 */
interface DragState {
  /** 起手格子原本未选中 → 本次并入；原本已选中 → 本次移出 */
  paint: boolean;
  /** 拖拽过程中的实时选区，尚未回传给父组件 */
  list: number[];
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

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  // mouseup 之后浏览器还会补发一次 click，记下时间点让那次 click 让位
  const suppressClickAtRef = useRef(0);
  // 全局监听在挂载时注册一次，用 ref 转发提交动作，避免闭包捕获过期的 props
  const commitRef = useRef<(list: number[]) => void>(() => {});
  commitRef.current = (list: number[]) => onChange({ mode: 'specific', list, from: list[0] });

  // 划选期间先渲染本地草稿，松手才提交，免得每划一格都惊动父组件
  const displayList = drag?.list ?? value?.list ?? [];
  const currentList = value?.list ?? [];
  const selectedLabels = valueOptions
    .filter((option) => displayList.includes(option.value))
    .map((option) => (locale === 'en-US' ? option.labelEn : option.label));
  const selectedText =
    selectedLabels.length > 12
      ? `${selectedLabels.slice(0, 12).join('、')} 等 ${selectedLabels.length} 个`
      : selectedLabels.join('、');
  // 顺带把「可以拖拽框选」这件事写在提示里，否则用户不会知道
  const hintText = selectedLabels.length
    ? locale === 'en-US'
      ? `Selected ${selectedLabels.length}: ${selectedText} · hold and drag to select`
      : `已选 ${selectedLabels.length} 个：${selectedText}（按住鼠标滑动可框选）`
    : locale === 'en-US'
      ? 'Click, or hold and drag to select multiple values'
      : '点击选择，或按住鼠标滑动框选';

  useEffect(() => {
    const finish = () => {
      const active = dragRef.current;
      if (!active) return;
      dragRef.current = null;
      setDrag(null);
      suppressClickAtRef.current = Date.now();
      commitRef.current(active.list);
    };
    // pointerup 与 mouseup 都会到；第二次进来时 dragRef 已清空，天然去重
    window.addEventListener('mouseup', finish);
    window.addEventListener('pointerup', finish);
    window.addEventListener('blur', finish);
    return () => {
      window.removeEventListener('mouseup', finish);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('blur', finish);
    };
  }, []);

  const emit = (patch: Partial<FieldValue>) => {
    onChange({ ...(value ?? { mode }), ...patch, mode } as FieldValue);
  };

  const switchMode = (nextMode: FieldMode) => {
    onChange(createFieldValue(nextMode, fieldKey, syntax));
  };

  /** 按下即起手：把起手格子并入草稿，同时锁定本次是「并入」还是「移出」 */
  const beginDrag = (item: number) => {
    const paint = !currentList.includes(item);
    const state: DragState = { paint, list: applySelection(currentList, [item], paint) };
    dragRef.current = state;
    setDrag(state);
  };

  const extendDrag = (item: number) => {
    const active = dragRef.current;
    if (!active) return;
    const state: DragState = {
      paint: active.paint,
      list: applySelection(active.list, [item], active.paint),
    };
    dragRef.current = state;
    setDrag(state);
  };

  /** 划过栅格上下边缘时自动滚动，方便一次框完秒字段的 0-59 */
  const autoScrollWhileDragging = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const el = gridRef.current;
    if (!el || el.scrollHeight <= el.clientHeight + 1) return;
    const rect = el.getBoundingClientRect();
    const edge = 24;
    if (event.clientY < rect.top + edge) el.scrollTop -= 16;
    else if (event.clientY > rect.bottom - edge) el.scrollTop += 16;
  };

  const toggleGridValue = (item: number) => {
    // 移空会被 applySelection 拒绝（字段不能为空），此时 next 与 current 完全一致
    const next = applySelection(currentList, [item], !currentList.includes(item));
    if (next.length === currentList.length && next.every((entry, i) => entry === currentList[i])) {
      return;
    }
    onChange({ mode: 'specific', list: next, from: next[0] });
  };

  /** 鼠标点选已被「按下起手 + 松手提交」覆盖，这里只服务键盘 Enter / 空格 */
  const clickGridValue = (item: number) => {
    if (Date.now() - suppressClickAtRef.current < 150) return;
    toggleGridValue(item);
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
            ref={gridRef}
            onMouseMove={autoScrollWhileDragging}
            className={`ck-grid ${
              fieldKey === 'month'
                ? 'ck-grid--12'
                : fieldKey === 'week'
                  ? 'ck-grid--7'
                  : 'ck-grid--num'
            }${valueOptions.length > 31 ? ' ck-grid--scroll' : ''}${drag ? ' is-dragging' : ''}`}
          >
            {valueOptions.map((option) => {
              const active = displayList.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={`ck-check${active ? ' is-active' : ''}`}
                  disabled={disabled}
                  onMouseDown={() => beginDrag(option.value)}
                  onMouseEnter={() => extendDrag(option.value)}
                  onClick={() => clickGridValue(option.value)}
                >
                  {locale === 'en-US' ? option.labelEn : option.label}
                </button>
              );
            })}
          </div>
          <span className="ck-hint">{hintText}</span>
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
