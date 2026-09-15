import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { Portal } from '../internal/Portal';
import { useCronKitStyles } from '../internal/useCronKitStyles';
import type { CronModalProps } from '../types';

/**
 * 轻量弹窗容器（不依赖任何 UI 库）。
 *
 * 支持 Esc 关闭、点击遮罩关闭、body 滚动锁定，内容通过 Portal 渲染到 body。
 */
export function CronModal({
  open,
  title,
  width = 920,
  zIndex = 1000,
  maskClosable = true,
  closable = true,
  okText,
  cancelText,
  showFooter = true,
  onOk,
  onCancel,
  footer,
  locale = 'zh-CN',
  theme = 'light',
  className,
  style,
  children,
  lockScroll = true,
}: CronModalProps) {
  useCronKitStyles();

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open || !lockScroll || typeof document === 'undefined') return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, lockScroll]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const t = (zh: string, en: string) => (locale === 'en-US' ? en : zh);
  const heading: ReactNode = title === undefined ? t('Cron 表达式配置', 'Cron expression') : title;

  return (
    <Portal>
      <div
        className="ck-root ck-modal-mask"
        data-ck-theme={theme}
        style={{ zIndex }}
        onMouseDown={(event) => {
          if (maskClosable && event.target === event.currentTarget) onCancel?.();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={`ck-modal${className ? ` ${className}` : ''}`}
          style={{ maxWidth: width, outline: 'none', ...style }}
        >
          {heading || closable ? (
            <div className="ck-modal__header">
              <h3 className="ck-modal__title">{heading}</h3>
              {closable ? (
                <button
                  type="button"
                  className="ck-modal__close"
                  aria-label={t('关闭', 'Close')}
                  onClick={onCancel}
                >
                  ×
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="ck-modal__body">{children}</div>

          {footer !== undefined ? (
            footer
          ) : showFooter ? (
            <div className="ck-modal__footer">
              <button type="button" className="ck-btn" onClick={onCancel}>
                {cancelText ?? t('取消', 'Cancel')}
              </button>
              <button type="button" className="ck-btn ck-btn--primary" onClick={onOk}>
                {okText ?? t('确定', 'OK')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}
