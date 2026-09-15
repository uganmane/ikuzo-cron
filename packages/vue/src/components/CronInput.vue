<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { describeExpression, getSyntaxSpec, parseExpression, type CronLocale, type CronSyntax } from 'cron-kit-core';

import { useCronState } from '../internal/useCronState';
import type { CronChangeInfo } from '../types';
import CronModal from './CronModal.vue';
import CronPanel from './CronPanel.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    value?: string;
    defaultValue?: string;
    syntax?: CronSyntax;
    defaultSyntax?: CronSyntax;
    timeZone?: string;
    defaultTimeZone?: string;
    locale?: CronLocale;
    theme?: 'light' | 'dark' | 'auto';
    nextRunsCount?: number;
    disabled?: boolean;
    modalTitle?: string | null;
    modalWidth?: number | string;
    zIndex?: number;
    applyMode?: 'confirm' | 'live';
    placeholder?: string;
    buttonText?: string;
    hideButton?: boolean;
    showSummary?: boolean;
    okText?: string;
    cancelText?: string;
  }>(),
  {
    locale: 'zh-CN',
    theme: 'light',
    nextRunsCount: 5,
    disabled: false,
    modalWidth: 920,
    zIndex: 1000,
    applyMode: 'confirm',
    hideButton: false,
    showSummary: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', expression: string, info: CronChangeInfo): void;
  (e: 'validChange', valid: boolean): void;
  (e: 'syntaxChange', syntax: CronSyntax): void;
  (e: 'timeZoneChange', timeZone: string): void;
}>();

const { syntax, timeZone, expression, setExpression, setSyntax, setTimeZone } = useCronState(
  props,
  emit,
);

const draftText = ref<string | null>(null);
const open = ref(false);
const draft = ref(expression.value);

watch(expression, () => {
  draftText.value = null;
});

const text = computed(() => draftText.value ?? expression.value);
const parsed = computed(() => parseExpression(text.value, syntax.value));
const summary = computed(() =>
  parsed.value.valid ? describeExpression(text.value, syntax.value, props.locale).summary : '',
);
const spec = computed(() => getSyntaxSpec(syntax.value));

const t = (zh: string, en: string) => (props.locale === 'en-US' ? en : zh);

function onInput(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  draftText.value = next;
  setExpression(next);
}

function openModal() {
  draft.value = expression.value;
  open.value = true;
}

function confirm() {
  setExpression(draft.value);
  open.value = false;
}
</script>

<template>
  <div class="ck-root" :data-ck-theme="theme">
    <div class="ck-trigger">
      <input
        type="text"
        class="ck-trigger__input"
        :class="{ 'is-invalid': !parsed.valid }"
        :value="text"
        :disabled="disabled"
        spellcheck="false"
        aria-label="Cron 表达式"
        :placeholder="placeholder ?? `例如 ${spec.example}`"
        @input="onInput"
        @blur="draftText = null"
      />

      <button v-if="!hideButton" type="button" class="ck-btn" :disabled="disabled" @click="openModal">
        {{ buttonText ?? t('配置', 'Configure') }}
      </button>
    </div>

    <div v-if="showSummary" class="ck-trigger__summary" :class="{ 'ck-trigger__summary--error': !parsed.valid }">
      <span aria-hidden="true">{{ parsed.valid ? '↳' : '✕' }}</span>
      <span>{{ parsed.valid ? summary : (parsed.issues[0]?.message ?? t('表达式不合法', 'Invalid expression')) }}</span>
    </div>

    <CronModal
      :open="open"
      :width="modalWidth"
      :z-index="zIndex"
      :theme="theme"
      :locale="locale"
      :title="modalTitle"
      :ok-text="okText"
      :cancel-text="cancelText"
      @ok="confirm"
      @cancel="open = false"
    >
      <CronPanel
        :model-value="draft"
        :syntax="syntax"
        :time-zone="timeZone"
        :locale="locale"
        :theme="theme"
        :disabled="disabled"
        :next-runs-count="nextRunsCount"
        :title="null"
        flat
        @update:model-value="
          (next: string) => {
            draft = next;
            if (applyMode === 'live') setExpression(next);
          }
        "
        @syntax-change="setSyntax"
        @time-zone-change="setTimeZone"
      />
    </CronModal>
  </div>
</template>
