<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { CronLocale } from 'cron-kit-core';

import { useCronKitStyles } from '../internal/useCronState';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string | null;
    width?: number | string;
    zIndex?: number;
    maskClosable?: boolean;
    closable?: boolean;
    okText?: string;
    cancelText?: string;
    showFooter?: boolean;
    locale?: CronLocale;
    theme?: 'light' | 'dark' | 'auto';
    lockScroll?: boolean;
  }>(),
  {
    width: 920,
    zIndex: 1000,
    maskClosable: true,
    closable: true,
    showFooter: true,
    locale: 'zh-CN',
    theme: 'light',
    lockScroll: true,
  },
);

const emit = defineEmits<{ (e: 'ok'): void; (e: 'cancel'): void }>();

useCronKitStyles();

const dialog = ref<HTMLElement | null>(null);
let previousOverflow = '';

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel');
}

function lock() {
  if (typeof document === 'undefined') return;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
}

function unlock() {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = previousOverflow;
}

function sync(open: boolean) {
  if (typeof document === 'undefined') return;
  if (open) {
    document.addEventListener('keydown', onKeyDown);
    if (props.lockScroll) lock();
    requestAnimationFrame(() => dialog.value?.focus());
  } else {
    document.removeEventListener('keydown', onKeyDown);
    if (props.lockScroll) unlock();
  }
}

watch(() => props.open, sync, { immediate: true });
onMounted(() => sync(props.open));
onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  document.removeEventListener('keydown', onKeyDown);
  if (props.lockScroll && props.open) unlock();
});

const t = (zh: string, en: string) => (props.locale === 'en-US' ? en : zh);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="ck-root ck-modal-mask"
      :data-ck-theme="theme"
      :style="{ zIndex }"
      @mousedown.self="maskClosable && emit('cancel')"
    >
      <div
        ref="dialog"
        class="ck-modal"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :style="{ maxWidth: typeof width === 'number' ? `${width}px` : width, outline: 'none' }"
      >
        <div v-if="title !== null || closable" class="ck-modal__header">
          <h3 class="ck-modal__title">
            {{ title === undefined ? t('Cron 表达式配置', 'Cron expression') : title }}
          </h3>
          <button
            v-if="closable"
            type="button"
            class="ck-modal__close"
            :aria-label="t('关闭', 'Close')"
            @click="emit('cancel')"
          >
            ×
          </button>
        </div>

        <div class="ck-modal__body">
          <slot />
        </div>

        <div v-if="showFooter" class="ck-modal__footer">
          <slot name="footer">
            <button type="button" class="ck-btn" @click="emit('cancel')">
              {{ cancelText ?? t('取消', 'Cancel') }}
            </button>
            <button type="button" class="ck-btn ck-btn--primary" @click="emit('ok')">
              {{ okText ?? t('确定', 'OK') }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>
