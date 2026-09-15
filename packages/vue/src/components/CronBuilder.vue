<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  buildExpression,
  getSyntaxSpec,
  parseExpression,
  ruleToFieldValue,
  type CronLocale,
  type CronSyntax,
  type FieldKey,
  type FieldValue,
} from 'cron-kit-core';

import { useCronState } from '../internal/useCronState';
import type { CronChangeInfo } from '../types';
import FieldEditor from './FieldEditor.vue';

type FieldMap = Partial<Record<FieldKey, FieldValue>>;

const SHORT_LABELS = {
  'zh-CN': { second: '秒', minute: '分', hour: '时', day: '日', month: '月', week: '周', year: '年' },
  'en-US': { second: 'Sec', minute: 'Min', hour: 'Hour', day: 'Day', month: 'Month', week: 'Week', year: 'Year' },
} as const;

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
    layout?: 'tabs' | 'stack';
    activeField?: FieldKey;
    defaultActiveField?: FieldKey;
  }>(),
  { locale: 'zh-CN', theme: 'light', disabled: false, layout: 'tabs' },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', expression: string, info: CronChangeInfo): void;
  (e: 'validChange', valid: boolean): void;
  (e: 'syntaxChange', syntax: CronSyntax): void;
  (e: 'timeZoneChange', timeZone: string): void;
  /** 支持 `v-model:active-field` */
  (e: 'update:activeField', field: FieldKey): void;
  (e: 'activeFieldChange', field: FieldKey): void;
}>();

const { syntax, expression, setExpression } = useCronState(props, emit);

function rehydrate(expressionText: string, syntaxValue: CronSyntax): FieldMap {
  const { rules } = parseExpression(expressionText, syntaxValue);
  const fields: FieldMap = {};
  for (const key of Object.keys(rules) as FieldKey[]) {
    const rule = rules[key];
    if (rule) fields[key] = ruleToFieldValue(rule, syntaxValue);
  }
  return fields;
}

const fields = ref<FieldMap>(rehydrate(expression.value, syntax.value));

// 当前字段：外部传入则受控，否则内部维护
const innerField = ref<FieldKey>(
  props.activeField ?? props.defaultActiveField ?? getSyntaxSpec(syntax.value).fields[0],
);
const activeField = computed(() => props.activeField ?? innerField.value);

watch(
  () => props.activeField,
  (next) => {
    if (next && next !== innerField.value) innerField.value = next;
  },
);

function setActiveField(key: FieldKey) {
  innerField.value = key;
  emit('update:activeField', key);
  emit('activeFieldChange', key);
}

let lastBuilt: string | null = null;
let prefer: 'day' | 'week' = 'day';

watch([expression, syntax], ([expressionValue, syntaxValue]) => {
  if (lastBuilt === expressionValue) return;
  lastBuilt = expressionValue;
  fields.value = rehydrate(expressionValue, syntaxValue);
  const spec = getSyntaxSpec(syntaxValue);
  if (!spec.fields.includes(activeField.value)) setActiveField(spec.fields[0]);
});

const fieldKeys = computed(() => getSyntaxSpec(syntax.value).fields);

function updateField(key: FieldKey, next: FieldValue) {
  const nextFields: FieldMap = { ...fields.value, [key]: next };
  fields.value = nextFields;
  if (key === 'day' || key === 'week') prefer = key;
  const nextExpression = buildExpression({ syntax: syntax.value, fields: nextFields }, prefer);
  lastBuilt = nextExpression;
  setExpression(nextExpression);
}
</script>

<template>
  <div
    class="ck-root"
    :data-ck-theme="theme"
    :class="layout === 'stack' ? 'ck-fields' : 'ck-col'"
  >
    <template v-if="layout === 'stack'">
      <FieldEditor
        v-for="key in fieldKeys"
        :key="key"
        :field-key="key"
        :syntax="syntax"
        :locale="locale"
        :disabled="disabled"
        :value="fields[key]"
        @update="(next: FieldValue) => updateField(key, next)"
      />
    </template>

    <template v-else>
      <div class="ck-seg ck-seg--block" role="tablist">
        <button
          v-for="key in fieldKeys"
          :key="key"
          type="button"
          role="tab"
          :aria-selected="activeField === key"
          class="ck-seg__item"
          :class="{ 'is-active': activeField === key }"
          :disabled="disabled"
          @click="setActiveField(key)"
        >
          {{ SHORT_LABELS[locale === 'en-US' ? 'en-US' : 'zh-CN'][key] }}
        </button>
      </div>

      <FieldEditor
        :field-key="activeField"
        :syntax="syntax"
        :locale="locale"
        :disabled="disabled"
        :value="fields[activeField]"
        @update="(next: FieldValue) => updateField(activeField, next)"
      />
    </template>
  </div>
</template>
