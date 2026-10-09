<script setup lang="ts">
import { computed } from 'vue';
import type { CronLocale, ValueOption } from 'cron-kit-core';

import Dropdown from './Dropdown.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: number;
    options: ValueOption[];
    locale?: CronLocale;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  { locale: 'zh-CN', disabled: false },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>();

// 值可能还没设置，兜底显示第一项，与原生 select 在无匹配项时的表现一致
const shown = computed(() => props.modelValue ?? props.options[0]?.value ?? 0);

function onChange(value: string | number) {
  emit('update:modelValue', Number(value));
}
</script>

<template>
  <Dropdown
    :model-value="shown"
    :options="options"
    :locale="locale"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @update:model-value="onChange"
  />
</template>
