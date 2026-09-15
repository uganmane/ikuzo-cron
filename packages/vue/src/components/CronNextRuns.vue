<script setup lang="ts">
import { computed } from 'vue';
import type { CronLocale, CronSyntax } from 'cron-kit-core';

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
    count?: number;
    title?: string | null;
  }>(),
  { locale: 'zh-CN', theme: 'light', count: 5 },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', expression: string, info: CronChangeInfo): void;
  (e: 'syntaxChange', syntax: CronSyntax): void;
  (e: 'timeZoneChange', timeZone: string): void;
}>();

const { parsed, nextRuns, timeZone } = useCronState(props, emit);

const heading = computed(() =>
  props.title === undefined ? (props.locale === 'en-US' ? 'Next runs' : '最近运行时间') : props.title,
);
</script>

<template>
  <div class="ck-root ck-runs" :data-ck-theme="theme">
    <div v-if="heading" class="ck-runs__head">
      <span class="ck-runs__title">{{ heading }}</span>
      <span class="ck-runs__tz">{{ nextRuns[0]?.offset ?? timeZone }}</span>
    </div>

    <div v-if="nextRuns.length === 0" class="ck-runs__empty">
      {{ parsed.valid ? '该表达式在未来没有可执行的时刻' : '表达式不合法' }}
    </div>

    <ol v-else class="ck-runs__list">
      <li v-for="(item, index) in nextRuns" :key="item.timestamp" class="ck-runs__item">
        <span class="ck-runs__index">{{ index + 1 }}</span>
        <span class="ck-runs__time">{{ item.text }}</span>
        <span class="ck-runs__weekday">{{ item.weekday }}</span>
      </li>
    </ol>
  </div>
</template>
