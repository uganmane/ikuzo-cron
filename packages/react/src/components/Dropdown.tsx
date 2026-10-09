import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CronLocale } from 'cron-kit-core';

/** 下拉项：值可以是数字（月 / 周几 / 序数）或字符串（IANA 时区） */
export interface DropdownOption<T extends string | number = string | number> {
  value: T;
  label: string;
  labelEn?: string;
}

export interface DropdownProps<T extends string | number = string | number> {
  value: T;
  options: DropdownOption<T>[];
  locale?: CronLocale;
  disabled?: boolean;
  /** 打开面板后显示搜索框，按文本过滤选项（时区列表很适用） */
  searchable?: boolean;
  /** 触发器的无障碍名称 */
  ariaLabel?: string;
  /** 当前值不在候选里时的占位文案 */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  onChange: (value: T) => void;
}

/** 面板期望高度，超过就内部滚动 */
const PANEL_MAX_HEIGHT = 240;
/** 估算水平方向的对齐，避免面板顶出窗口右边 */
const PANEL_ESTIMATED_WIDTH = 220;

/**
 * 自绘下拉：替换原生 `<select>`。
 *
 * 原生 select 展开后的弹层是浏览器按系统配色画的，跟主题完全脱节——
 * 暗色界面里会弹出一块纯白面板，而且圆角、悬停高亮、内边距一律无法定制。
 * 这里自己画浮层，配色全部走 `--ck-*` 变量，亮 / 暗两种主题都能跟上。
 */
export function Dropdown<T extends string | number>({
  value,
  options,
  locale = 'zh-CN',
  disabled,
  searchable,
  ariaLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
  onChange,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(-1);
  const [flip, setFlip] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [maxHeight, setMaxHeight] = useState(PANEL_MAX_HEIGHT);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const labelOf = (option: DropdownOption<T>) =>
    locale === 'en-US' && option.labelEn ? option.labelEn : option.label;

  // 当前值可能不在候选里（例如传入了不在常用列表中的时区），补一条进去，否则触发器没东西可显示
  const valueText = String(value);
  const items: DropdownOption<T>[] = options.some((option) => String(option.value) === valueText)
    ? options
    : [{ value, label: valueText }, ...options];
  const selected = items.find((option) => String(option.value) === valueText);

  const keyword = query.trim().toLowerCase();
  const filtered = keyword
    ? items.filter((option) =>
        `${labelOf(option)} ${option.label} ${String(option.value)}`.toLowerCase().includes(keyword),
      )
    : items;

  const searchPlaceholderText = searchPlaceholder ?? (locale === 'en-US' ? 'Filter…' : '输入以筛选…');
  const emptyTextText = emptyText ?? (locale === 'en-US' ? 'No match' : '没有匹配项');

  const closePanel = () => {
    setOpen(false);
    setQuery('');
  };

  const openPanel = () => {
    if (disabled) return;
    setQuery('');
    setOpen(true);
  };

  const commit = (option: DropdownOption<T>) => {
    onChange(option.value);
    closePanel();
    triggerRef.current?.focus();
  };

  // 打开后把键盘光标落到当前选中项；搜索词变化时重算
  useEffect(() => {
    if (!open) return;
    const index = filtered.findIndex((option) => String(option.value) === valueText);
    setCursor(index >= 0 ? index : filtered.length > 0 ? 0 : -1);
    // 只关心「打开」和「搜索词变化」两个时机
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  // 上下空间不足时向上弹，并按可用空间收窄列表高度
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < PANEL_MAX_HEIGHT + 40 && above > below;
    setFlip(up);
    setMaxHeight(Math.max(140, Math.min(PANEL_MAX_HEIGHT, up ? above : below)));
    setAlignRight(rect.left + Math.max(rect.width, PANEL_ESTIMATED_WIDTH) + 8 > window.innerWidth);
  }, [open]);

  // 键盘光标移动后把它滚进视野
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const active = listRef.current?.querySelector<HTMLElement>('.ck-dropdown__option.is-active');
      active?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, cursor]);

  // 点击面板外关闭
  useEffect(() => {
    if (!open) return;
    const onDocDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
    };
  }, [open]);

  // 搜索型下拉打开即聚焦输入框，省一次点击
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const move = (delta: number) => {
    if (filtered.length === 0) return;
    setCursor((prev) => {
      // 还没有光标时：往下走落到第一项，往上走落到最后一项
      const base = prev < 0 ? (delta > 0 ? -1 : 0) : prev;
      return (base + delta + filtered.length) % filtered.length;
    });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Home':
        event.preventDefault();
        setCursor(filtered.length ? 0 : -1);
        break;
      case 'End':
        event.preventDefault();
        setCursor(filtered.length ? filtered.length - 1 : -1);
        break;
      case 'Enter': {
        event.preventDefault();
        const option = filtered[cursor];
        if (option) commit(option);
        break;
      }
      case 'Escape':
        event.preventDefault();
        closePanel();
        triggerRef.current?.focus();
        break;
      case 'Tab':
        closePanel();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className={`ck-dropdown${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        ref={triggerRef}
        className="ck-dropdown__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        <span className={`ck-dropdown__value${selected ? '' : ' is-placeholder'}`}>
          {selected ? labelOf(selected) : placeholder ?? ''}
        </span>
        <span className="ck-dropdown__caret" aria-hidden="true">
          <svg viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5 6 7.5 9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          className="ck-dropdown__panel"
          style={{
            ...(flip ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
            ...(alignRight ? { left: 'auto', right: 0 } : null),
          }}
        >
          {searchable ? (
            <div className="ck-dropdown__search">
              <input
                ref={searchRef}
                type="text"
                className="ck-dropdown__search-input"
                value={query}
                placeholder={searchPlaceholderText}
                aria-label={searchPlaceholderText}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          ) : null}
          <div ref={listRef} className="ck-dropdown__list" role="listbox" aria-label={ariaLabel} style={{ maxHeight }}>
            {filtered.length === 0 ? (
              <div className="ck-dropdown__empty">{emptyTextText}</div>
            ) : (
              filtered.map((option, index) => {
                const isSelected = String(option.value) === valueText;
                const isActive = index === cursor;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`ck-dropdown__option${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => commit(option)}
                  >
                    <span className="ck-dropdown__option-text">{labelOf(option)}</span>
                    <span className="ck-dropdown__option-mark" aria-hidden="true">
                      <svg viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6.5 5 9l4.5-5.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
