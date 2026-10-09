<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { CronLocale } from 'cron-kit-core';

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    options: Array<{ value: string | number; label: string; labelEn?: string }>;
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
  }>(),
  { locale: 'zh-CN', disabled: false, searchable: false },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string | number): void }>();

/** 面板期望高度，超过就内部滚动 */
const PANEL_MAX_HEIGHT = 240;
/** 估算水平方向的对齐，避免面板顶出窗口右边 */
const PANEL_ESTIMATED_WIDTH = 220;

const open = ref(false);
const query = ref('');
const cursor = ref(-1);
const flip = ref(false);
const alignRight = ref(false);
const maxHeight = ref(PANEL_MAX_HEIGHT);

const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);

const valueText = computed(() => String(props.modelValue));

/** 当前值可能不在候选里（例如传入了不在常用列表中的时区），补一条进去，否则触发器没东西可显示 */
const items = computed(() =>
  props.options.some((option) => String(option.value) === valueText.value)
    ? props.options
    : [{ value: props.modelValue, label: valueText.value }, ...props.options],
);

const keyword = computed(() => query.value.trim().toLowerCase());

const filtered = computed(() =>
  keyword.value
    ? items.value.filter((option) =>
        `${labelOf(option)} ${option.label} ${String(option.value)}`
          .toLowerCase()
          .includes(keyword.value),
      )
    : items.value,
);

const selected = computed(() =>
  items.value.find((option) => String(option.value) === valueText.value),
);

const selectedLabel = computed(() => (selected.value ? labelOf(selected.value) : ''));

const searchPlaceholderText = computed(
  () => props.searchPlaceholder ?? (props.locale === 'en-US' ? 'Filter…' : '输入以筛选…'),
);
const emptyTextText = computed(
  () => props.emptyText ?? (props.locale === 'en-US' ? 'No match' : '没有匹配项'),
);
const listStyle = computed(() => ({ maxHeight: `${maxHeight.value}px` }));

function labelOf(option: { label: string; labelEn?: string }) {
  return props.locale === 'en-US' && option.labelEn ? option.labelEn : option.label;
}

function openPanel() {
  if (props.disabled) return;
  query.value = '';
  open.value = true;
}

function closePanel() {
  open.value = false;
  query.value = '';
}

function commit(option: { value: string | number }) {
  emit('update:modelValue', option.value);
  closePanel();
  triggerRef.value?.focus();
}

function move(delta: number) {
  const total = filtered.value.length;
  if (total === 0) return;
  // 还没有光标时：往下走落到第一项，往上走落到最后一项
  const base = cursor.value < 0 ? (delta > 0 ? -1 : 0) : cursor.value;
  cursor.value = (base + delta + total) % total;
}

function onSearchInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
}

function onKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (!open.value) {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp'
    ) {
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
      cursor.value = filtered.value.length ? 0 : -1;
      break;
    case 'End':
      event.preventDefault();
      cursor.value = filtered.value.length ? filtered.value.length - 1 : -1;
      break;
    case 'Enter': {
      event.preventDefault();
      const option = filtered.value[cursor.value];
      if (option) commit(option);
      break;
    }
    case 'Escape':
      event.preventDefault();
      closePanel();
      triggerRef.value?.focus();
      break;
    case 'Tab':
      closePanel();
      break;
    default:
      break;
  }
}

function onDocDown(event: MouseEvent | TouchEvent) {
  if (rootRef.value?.contains(event.target as Node)) return;
  closePanel();
}

// 打开后把键盘光标落到当前选中项；搜索词变化时重算
watch([open, query], () => {
  if (!open.value) return;
  const index = filtered.value.findIndex((option) => String(option.value) === valueText.value);
  cursor.value = index >= 0 ? index : filtered.value.length > 0 ? 0 : -1;
});

// 键盘光标移动后把它滚进视野
watch([open, cursor], async () => {
  if (!open.value) return;
  await nextTick();
  const active = listRef.value?.querySelector<HTMLElement>('.ck-dropdown__option.is-active');
  active?.scrollIntoView({ block: 'nearest' });
});

// 上下空间不足时向上弹，并按可用空间收窄列表高度；搜索型下拉顺带聚焦输入框
watch(open, async (value) => {
  if (!value) return;
  await nextTick();
  const trigger = triggerRef.value;
  if (trigger) {
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < PANEL_MAX_HEIGHT + 40 && above > below;
    flip.value = up;
    maxHeight.value = Math.max(140, Math.min(PANEL_MAX_HEIGHT, up ? above : below));
    alignRight.value = rect.left + Math.max(rect.width, PANEL_ESTIMATED_WIDTH) + 8 > window.innerWidth;
  }
  if (props.searchable) searchRef.value?.focus();
});

onMounted(() => {
  document.addEventListener('mousedown', onDocDown);
  document.addEventListener('touchstart', onDocDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocDown);
  document.removeEventListener('touchstart', onDocDown);
});
</script>

<template>
  <div ref="rootRef" class="ck-dropdown" :class="{ 'is-open': open }" @keydown="onKeyDown">
    <button
      ref="triggerRef"
      type="button"
      class="ck-dropdown__trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      @click="open ? closePanel() : openPanel()"
    >
      <span class="ck-dropdown__value" :class="{ 'is-placeholder': !selected }">
        {{ selected ? selectedLabel : (placeholder ?? '') }}
      </span>
      <span class="ck-dropdown__caret" aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5 6 7.5 9 4.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>

    <div
      v-if="open"
      class="ck-dropdown__panel"
      :style="{
        ...(flip ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
        ...(alignRight ? { left: 'auto', right: '0' } : {}),
      }"
    >
      <div v-if="searchable" class="ck-dropdown__search">
        <input
          ref="searchRef"
          class="ck-dropdown__search-input"
          type="text"
          :value="query"
          :placeholder="searchPlaceholderText"
          :aria-label="searchPlaceholderText"
          @input="onSearchInput"
        />
      </div>
      <div
        ref="listRef"
        class="ck-dropdown__list"
        role="listbox"
        :aria-label="ariaLabel"
        :style="listStyle"
      >
        <div v-if="filtered.length === 0" class="ck-dropdown__empty">{{ emptyTextText }}</div>
        <template v-else>
          <button
            v-for="(option, index) in filtered"
            :key="String(option.value)"
            type="button"
            role="option"
            :aria-selected="String(option.value) === valueText"
            class="ck-dropdown__option"
            :class="{
              'is-selected': String(option.value) === valueText,
              'is-active': index === cursor,
            }"
            @mouseenter="cursor = index"
            @click="commit(option)"
          >
            <span class="ck-dropdown__option-text">{{ labelOf(option) }}</span>
            <span class="ck-dropdown__option-mark" aria-hidden="true">
              <svg viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6.5 5 9l4.5-5.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
