import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COMMON_TIME_ZONES,
  CRON_SYNTAXES,
  getExpressionTokens,
  getSyntaxSpec,
  type CronSyntax,
  type FieldKey,
} from 'cron-kit-core';

import { useCronKitStyles } from '../internal/useCronKitStyles';
import { useCronState } from '../internal/useCronState';
import type { CronPanelProps, CronPanelTab } from '../types';
import { CronBuilder } from './CronBuilder';
import { CronExplain } from './CronExplain';
import { CronExpression } from './CronExpression';
import { CronNextRuns } from './CronNextRuns';
import { CronTemplates } from './CronTemplates';

const TAB_LABELS: Record<CronPanelTab, { 'zh-CN': string; 'en-US': string }> = {
  builder: { 'zh-CN': '可视化配置', 'en-US': 'Builder' },
  expression: { 'zh-CN': '表达式', 'en-US': 'Expression' },
  templates: { 'zh-CN': '常用模板', 'en-US': 'Presets' },
  explain: { 'zh-CN': '字段说明', 'en-US': 'Explanation' },
};

/**
 * 一站式 Cron 配置面板：语法切换、时区、可视化配置、表达式、模板、说明与运行时间。
 *
 * 这是对标 cron.ciding.cc 的完整体验；只想嵌进表单时用 `CronInput` 更合适。
 */
export function CronPanel(props: CronPanelProps) {
  useCronKitStyles();

  const {
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
    activeTab: activeTabProp,
    defaultActiveTab = 'builder',
    onTabChange,
    tabs = ['builder', 'expression', 'templates', 'explain'],
    showNextRuns = true,
    showHeader = true,
    title,
    showSyntaxSwitch = true,
    syntaxes = CRON_SYNTAXES,
    showTimeZone = true,
    showSummary = true,
    flat = false,
    footer,
  } = props;

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

  const [innerTab, setInnerTab] = useState<CronPanelTab>(defaultActiveTab);
  const tab = activeTabProp ?? innerTab;

  // 当前正在编辑的字段，用于在表达式栏高亮对应片段
  const [activeField, setActiveField] = useState<FieldKey>(
    () => getSyntaxSpec(syntaxProp ?? defaultSyntax ?? 'quartz').fields[0],
  );
  const expressionTokens = useMemo(
    () => getExpressionTokens(state.expression, state.syntax, locale),
    [state.expression, state.syntax, locale],
  );

  // 切换语法后，原字段可能不存在于新语法（如 Linux 没有「秒」），回落到第一个字段
  useEffect(() => {
    const keys = getSyntaxSpec(state.syntax).fields;
    setActiveField((current) => (keys.includes(current) ? current : keys[0]));
  }, [state.syntax]);

  const selectTab = (next: CronPanelTab) => {
    setInnerTab(next);
    onTabChange?.(next);
  };

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyExpression = async () => {
    try {
      await navigator.clipboard.writeText(state.expression);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const t = (zh: string, en: string) => (locale === 'en-US' ? en : zh);
  const visibleTabs = tabs.filter((item) => item in TAB_LABELS);

  return (
    <div
      className={`ck-root${flat ? '' : ' ck-panel'}${className ? ` ${className}` : ''}`}
      style={style}
      data-ck-theme={theme}
    >
      {showHeader ? (
        <div className="ck-header">
          {title === null ? null : (
            <div>
              <h3 className="ck-title">
                {title ?? t('Cron 表达式配置', 'Cron expression')}
              </h3>
              <p className="ck-subtitle">{getSyntaxSpec(state.syntax).description}</p>
            </div>
          )}

          <div className="ck-inline" style={{ marginLeft: title === null ? 'auto' : undefined }}>
            {showSyntaxSwitch ? (
              <div className="ck-seg" role="radiogroup" aria-label={t('表达式类型', 'Syntax')}>
                {syntaxes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={state.syntax === item}
                    className={`ck-seg__item${state.syntax === item ? ' is-active' : ''}`}
                    disabled={disabled}
                    onClick={() => state.setSyntax(item as CronSyntax)}
                  >
                    {getSyntaxSpec(item).label}
                  </button>
                ))}
              </div>
            ) : null}

            {showTimeZone ? (
              <select
                className="ck-select"
                value={state.timeZone}
                disabled={disabled}
                aria-label={t('时区', 'Time zone')}
                onChange={(event) => state.setTimeZone(event.target.value)}
              >
                {COMMON_TIME_ZONES.some((item) => item.value === state.timeZone) ? null : (
                  <option value={state.timeZone}>{state.timeZone}</option>
                )}
                {COMMON_TIME_ZONES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="ck-expr">
        {expressionTokens.length > 0 ? (
          <div className="ck-expr__tokens">
            {expressionTokens.map((token) => {
              const active = token.key === activeField;
              return (
                <button
                  key={token.key}
                  type="button"
                  className={`ck-token${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  disabled={disabled}
                  title={`编辑「${token.label}」字段`}
                  onClick={() => {
                    setActiveField(token.key);
                    if (tab !== 'builder' && visibleTabs.includes('builder')) selectTab('builder');
                  }}
                >
                  <span className="ck-token__value">{token.value}</span>
                  <span className="ck-token__label">{token.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <span className={`ck-expr__value${state.expression ? '' : ' is-empty'}`}>
            {state.expression || t('尚未填写表达式', 'No expression yet')}
          </span>
        )}

        <button
          type="button"
          className="ck-btn ck-btn--sm"
          onClick={copyExpression}
          disabled={disabled || !state.expression}
        >
          {copied ? t('已复制', 'Copied') : t('复制', 'Copy')}
        </button>
      </div>

      {showSummary && state.parsed.valid && state.described.summary ? (
        <div className="ck-summary ck-summary--bar">
          <span className="ck-summary__icon" aria-hidden="true">
            ↳
          </span>
          <span>{state.described.summary}</span>
        </div>
      ) : null}

      <div className="ck-main">
        <div className="ck-col">
          {visibleTabs.length > 1 ? (
            <div className="ck-tabs" role="tablist">
              {visibleTabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  className={`ck-tabs__item${tab === item ? ' is-active' : ''}`}
                  disabled={disabled}
                  onClick={() => selectTab(item)}
                >
                  {TAB_LABELS[item][locale === 'en-US' ? 'en-US' : 'zh-CN']}
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'builder' ? (
            <CronBuilder
              value={state.expression}
              syntax={state.syntax}
              locale={locale}
              theme={theme}
              disabled={disabled}
              layout="tabs"
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              onChange={(next) => state.setExpression(next)}
            />
          ) : null}

          {tab === 'expression' ? (
            <CronExpression
              value={state.expression}
              syntax={state.syntax}
              locale={locale}
              disabled={disabled}
              onChange={(next) => state.setExpression(next)}
            />
          ) : null}

          {tab === 'templates' ? (
            <CronTemplates
              value={state.expression}
              syntax={state.syntax}
              locale={locale}
              onSelect={(next) => state.setExpression(next)}
            />
          ) : null}

          {tab === 'explain' ? (
            <CronExplain value={state.expression} syntax={state.syntax} locale={locale} />
          ) : null}
        </div>

        {showNextRuns ? (
          <div className="ck-col">
            <CronNextRuns
              value={state.expression}
              syntax={state.syntax}
              timeZone={state.timeZone}
              locale={locale}
              count={nextRunsCount}
            />
          </div>
        ) : null}
      </div>

      {footer}
    </div>
  );
}
