<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  applySelection,
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

import Dropdown from './Dropdown.vue';
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

/** 「当月第 N 个星期几」里的序数候选 */
const NTH_OPTIONS = [1, 2, 3, 4, 5].map((item) => ({ value: item, label: String(item) }));

const selectedList = computed(() => props.value?.list ?? []);

interface DragState {
  /** 起手格子原本未选中 → 本次并入；原本已选中 → 本次移出 */
  paint: boolean;
  /** 拖拽过程中的实时选区，尚未回传给父组件 */
  list: number[];
}

const gridRef = ref<HTMLElement | null>(null);
const drag = ref<DragState | null>(null);
// mouseup 之后浏览器还会补发一次 click，记下时间点让那次 click 让位
const suppressClickAt = ref(0);

/** 划选期间先渲染本地草稿，松手才提交，免得每划一格都惊动父组件 */
const displayList = computed(() => drag.value?.list ?? selectedList.value);

const selectedLabels = computed(() =>
  valueOptions.value
    .filter((option) => displayList.value.includes(option.value))
    .map((option) => (props.locale === 'en-US' ? option.labelEn : option.label)),
);
const selectedText = computed(() =>
  selectedLabels.value.length > 12
    ? `${selectedLabels.value.slice(0, 12).join('、')} 等 ${selectedLabels.value.length} 个`
    : selectedLabels.value.join('、'),
);
// 顺带把「可以拖拽框选」这件事写在提示里，否则用户不会知道
const hintText = computed(() =>
  selectedLabels.value.length
    ? props.locale === 'en-US'
      ? `Selected ${selectedLabels.value.length}: ${selectedText.value} · hold and drag to select`
      : `已选 ${selectedLabels.value.length} 个：${selectedText.value}（按住鼠标滑动可框选）`
    : props.locale === 'en-US'
      ? 'Click, or hold and drag to select multiple values'
      : '点击选择，或按住鼠标滑动框选',
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

/** 按下即起手：把起手格子并入草稿，同时锁定本次是「并入」还是「移出」 */
function beginDrag(item: number) {
  const current = props.value?.list ?? [];
  const paint = !current.includes(item);
  drag.value = { paint, list: applySelection(current, [item], paint) };
}

function extendDrag(item: number) {
  const active = drag.value;
  if (!active) return;
  drag.value = { paint: active.paint, list: applySelection(active.list, [item], active.paint) };
}

function endDrag() {
  const active = drag.value;
  if (!active) return;
  drag.value = null;
  suppressClickAt.value = Date.now();
  const list = [...active.list];
  emit('update', { mode: 'specific', list, from: list[0] });
}

/** 划过栅格上下边缘时自动滚动，方便一次框完秒字段的 0-59 */
function autoScrollWhileDragging(event: MouseEvent) {
  if (!drag.value) return;
  const el = gridRef.value;
  if (!el || el.scrollHeight <= el.clientHeight + 1) return;
  const rect = el.getBoundingClientRect();
  const edge = 24;
  if (event.clientY < rect.top + edge) el.scrollTop -= 16;
  else if (event.clientY > rect.bottom - edge) el.scrollTop += 16;
}

function toggleGridValue(item: number) {
  const current = props.value?.list ?? [];
  // 移空会被 applySelection 拒绝（字段不能为空），此时 next 与 current 完全一致
  const next = applySelection(current, [item], !current.includes(item));
  if (next.length === current.length && next.every((entry, i) => entry === current[i])) return;
  emit('update', { mode: 'specific', list: next, from: next[0] });
}

/** 鼠标点选已被「按下起手 + 松手提交」覆盖，这里只服务键盘 Enter / 空格 */
function clickGridValue(item: number) {
  if (Date.now() - suppressClickAt.value < 150) return;
  toggleGridValue(item);
}

onMounted(() => {
  // pointerup 与 mouseup 都会到；第二次进来时 drag 已清空，天然去重
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('blur', endDrag);
});

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', endDrag);
  window.removeEventListener('pointerup', endDrag);
  window.removeEventListener('blur', endDrag);
});

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
      <div
        ref="gridRef"
        class="ck-grid"
        :class="[gridClass, { 'is-dragging': drag !== null }]"
        @mousemove="autoScrollWhileDragging"
      >
        <button
          v-for="option in valueOptions"
          :key="option.value"
          type="button"
          :aria-pressed="displayList.includes(option.value)"
          class="ck-check"
          :class="{ 'is-active': displayList.includes(option.value) }"
          :disabled="disabled"
          @mousedown="beginDrag(option.value)"
          @mouseenter="extendDrag(option.value)"
          @click="clickGridValue(option.value)"
        >
          {{ locale === 'en-US' ? option.labelEn : option.label }}
        </button>
      </div>
      <span class="ck-hint">{{ hintText }}</span>
    </template>

    <div v-if="mode === 'range'" class="ck-inline">
      <OptionSelect
        v-if="isGridField"
        :model-value="value?.from"
        :options="valueOptions"
        :locale="locale"
        :disabled="disabled"
        :aria-label="locale === 'en-US' ? spec.labelEn + ' from' : spec.label + '起始值'"
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
        :aria-label="locale === 'en-US' ? spec.labelEn + ' to' : spec.label + '结束值'"
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
        :aria-label="locale === 'en-US' ? 'Weekday' : '星期几'"
        @update:model-value="(v: number) => emitPatch({ from: v, list: [v] })"
      />
    </div>

    <div v-if="mode === 'nthWeekday'" class="ck-inline">
      <span class="ck-label">当月第</span>
      <Dropdown
        :model-value="value?.nth ?? 1"
        :options="NTH_OPTIONS"
        :locale="locale"
        :disabled="disabled"
        :aria-label="locale === 'en-US' ? 'Nth occurrence' : '第几个'"
        @update:model-value="(v: string | number) => emitPatch({ nth: Number(v) })"
      />
      <span class="ck-label">个</span>
      <OptionSelect
        :model-value="value?.from"
        :options="valueOptions"
        :locale="locale"
        :disabled="disabled"
        :aria-label="locale === 'en-US' ? 'Weekday' : '星期几'"
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
