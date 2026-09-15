<script setup lang="ts">
import { computed } from 'vue';
import { SPECIAL_CHARS, type CronLocale, type CronSyntax } from 'cron-kit-core';

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
    showLegend?: boolean;
  }>(),
  { locale: 'zh-CN', theme: 'light', showLegend: true },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', expression: string, info: CronChangeInfo): void;
  (e: 'syntaxChange', syntax: CronSyntax): void;
  (e: 'timeZoneChange', timeZone: string): void;
}>();

const { syntax, parsed, described } = useCronState(props, emit);

const legend = computed(() => SPECIAL_CHARS.filter((item) => item.syntaxes.includes(syntax.value)));
const failure = computed(() => parsed.value.issues[0]?.message);
</script>

<template>
  <div class="ck-root ck-col" :data-ck-theme="theme">
    <div v-if="parsed.valid" class="ck-summary">
      <span class="ck-summary__icon" aria-hidden="true">↳</span>
      <span>{{ described.summary }}</span>
    </div>

    <div v-else class="ck-alert ck-alert--error" role="alert">
      <span aria-hidden="true">✕</span>
      <span>{{ failure ?? '表达式不合法' }}</span>
    </div>

    <div class="ck-explain">
      <div v-for="segment in described.segments" :key="segment.key" class="ck-explain__card">
        <span class="ck-explain__label">{{ segment.label }}</span>
        <span class="ck-explain__raw">{{ segment.raw }}</span>
        <span class="ck-explain__text">{{ segment.text }}</span>
      </div>
    </div>

    <div v-if="showLegend && legend.length" class="ck-section">
      <h4 class="ck-section__title">
        {{ locale === 'en-US' ? 'Special characters' : '特殊字符含义' }}
      </h4>
      <div class="ck-legend">
        <div v-for="item in legend" :key="item.char" class="ck-legend__card">
          <div class="ck-legend__head">
            <span class="ck-legend__char">{{ item.char }}</span>
            <span class="ck-legend__name">{{ item.name }}</span>
          </div>
          <p class="ck-legend__desc">{{ item.description }}</p>
          <p class="ck-legend__example">例：{{ item.example }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
