/**
 * cron-kit 共享样式表。
 *
 * React 与 Vue 两套组件共用同一份样式，通过 `ensureCronKitStyles()` 在运行时注入，
 * 也可以直接 `import 'cron-kit-core/styles.css'` 或使用构建产出的独立 CSS 文件。
 */

/** 全部类名都带 `ck-` 前缀，避免污染宿主页面 */
export const CRON_KIT_STYLE_ID = 'cron-kit-styles';

export const CRON_KIT_CSS = `
.ck-root {
  --ck-bg: #ffffff;
  --ck-bg-subtle: #f6f7f9;
  --ck-bg-elevated: #ffffff;
  --ck-bg-hover: #f2f4f7;
  --ck-border: #e4e7ec;
  --ck-border-strong: #d0d5dd;
  --ck-text: #1d2129;
  --ck-text-muted: #667085;
  --ck-text-faint: #98a2b3;
  --ck-primary: #2563eb;
  --ck-primary-hover: #1d4ed8;
  --ck-primary-soft: rgba(37, 99, 235, 0.08);
  --ck-primary-ring: rgba(37, 99, 235, 0.24);
  --ck-danger: #d92d20;
  --ck-danger-soft: rgba(217, 45, 32, 0.08);
  --ck-success: #079455;
  --ck-success-soft: rgba(7, 148, 85, 0.1);
  --ck-warning: #b54708;
  --ck-radius: 10px;
  --ck-radius-sm: 6px;
  --ck-shadow: 0 1px 2px rgba(16, 24, 40, 0.05), 0 1px 3px rgba(16, 24, 40, 0.08);
  --ck-shadow-lg: 0 8px 24px rgba(16, 24, 40, 0.12);
  --ck-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --ck-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", Roboto, "Helvetica Neue", Arial, sans-serif;
  --ck-gap: 12px;
  color: var(--ck-text);
  font-family: var(--ck-font);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.ck-root[data-ck-theme='dark'] {
  --ck-bg: #16181d;
  --ck-bg-subtle: #1c1f26;
  --ck-bg-elevated: #21252d;
  --ck-bg-hover: #262b34;
  --ck-border: #30353f;
  --ck-border-strong: #3d434e;
  --ck-text: #e8eaed;
  --ck-text-muted: #9aa3b2;
  --ck-text-faint: #6b7480;
  --ck-primary: #5b8cff;
  --ck-primary-hover: #7ba3ff;
  --ck-primary-soft: rgba(91, 140, 255, 0.14);
  --ck-primary-ring: rgba(91, 140, 255, 0.32);
  --ck-danger: #ff6b5e;
  --ck-danger-soft: rgba(255, 107, 94, 0.14);
  --ck-success: #3ddc97;
  --ck-success-soft: rgba(61, 220, 151, 0.14);
  --ck-warning: #f5a524;
  --ck-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  --ck-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}

@media (prefers-color-scheme: dark) {
  .ck-root[data-ck-theme='auto'] {
    --ck-bg: #16181d;
    --ck-bg-subtle: #1c1f26;
    --ck-bg-elevated: #21252d;
    --ck-bg-hover: #262b34;
    --ck-border: #30353f;
    --ck-border-strong: #3d434e;
    --ck-text: #e8eaed;
    --ck-text-muted: #9aa3b2;
    --ck-text-faint: #6b7480;
    --ck-primary: #5b8cff;
    --ck-primary-hover: #7ba3ff;
    --ck-primary-soft: rgba(91, 140, 255, 0.14);
    --ck-primary-ring: rgba(91, 140, 255, 0.32);
    --ck-danger: #ff6b5e;
    --ck-danger-soft: rgba(255, 107, 94, 0.14);
    --ck-success: #3ddc97;
    --ck-success-soft: rgba(61, 220, 151, 0.14);
    --ck-warning: #f5a524;
    --ck-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    --ck-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
}

.ck-root *,
.ck-root *::before,
.ck-root *::after {
  box-sizing: border-box;
}

/* ---------- 面板骨架 ---------- */

.ck-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ck-gap);
  padding: 16px;
  background: var(--ck-bg);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius);
  box-shadow: var(--ck-shadow);
}

.ck-panel--flat {
  border: none;
  box-shadow: none;
  padding: 0;
  background: transparent;
}

.ck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ck-gap);
  flex-wrap: wrap;
}

.ck-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ck-text);
}

.ck-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--ck-text-muted);
}

.ck-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 296px;
  gap: var(--ck-gap);
  align-items: start;
}

.ck-main--single {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 880px) {
  .ck-main {
    grid-template-columns: minmax(0, 1fr);
  }
}

.ck-col {
  display: flex;
  flex-direction: column;
  gap: var(--ck-gap);
  min-width: 0;
}

/* ---------- 分段控件 / 标签页 ---------- */

.ck-seg {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: var(--ck-bg-subtle);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
}

.ck-seg__item {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--ck-text-muted);
  font: inherit;
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.ck-seg__item:hover:not(:disabled) {
  color: var(--ck-text);
  background: var(--ck-bg-hover);
}

.ck-seg__item.is-active {
  background: var(--ck-bg-elevated);
  color: var(--ck-primary);
  font-weight: 600;
  box-shadow: var(--ck-shadow);
}

.ck-seg__item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ck-seg--block {
  display: flex;
  width: 100%;
}

.ck-seg--block .ck-seg__item {
  flex: 1;
  text-align: center;
}

.ck-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--ck-border);
  padding: 0 2px;
}

.ck-tabs__item {
  appearance: none;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: var(--ck-text-muted);
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.ck-tabs__item:hover {
  color: var(--ck-text);
}

.ck-tabs__item.is-active {
  color: var(--ck-primary);
  border-bottom-color: var(--ck-primary);
  font-weight: 600;
}

/* ---------- 表达式展示 ---------- */

.ck-expr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--ck-bg-subtle);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  overflow: hidden;
}

.ck-expr__value {
  flex: 1;
  min-width: 0;
  font-family: var(--ck-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--ck-primary);
  letter-spacing: 0.02em;
  word-break: break-all;
}

.ck-expr__value.is-empty {
  color: var(--ck-text-faint);
  font-weight: 400;
}

/* 逐字段 token：每个字段一个方块，下方标注字段名，当前字段高亮 */
.ck-expr__tokens {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-end;
}

.ck-token {
  appearance: none;
  font: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 42px;
  padding: 4px 8px 3px;
  border: 1px solid transparent;
  border-radius: var(--ck-radius-sm);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.ck-token:hover:not(:disabled) {
  background: var(--ck-bg-hover);
}

.ck-token:disabled {
  cursor: not-allowed;
}

.ck-token__value {
  font-family: var(--ck-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--ck-primary);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.ck-token__label {
  font-size: 11px;
  line-height: 1.2;
  color: var(--ck-text-faint);
}

.ck-token.is-active {
  background: var(--ck-primary-soft);
  border-color: var(--ck-primary);
}

.ck-token.is-active .ck-token__label {
  color: var(--ck-primary);
  font-weight: 600;
}

.ck-token.is-placeholder .ck-token__value {
  color: var(--ck-text-faint);
  font-weight: 400;
}

.ck-expr__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ck-expr__input {
  width: 100%;
  font-family: var(--ck-mono);
  font-size: 15px;
  padding: 9px 12px;
  color: var(--ck-text);
  background: var(--ck-bg);
  border: 1px solid var(--ck-border-strong);
  border-radius: var(--ck-radius-sm);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ck-expr__input:focus {
  border-color: var(--ck-primary);
  box-shadow: 0 0 0 3px var(--ck-primary-ring);
}

.ck-expr__input.is-invalid {
  border-color: var(--ck-danger);
}

.ck-expr__input.is-invalid:focus {
  box-shadow: 0 0 0 3px var(--ck-danger-soft);
}

/* ---------- 按钮 ---------- */

.ck-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font: inherit;
  font-size: 13px;
  padding: 7px 12px;
  border-radius: var(--ck-radius-sm);
  border: 1px solid var(--ck-border-strong);
  background: var(--ck-bg-elevated);
  color: var(--ck-text);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.ck-btn:hover:not(:disabled) {
  background: var(--ck-bg-hover);
  border-color: var(--ck-border-strong);
}

.ck-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ck-btn--primary {
  background: var(--ck-primary);
  border-color: var(--ck-primary);
  color: #ffffff;
  font-weight: 500;
}

.ck-btn--primary:hover:not(:disabled) {
  background: var(--ck-primary-hover);
  border-color: var(--ck-primary-hover);
}

.ck-btn--ghost {
  border-color: transparent;
  background: transparent;
  color: var(--ck-text-muted);
}

.ck-btn--ghost:hover:not(:disabled) {
  background: var(--ck-bg-hover);
  color: var(--ck-text);
}

.ck-btn--sm {
  font-size: 12px;
  padding: 4px 8px;
}

/* ---------- 表单控件 ---------- */

.ck-input,
.ck-select {
  font: inherit;
  font-size: 13px;
  padding: 6px 9px;
  color: var(--ck-text);
  background: var(--ck-bg-elevated);
  border: 1px solid var(--ck-border-strong);
  border-radius: var(--ck-radius-sm);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ck-input:focus,
.ck-select:focus {
  border-color: var(--ck-primary);
  box-shadow: 0 0 0 3px var(--ck-primary-ring);
}

.ck-input:disabled,
.ck-select:disabled {
  background: var(--ck-bg-subtle);
  color: var(--ck-text-faint);
  cursor: not-allowed;
}

.ck-input--num {
  width: 76px;
  font-family: var(--ck-mono);
}

.ck-input--mono {
  font-family: var(--ck-mono);
}

.ck-input--full {
  width: 100%;
}

.ck-label {
  font-size: 12px;
  color: var(--ck-text-muted);
  white-space: nowrap;
}

.ck-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ---------- 字段编辑器 ---------- */

.ck-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ck-field {
  padding: 12px;
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  background: var(--ck-bg-elevated);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ck-field__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ck-field__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ck-text);
}

.ck-field__range {
  font-size: 11px;
  color: var(--ck-text-faint);
  font-family: var(--ck-mono);
}

.ck-field__raw {
  font-family: var(--ck-mono);
  font-size: 12px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--ck-primary-soft);
  color: var(--ck-primary);
  font-weight: 600;
}

.ck-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ck-chip {
  appearance: none;
  font: inherit;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--ck-border);
  background: var(--ck-bg-subtle);
  color: var(--ck-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.ck-chip:hover:not(:disabled) {
  border-color: var(--ck-border-strong);
  color: var(--ck-text);
}

.ck-chip.is-active {
  background: var(--ck-primary-soft);
  border-color: var(--ck-primary);
  color: var(--ck-primary);
  font-weight: 600;
}

.ck-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  text-decoration: line-through;
}

/* ---------- 多选栅格（月 / 周） ---------- */

.ck-grid {
  display: grid;
  gap: 6px;
  /* 支持鼠标滑动框选，划过时不要选中文本 */
  user-select: none;
}

.ck-grid--12 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.ck-grid--7 {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

/* 数值型字段（秒/分/时/日/年）可选值较多，自动铺列并限高滚动 */
.ck-grid--num {
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
}

.ck-grid--scroll {
  max-height: 168px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  background: var(--ck-bg-subtle);
}

.ck-grid--scroll .ck-check {
  background: var(--ck-bg);
}

.ck-check {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  padding: 5px 0;
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  background: var(--ck-bg-subtle);
  color: var(--ck-text-muted);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.ck-check:hover {
  border-color: var(--ck-border-strong);
  color: var(--ck-text);
}

.ck-check.is-active {
  background: var(--ck-primary-soft);
  border-color: var(--ck-primary);
  color: var(--ck-primary);
  font-weight: 600;
}

/* 鼠标滑动框选：起手后切十字光标；关掉过渡，长距离划过时跟手不打滑 */
.ck-grid.is-dragging {
  cursor: crosshair;
}

.ck-grid.is-dragging .ck-check {
  transition: none;
}

/* ---------- 最近运行时间 ---------- */

.ck-runs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--ck-bg-subtle);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
}

.ck-runs__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ck-runs__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ck-text-muted);
  letter-spacing: 0.02em;
}

.ck-runs__tz {
  font-size: 11px;
  font-family: var(--ck-mono);
  color: var(--ck-text-faint);
}

.ck-runs__list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ck-runs__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  background: var(--ck-bg-elevated);
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  font-size: 12.5px;
}

.ck-runs__index {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--ck-primary-soft);
  color: var(--ck-primary);
  font-size: 11px;
  font-weight: 600;
}

.ck-runs__time {
  flex: 1;
  font-family: var(--ck-mono);
  color: var(--ck-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ck-runs__weekday {
  color: var(--ck-text-muted);
  font-size: 11.5px;
}

.ck-runs__empty {
  font-size: 12px;
  color: var(--ck-text-faint);
  padding: 8px 0;
  text-align: center;
}

/* ---------- 描述与说明 ---------- */

.ck-summary {
  padding: 11px 12px;
  border-radius: var(--ck-radius-sm);
  background: var(--ck-primary-soft);
  border: 1px solid transparent;
  font-size: 13.5px;
  color: var(--ck-text);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.ck-summary__icon {
  flex: 0 0 auto;
  color: var(--ck-primary);
}

.ck-summary--bar {
  padding: 8px 12px;
  font-size: 13px;
  background: transparent;
  border-color: var(--ck-border);
  border-style: dashed;
}

.ck-explain {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.ck-explain__card {
  padding: 9px 11px;
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  background: var(--ck-bg-elevated);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ck-explain__label {
  font-size: 11px;
  color: var(--ck-text-faint);
}

.ck-explain__raw {
  font-family: var(--ck-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ck-primary);
  word-break: break-all;
}

.ck-explain__text {
  font-size: 11.5px;
  color: var(--ck-text-muted);
}

.ck-legend {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.ck-legend__card {
  padding: 10px 11px;
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  background: var(--ck-bg-elevated);
}

.ck-legend__head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
}

.ck-legend__char {
  font-family: var(--ck-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--ck-primary);
  background: var(--ck-primary-soft);
  border-radius: 4px;
  padding: 1px 7px;
  min-width: 24px;
  text-align: center;
}

.ck-legend__name {
  font-size: 12.5px;
  font-weight: 600;
}

.ck-legend__desc {
  font-size: 11.5px;
  color: var(--ck-text-muted);
  margin: 0;
}

.ck-legend__example {
  margin: 6px 0 0;
  font-family: var(--ck-mono);
  font-size: 11px;
  color: var(--ck-text-faint);
  word-break: break-all;
}

/* ---------- 模板 ---------- */

.ck-templates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 8px;
}

.ck-template {
  text-align: left;
  appearance: none;
  font: inherit;
  padding: 9px 11px;
  border: 1px solid var(--ck-border);
  border-radius: var(--ck-radius-sm);
  background: var(--ck-bg-elevated);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.15s;
}

.ck-template:hover {
  border-color: var(--ck-primary);
  background: var(--ck-primary-soft);
}

.ck-template__label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ck-text);
}

.ck-template__expr {
  font-family: var(--ck-mono);
  font-size: 11.5px;
  color: var(--ck-primary);
  word-break: break-all;
}

.ck-template__desc {
  font-size: 11px;
  color: var(--ck-text-faint);
}

/* ---------- 提示与错误 ---------- */

.ck-alert {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 9px 11px;
  border-radius: var(--ck-radius-sm);
  font-size: 12.5px;
  line-height: 1.5;
}

.ck-alert--error {
  background: var(--ck-danger-soft);
  color: var(--ck-danger);
}

.ck-alert--success {
  background: var(--ck-success-soft);
  color: var(--ck-success);
}

.ck-alert--info {
  background: var(--ck-bg-subtle);
  color: var(--ck-text-muted);
}

.ck-hint {
  font-size: 11.5px;
  color: var(--ck-text-faint);
  margin: 0;
}

.ck-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ck-section__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ck-text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0;
}

.ck-divider {
  height: 1px;
  background: var(--ck-border);
  border: none;
  margin: 0;
}

.ck-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ck-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--ck-text-faint);
  font-size: 13px;
}

/* ---------- 表单触发器（输入框 + 打开弹窗） ---------- */

.ck-trigger {
  display: flex;
  gap: 8px;
  align-items: stretch;
  width: 100%;
}

.ck-trigger__input {
  flex: 1;
  min-width: 0;
  font-family: var(--ck-mono);
  font-size: 14px;
  padding: 7px 11px;
  color: var(--ck-text);
  background: var(--ck-bg-elevated);
  border: 1px solid var(--ck-border-strong);
  border-radius: var(--ck-radius-sm);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ck-trigger__input:focus {
  border-color: var(--ck-primary);
  box-shadow: 0 0 0 3px var(--ck-primary-ring);
}

.ck-trigger__input.is-invalid {
  border-color: var(--ck-danger);
}

.ck-trigger__input:disabled {
  background: var(--ck-bg-subtle);
  color: var(--ck-text-faint);
  cursor: not-allowed;
}

.ck-trigger__summary {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ck-text-muted);
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.ck-trigger__summary--error {
  color: var(--ck-danger);
}

/* ---------- 弹窗 ---------- */

.ck-modal-mask {
  position: fixed;
  inset: 0;
  padding: 5vh 16px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  background: rgba(16, 24, 40, 0.5);
  animation: ck-fade-in 0.16s ease-out;
}

.ck-modal {
  width: 100%;
  background: var(--ck-bg);
  border-radius: 14px;
  box-shadow: var(--ck-shadow-lg);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
  animation: ck-modal-in 0.18s ease-out;
}

.ck-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--ck-border);
  flex: 0 0 auto;
}

.ck-modal__title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

.ck-modal__close {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--ck-text-faint);
  font-size: 18px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: var(--ck-radius-sm);
  cursor: pointer;
}

.ck-modal__close:hover {
  background: var(--ck-bg-hover);
  color: var(--ck-text);
}

.ck-modal__body {
  padding: 16px 18px;
  overflow: auto;
  flex: 1 1 auto;
}

.ck-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--ck-border);
  background: var(--ck-bg-subtle);
  flex: 0 0 auto;
}

.ck-modal__footer-hint {
  margin-right: auto;
  font-size: 12px;
  color: var(--ck-text-faint);
  font-family: var(--ck-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes ck-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes ck-modal-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ck-modal,
  .ck-modal-mask {
    animation: none;
  }
}
`;

let injected = false;

/** 是否已经注入过样式 */
export function isCronKitStylesInjected(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.getElementById(CRON_KIT_STYLE_ID));
}

/**
 * 在运行时注入样式表（幂等，服务端渲染环境下安全跳过）。
 * 组件挂载时会自动调用，通常无需手动调用。
 */
export function ensureCronKitStyles(): void {
  if (injected || typeof document === 'undefined') return;
  if (document.getElementById(CRON_KIT_STYLE_ID)) {
    injected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = CRON_KIT_STYLE_ID;
  style.setAttribute('data-cron-kit', 'true');
  style.textContent = CRON_KIT_CSS;
  document.head.appendChild(style);
  injected = true;
}

/** 移除已注入的样式（主要用于测试） */
export function removeCronKitStyles(): void {
  if (typeof document === 'undefined') return;
  const node = document.getElementById(CRON_KIT_STYLE_ID);
  if (node && node.parentNode) node.parentNode.removeChild(node);
  injected = false;
}
