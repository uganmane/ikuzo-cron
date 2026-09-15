<script setup lang="ts">
import { computed } from 'vue';
import {
  createFieldValue,
  getFieldSpec,
  getModeOptions,
  getValueOptions,
  previewField,
  type CronLocale,
  type CronSyntax,
  type FieldKey,
  type FieldMode,
  type FieldValue,
} from 'cron-kit-core';

import NumberInput from './NumberInput.vue';
import OptionSelect from './OptionSelect.vue';

const props = withDefaults(
  defineProps<{
    fieldKey: FieldKey;
    syntax: CronSyntax;
    value?: FieldValue;
    locale?: CronLocale;
    disabled?: boolean;
  }>(),
  { locale: 'zh-CN', disabled: false },
);

const emit = defineEmits<{ (e: 'update', value: FieldValue): void }>();

const spec = computed(() => getFieldSpec(props.fieldKey, props.syntax));
const mode = computed<FieldMode>(() => props.value?.mode ?? 'every');
const modeOptions = computed(() => getModeOptions(props.fieldKey, props.syntax));
const valueOptions = computed(() => getValueOptions(props.fieldKey, props.syntax, props.locale));
// 月 / 周用带名称的栅格，其余数值字段用紧凑数字栅格
const isGridField = computed(() => props.fieldKey === 'month' || props.fieldKey === 'week');

const selectedList = computed(() => props.value?.list ?? []);
const selectedLabels = computed(() =>
  valueOptions.value
    .filter((option) => selectedList.value.includes(option.value))
    .map((option) => (props.locale === 'en-US' ? option.labelEn : option.label)),
);
const selectedText = computed(() =>
  selectedLabels.value.length > 12
    ? `${selectedLabels.value.slice(0, 12).join('、')} 等 ${selectedLabels.value.length} 个`
    : selectedLabels.value.join('、'),
);

/** 月 / 周用名称栅格，其余数值字段用紧凑数字栅格；值较多时限高滚动 */
const gridClass = computed(() => {
  const columns =
    props.fieldKey === 'month' ? 'ck-grid--12' : props.fieldKey === 'week' ? 'ck-grid--7' : 'ck-grid--num';
  return `${columns}${valueOptions.value.length > 31 ? ' ck-grid--scroll' : ''}`;
});

const rawText = computed(() => previewField(props.fieldKey, props.value, props.syntax));

function emitPatch(patch: Partial<FieldValue>) {
  emit('update', { ...(props.value ?? { mode: mode.value }), ...patch, mode: mode.value } as FieldValue);
}

function switchMode(nextMode: FieldMode) {
  emit('update', createFieldValue(nextMode, props.fieldKey, props.syntax));
}

function toggleGridValue(item: number) {
  const current = props.value?.list ?? [];
  // 至少保留一个值，否则该字段会变成空表达式
  if (current.includes(item) && current.length === 1) return;
  const next = current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item];
  emit('update', {
    mode: 'specific',
    list: next,
    from: [...next].sort((a, b) => a - b)[0],
  });
}

function onRawInput(event: Event) {
  emitPatch({ raw: (event.target as HTMLInputElement).value });
}

function modeLabel(label: string, labelEn: string) {
  return props.locale === 'en-US' ? labelEn : label;
}
</script>

<template>
  <div class="ck-field">
    <div class="ck-field__head">
      <span class="ck-field__name">{{ locale === 'en-US' ? spec.labelEn : spec.label }}</span>
      <span class="ck-field__range">{{ spec.range }}</span>
      <span class="ck-field__raw" style="margin-left: auto">{{ rawText }}</span>
    </div>

    <div class="ck-chips" role="radiogroup">
      <button
        v-for="option in modeOptions"
        :key="option.mode"
        type="button"
        role="radio"
        :aria-checked="mode === option.mode"
        class="ck-chip"
        :class="{ 'is-active': mode === option.mode }"
        :disabled="disabled"
        @click="switchMode(option.mode)"
      >
        {{ modeLabel(option.label, option.labelEn) }}
      </button>
    </div>

    <template v-if="mode === 'specific'">
      <div class="ck-grid" :class="gridClass">
        <button
          v-for="option in valueOptions"
          :key="option.value"
          type="button"
          :aria-pressed="selectedList.includes(option.value)"
          class="ck-check"
          :class="{ 'is-active': selectedList.includes(option.value) }"
          :disabled="disabled"
          @click="toggleGridValue(option.value)"
        >
          {{ locale === 'en-US' ? option.labelEn : option.label }}
        </button>
      </div>
      <span class="ck-hint">
        {{
          selectedLabels.length
            ? `已选 ${selectedLabels.length} 个：${selectedText}`
            : '点击上方数值进行多选'
        }}
      </span>
    </template>

    <div v-if="mode === 'range'" class="ck-inline">
      <OptionSelect
        v-if="isGridField"
        :model-value="value?.from"
        :options="valueOptions"
        :locale="locale"
        :disabled="disabled"
        @update:model-value="(v: number) => emitPatch({ from: v })"
      />
      <NumberInput
        v-else
        :model-value="value?.from"
        :min="spec.min"
        :max="spec.max"
        :disabled="disabled"
        @update:model-value="(v?: number) => emitPatch({ from: v })"
      />
      <span class="ck-label">到</span>
      <OptionSelect
        v-if="isGridField"
        :model-value="value?.to"
        :options="valueOptions"
        :locale="locale"
        :disabled="disabled"
        @update:model-value="(v: number) => emitPatch({ to: v })"
      />
      <NumberInput
        v-else
        :model-value="value?.to"
        :min="spec.min"
        :max="spec.max"
        :disabled="disabled"
        @update:model-value="(v?: number) => emitPatch({ to: v })"
      />
      <span class="ck-label">周期</span>
      <NumberInput
        :model-value="value?.step"
        :min="1"
        :max="spec.max"
        :disabled="disabled"
        @update:model-value="(v?: number) => emitPatch({ step: v })"
      />
      <span class="ck-hint">周期留空表示连续</span>
    </div>

    <div v-if="mode === 'interval'" class="ck-inline">
      <span class="ck-label">从</span>
      <NumberInput
        :model-value="value?.from"
        :min="spec.min"
        :max="spec.max"
        :disabled="disabled"
        @update:model-value="(v?: number) => emitPatch({ from: v })"
      />
      <span class="ck-label">开始，每</span>
      <NumberInput
        :model-value="value?.step"
        :min="1"
        :max="spec.max"
        :disabled="disabled"
        @update:model-value="(v?: number) => emitPatch({ step: v })"
      />
      <span class="ck-hint">个{{ spec.label }}执行一次</span>
    </div>

    <div v-if="mode === 'last'" class="ck-inline">
      <span class="ck-label">倒数第</span>
      <NumberInput
        :model-value="value?.offset"
        :min="0"
        :max="30"
        :disabled="disabled"
        @update:model-value="(v?: number) => emitPatch({ offset: v })"
      />
      <span class="ck-hint">天，填 0 表示当月最后一天</span>
    </div>

    <p v-if="mode === 'lastWeekday'" class="ck-hint">当月最后一个工作日（周一至周五）执行</p>

    <div v-if="mode === 'nearestWeekday'" class="ck-inline">
      <span class="ck-label">最接近第</span>
      <NumberInput
        :model-value="value?.from"
        :min="1"
        :max="31"
        :disabled="disabled"
        @update:model-value="(v?: number) => emitPatch({ from: v })"
      />
      <span class="ck-hint">天的工作日执行</span>
    </div>

    <div v-if="mode === 'lastOfWeek'" class="ck-inline">
      <span class="ck-label">当月最后一个</span>
      <OptionSelect
        :model-value="value?.from"
        :options="valueOptions"
        :locale="locale"
        :disabled="disabled"
        @update:model-value="(v: number) => emitPatch({ from: v, list: [v] })"
      />
    </div>

    <div v-if="mode === 'nthWeekday'" class="ck-inline">
      <span class="ck-label">当月第</span>
      <select
        class="ck-select"
        :value="String(value?.nth ?? 1)"
        :disabled="disabled"
        @change="(e: Event) => emitPatch({ nth: Number((e.target as HTMLSelectElement).value) })"
      >
        <option v-for="item in [1, 2, 3, 4, 5]" :key="item" :value="item">{{ item }}</option>
      </select>
      <span class="ck-label">个</span>
      <OptionSelect
        :model-value="value?.from"
        :options="valueOptions"
        :locale="locale"
        :disabled="disabled"
        @update:model-value="(v: number) => emitPatch({ from: v, list: [v] })"
      />
    </div>

    <div v-if="mode === 'raw'" class="ck-inline">
      <input
        class="ck-input ck-input--mono ck-input--full"
        placeholder="直接填写该字段的表达式"
        :value="value?.raw ?? ''"
        :disabled="disabled"
        @input="onRawInput"
      />
    </div>
  </div>
</template>
