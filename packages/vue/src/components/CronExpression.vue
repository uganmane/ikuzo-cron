<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getFieldLabel, getSyntaxSpec, type CronLocale, type CronSyntax } from 'cron-kit-core';

import { useCronState } from '../internal/useCronState';
import type { CronChangeInfo } from '../types';

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
    placeholder?: string;
    showSuccessTip?: boolean;
    showSummary?: boolean;
    readOnly?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    locale: 'zh-CN',
    theme: 'light',
    disabled: false,
    showSuccessTip: false,
    showSummary: true,
    readOnly: false,
    size: 'md',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', expression: string, info: CronChangeInfo): void;
  (e: 'validChange', valid: boolean): void;
  (e: 'syntaxChange', syntax: CronSyntax): void;
  (e: 'timeZoneChange', timeZone: string): void;
}>();

const { syntax, expression, parsed, described, setExpression } = useCronState(props, emit);

const draft = ref<string | null>(null);

watch(expression, () => {
  draft.value = null;
});

const text = computed(() => draft.value ?? expression.value);
const spec = computed(() => getSyntaxSpec(syntax.value));
const fieldHint = computed(() =>
  spec.value.fields.map((key) => getFieldLabel(key, props.locale)).join(' '),
);
const fontSize = computed(() => (props.size === 'sm' ? 13 : props.size === 'lg' ? 17 : 15));

function onInput(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  draft.value = next;
  setExpression(next);
}
</script>

<template>
  <div class="ck-root ck-expr__field" :data-ck-theme="theme">
    <input
      type="text"
      class="ck-expr__input"
      :class="{ 'is-invalid': !parsed.valid }"
      :style="{ fontSize: `${fontSize}px` }"
      :value="text"
      :disabled="disabled"
      :readonly="readOnly"
      spellcheck="false"
      aria-label="Cron 表达式"
      :placeholder="placeholder ?? `例如 ${spec.example}`"
      @input="onInput"
      @blur="draft = null"
    />

    <div v-if="!parsed.valid" class="ck-alert ck-alert--error" role="alert">
      <span aria-hidden="true">✕</span>
      <span>{{ parsed.issues[0]?.message ?? '表达式不合法' }}</span>
    </div>

    <div v-else-if="showSuccessTip" class="ck-alert ck-alert--success" role="status">
      <span aria-hidden="true">✓</span>
      <span>表达式合法</span>
    </div>

    <div v-if="showSummary && parsed.valid && described.summary" class="ck-summary">
      <span class="ck-summary__icon" aria-hidden="true">↳</span>
      <span>{{ described.summary }}</span>
    </div>

    <p class="ck-hint">共 {{ spec.fieldCount }} 个字段：{{ fieldHint }}</p>
  </div>
</template>
