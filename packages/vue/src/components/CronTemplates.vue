<script setup lang="ts">
import { computed } from 'vue';
import { getTemplates, type CronLocale, type CronSyntax } from 'cron-kit-core';

import { useCronState } from '../internal/useCronState';
import type { CronChangeInfo } from '../types';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    value?: string;
    defaultValue?: string;
    syntax?: CronSyntax;
    defaultSyntax?: CronSyntax;
    locale?: CronLocale;
    theme?: 'light' | 'dark' | 'auto';
  }>(),
  { locale: 'zh-CN', theme: 'light' },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', expression: string, info: CronChangeInfo): void;
  (e: 'select', expression: string): void;
  (e: 'syntaxChange', syntax: CronSyntax): void;
}>();

const { syntax, expression, setExpression } = useCronState(props, emit);

const templates = computed(() => getTemplates(syntax.value));

function apply(expressionText: string) {
  setExpression(expressionText);
  emit('select', expressionText);
}
</script>

<template>
  <div class="ck-root ck-templates" :data-ck-theme="theme">
    <button
      v-for="template in templates"
      :key="template.id"
      type="button"
      class="ck-template"
      :style="
        template.expression === expression
          ? { borderColor: 'var(--ck-primary)', background: 'var(--ck-primary-soft)' }
          : undefined
      "
      @click="apply(template.expression)"
    >
      <span class="ck-template__label">
        {{ locale === 'en-US' ? template.labelEn : template.label }}
      </span>
      <span class="ck-template__expr">{{ template.expression }}</span>
      <span class="ck-template__desc">{{ template.description }}</span>
    </button>
  </div>
</template>
