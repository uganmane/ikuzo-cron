<script setup lang="ts">
import { computed } from 'vue';
import type { CronLocale, ValueOption } from 'cron-kit-core';

const props = withDefaults(
  defineProps<{
    modelValue?: number;
    options: ValueOption[];
    locale?: CronLocale;
    disabled?: boolean;
  }>(),
  { locale: 'zh-CN', disabled: false },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>();

const shown = computed(() => (props.modelValue === undefined ? '' : String(props.modelValue)));

function onLabel(option: ValueOption): string {
  return props.locale === 'en-US' ? option.labelEn : option.label;
}

function onChange(event: Event) {
  emit('update:modelValue', Number((event.target as HTMLSelectElement).value));
}
</script>

<template>
  <select class="ck-select" :value="shown" :disabled="disabled" @change="onChange">
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ onLabel(option) }}
    </option>
  </select>
</template>
