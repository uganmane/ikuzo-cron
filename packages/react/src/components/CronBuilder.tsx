import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildExpression,
  getSyntaxSpec,
  parseExpression,
  ruleToFieldValue,
  type CronSyntax,
  type FieldKey,
  type FieldValue,
} from 'cron-kit-core';

import { useCronKitStyles } from '../internal/useCronKitStyles';
import { useCronState } from '../internal/useCronState';
import type { CronBuilderProps } from '../types';
import { FieldEditor } from './FieldEditor';

type FieldMap = Partial<Record<FieldKey, FieldValue>>;

/** 字段标签页上使用的短标签 */
const SHORT_LABELS: Record<'zh-CN' | 'en-US', Record<FieldKey, string>> = {
  'zh-CN': {
    second: '秒',
    minute: '分',
    hour: '时',
    day: '日',
    month: '月',
    week: '周',
    year: '年',
  },
  'en-US': {
    second: 'Sec',
    minute: 'Min',
    hour: 'Hour',
    day: 'Day',
    month: 'Month',
    week: 'Week',
    year: 'Year',
  },
};

/** 从表达式还原出各字段的可视化配置 */
function rehydrate(expression: string, syntax: CronSyntax): FieldMap {
  const { rules } = parseExpression(expression, syntax);
  const fields: FieldMap = {};
  for (const key of Object.keys(rules) as FieldKey[]) {
    const rule = rules[key];
    if (rule) fields[key] = ruleToFieldValue(rule, syntax);
  }
  return fields;
}

/**
 * 可视化字段配置器。
 *
 * 表达式是唯一事实来源：外部传入的表达式会被反解析回填到各字段，
 * 用户在界面上的每一次改动都会立刻重建表达式并通过 `onChange` 回传。
 */
export function CronBuilder({
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
  layout = 'tabs',
  activeField: activeFieldProp,
  defaultActiveField,
  onActiveFieldChange,
}: CronBuilderProps) {
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

  const { expression, syntax } = state;
  const [fields, setFields] = useState<FieldMap>(() => rehydrate(expression, syntax));
  const [innerField, setInnerField] = useState<FieldKey>(
    () => defaultActiveField ?? getSyntaxSpec(syntax).fields[0],
  );
  const activeField = activeFieldProp ?? innerField;

  const setActiveField = (key: FieldKey) => {
    setInnerField(key);
    onActiveFieldChange?.(key);
  };

  // 记录「由本组件构造出来」的表达式，用于区分外部改动
  const lastBuilt = useRef<string | null>(null);
  const prefer = useRef<'day' | 'week'>('day');

  useEffect(() => {
    if (lastBuilt.current === expression) return;
    lastBuilt.current = expression;
    setFields(rehydrate(expression, syntax));
    const spec = getSyntaxSpec(syntax);
    if (!spec.fields.includes(activeField)) setActiveField(spec.fields[0]);
    // activeField 只在语法切换时兜底，不参与依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, syntax]);

  const fieldSpecs = useMemo(() => getSyntaxSpec(syntax).fields, [syntax]);

  const updateField = (key: FieldKey, next: FieldValue) => {
    const nextFields: FieldMap = { ...fields, [key]: next };
    setFields(nextFields);
    if (key === 'day' || key === 'week') prefer.current = key;
    const nextExpression = buildExpression({ syntax, fields: nextFields }, prefer.current);
    lastBuilt.current = nextExpression;
    state.setExpression(nextExpression);
  };

  if (layout === 'stack') {
    return (
      <div
        className={`ck-root ck-fields${className ? ` ${className}` : ''}`}
        style={style}
        data-ck-theme={theme}
      >
        {fieldSpecs.map((key) => (
          <FieldEditor
            key={key}
            fieldKey={key}
            syntax={syntax}
            locale={locale}
            disabled={disabled}
            value={fields[key]}
            onChange={(next) => updateField(key, next)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`ck-root ck-col${className ? ` ${className}` : ''}`}
      style={style}
      data-ck-theme={theme}
    >
      <div className="ck-seg ck-seg--block" role="tablist" aria-label="Cron 字段">
        {fieldSpecs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeField === key}
            className={`ck-seg__item${activeField === key ? ' is-active' : ''}`}
            disabled={disabled}
            onClick={() => setActiveField(key)}
          >
            {SHORT_LABELS[locale === 'en-US' ? 'en-US' : 'zh-CN'][key]}
          </button>
        ))}
      </div>

      <FieldEditor
        fieldKey={activeField}
        syntax={syntax}
        locale={locale}
        disabled={disabled}
        value={fields[activeField]}
        onChange={(next) => updateField(activeField, next)}
      />
    </div>
  );
}
