<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    label?: string;
  }>(),
  { min: 0, max: 59, disabled: false },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: number | undefined): void }>();

/** 输入草稿，允许用户中途清空 */
const draft = ref<string | null>(null);

watch(
  () => props.modelValue,
  () => {
    draft.value = null;
  },
);

const shown = computed(() =>
  draft.value ?? (props.modelValue === undefined ? '' : String(props.modelValue)),
);

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  if (!/^\d*$/.test(raw)) return;
  draft.value = raw;
  if (raw === '') {
    emit('update:modelValue', undefined);
    return;
  }
  const num = Number(raw);
  if (Number.isFinite(num)) emit('update:modelValue', num);
}
</script>

<template>
  <input
    class="ck-input ck-input--num"
    type="text"
    inputmode="numeric"
    :value="shown"
    :disabled="disabled"
    :aria-label="label"
    @input="onInput"
    @blur="draft = null"
  />
</template>
