import { useMemo } from 'react';
import { getTemplates } from 'cron-kit-core';

import { useCronKitStyles } from '../internal/useCronKitStyles';
import { useCronState } from '../internal/useCronState';
import type { CronTemplatesProps } from '../types';

/** 常用定时模板，点击即可套用 */
export function CronTemplates({
  value,
  defaultValue,
  syntax: syntaxProp,
  defaultSyntax,
  onSyntaxChange,
  locale = 'zh-CN',
  theme = 'light',
  className,
  style,
  onSelect,
}: CronTemplatesProps) {
  useCronKitStyles();

  const state = useCronState({
    value,
    defaultValue,
    syntax: syntaxProp,
    defaultSyntax,
    onSyntaxChange,
    locale,
  });

  const templates = useMemo(() => getTemplates(state.syntax), [state.syntax]);

  return (
    <div
      className={`ck-root ck-templates${className ? ` ${className}` : ''}`}
      style={style}
      data-ck-theme={theme}
    >
      {templates.map((template) => {
        const active = template.expression === state.expression;
        return (
          <button
            key={template.id}
            type="button"
            className="ck-template"
            style={active ? { borderColor: 'var(--ck-primary)', background: 'var(--ck-primary-soft)' } : undefined}
            onClick={() => {
              state.setExpression(template.expression);
              onSelect?.(template.expression);
            }}
          >
            <span className="ck-template__label">
              {locale === 'en-US' ? template.labelEn : template.label}
            </span>
            <span className="ck-template__expr">{template.expression}</span>
            <span className="ck-template__desc">{template.description}</span>
          </button>
        );
      })}
    </div>
  );
}
