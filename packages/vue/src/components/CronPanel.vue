<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  COMMON_TIME_ZONES,
  CRON_SYNTAXES,
  getExpressionTokens,
  getSyntaxSpec,
  type CronLocale,
  type CronSyntax,
  type FieldKey,
} from 'cron-kit-core';

import { useCronState } from '../internal/useCronState';
import type { CronChangeInfo, CronPanelTab } from '../types';
import CronBuilder from './CronBuilder.vue';
import CronExplain from './CronExplain.vue';
import CronExpression from './CronExpression.vue';
import CronNextRuns from './CronNextRuns.vue';
import CronTemplates from './CronTemplates.vue';
import Dropdown from './Dropdown.vue';

const TAB_LABELS: Record<CronPanelTab, { 'zh-CN': string; 'en-US': string }> = {
  builder: { 'zh-CN': '可视化配置', 'en-US': 'Builder' },
  expression: { 'zh-CN': '表达式', 'en-US': 'Expression' },
  templates: { 'zh-CN': '常用模板', 'en-US': 'Presets' },
  explain: { 'zh-CN': '字段说明', 'en-US': 'Explanation' },
};

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
    activeTab?: CronPanelTab;
    tabs?: CronPanelTab[];
    showNextRuns?: boolean;
    showHeader?: boolean;
    title?: string | null;
    showSyntaxSwitch?: boolean;
    syntaxes?: CronSyntax[];
    showTimeZone?: boolean;
    showSummary?: boolean;
    flat?: boolean;
  }>(),
  {
    locale: 'zh-CN',
    theme: 'light',
    nextRunsCount: 5,
    disabled: false,
    tabs: () => ['builder', 'expression', 'templates', 'explain'] as CronPanelTab[],
    showNextRuns: true,
    showHeader: true,
    showSyntaxSwitch: true,
    syntaxes: () => [...CRON_SYNTAXES] as CronSyntax[],
    showTimeZone: true,
    showSummary: true,
    flat: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', expression: string, info: CronChangeInfo): void;
  (e: 'validChange', valid: boolean): void;
  (e: 'syntaxChange', syntax: CronSyntax): void;
  (e: 'timeZoneChange', timeZone: string): void;
  (e: 'tabChange', tab: CronPanelTab): void;
}>();

const { syntax, timeZone, expression, parsed, described, setExpression, setSyntax, setTimeZone } =
  useCronState(props, emit);

const innerTab = ref<CronPanelTab>(props.activeTab ?? 'builder');
const tab = computed(() => props.activeTab ?? innerTab.value);
const visibleTabs = computed(() => props.tabs.filter((item) => item in TAB_LABELS));

// 当前正在编辑的字段，用于在表达式栏高亮对应片段
const activeField = ref<FieldKey>(getSyntaxSpec(syntax.value).fields[0]);
const expressionTokens = computed(() =>
  getExpressionTokens(expression.value, syntax.value, props.locale),
);

// 切换语法后，原字段可能不存在于新语法（如 Linux 没有「秒」），回落到第一个字段
watch(syntax, (next) => {
  const keys = getSyntaxSpec(next).fields;
  if (!keys.includes(activeField.value)) activeField.value = keys[0];
});

function focusField(key: FieldKey) {
  activeField.value = key;
  if (tab.value !== 'builder' && visibleTabs.value.includes('builder')) selectTab('builder');
}

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
onMounted(() => {
  /* 预留：如需挂载后聚焦可在此处理 */
});
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

async function copyExpression() {
  try {
    await navigator.clipboard.writeText(expression.value);
    copied.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
}

function selectTab(next: CronPanelTab) {
  innerTab.value = next;
  emit('tabChange', next);
}

const t = (zh: string, en: string) => (props.locale === 'en-US' ? en : zh);
const syntaxList = computed(() => props.syntaxes);
const timeZoneList = computed(() => COMMON_TIME_ZONES);
const syntaxSpec = computed(() => getSyntaxSpec(syntax.value));
</script>

<template>
  <div class="ck-root" :class="{ 'ck-panel': !flat }" :data-ck-theme="theme">
    <div v-if="showHeader" class="ck-header">
      <div v-if="title !== null">
        <h3 class="ck-title">{{ title ?? t('Cron 表达式配置', 'Cron expression') }}</h3>
        <p class="ck-subtitle">{{ syntaxSpec.description }}</p>
      </div>

      <div class="ck-inline" :style="{ marginLeft: title === null ? 'auto' : undefined }">
        <div v-if="showSyntaxSwitch" class="ck-seg" role="radiogroup">
          <button
            v-for="item in syntaxList"
            :key="item"
            type="button"
            role="radio"
            :aria-checked="syntax === item"
            class="ck-seg__item"
            :class="{ 'is-active': syntax === item }"
            :disabled="disabled"
            @click="setSyntax(item)"
          >
            {{ getSyntaxSpec(item).label }}
          </button>
        </div>

        <Dropdown
          v-if="showTimeZone"
          class="ck-dropdown--tz"
          :model-value="timeZone"
          :options="timeZoneList"
          :locale="locale"
          :disabled="disabled"
          searchable
          :aria-label="t('时区', 'Time zone')"
          :search-placeholder="t('输入时区名称筛选…', 'Filter time zones…')"
          @update:model-value="(v: string | number) => setTimeZone(String(v))"
        />
      </div>
    </div>

    <div class="ck-expr">
      <div v-if="expressionTokens.length" class="ck-expr__tokens">
        <button
          v-for="token in expressionTokens"
          :key="token.key"
          type="button"
          class="ck-token"
          :class="{ 'is-active': token.key === activeField }"
          :aria-pressed="token.key === activeField"
          :disabled="disabled"
          :title="`编辑「${token.label}」字段`"
          @click="focusField(token.key)"
        >
          <span class="ck-token__value">{{ token.value }}</span>
          <span class="ck-token__label">{{ token.label }}</span>
        </button>
      </div>
      <span v-else class="ck-expr__value" :class="{ 'is-empty': !expression }">
        {{ expression || t('尚未填写表达式', 'No expression yet') }}
      </span>

      <button
        type="button"
        class="ck-btn ck-btn--sm"
        :disabled="disabled || !expression"
        @click="copyExpression"
      >
        {{ copied ? t('已复制', 'Copied') : t('复制', 'Copy') }}
      </button>
    </div>

    <div v-if="showSummary && parsed.valid && described.summary" class="ck-summary ck-summary--bar">
      <span class="ck-summary__icon" aria-hidden="true">↳</span>
      <span>{{ described.summary }}</span>
    </div>

    <div class="ck-main">
      <div class="ck-col">
        <div v-if="visibleTabs.length > 1" class="ck-tabs" role="tablist">
          <button
            v-for="item in visibleTabs"
            :key="item"
            type="button"
            role="tab"
            :aria-selected="tab === item"
            class="ck-tabs__item"
            :class="{ 'is-active': tab === item }"
            :disabled="disabled"
            @click="selectTab(item)"
          >
            {{ TAB_LABELS[item][locale === 'en-US' ? 'en-US' : 'zh-CN'] }}
          </button>
        </div>

        <CronBuilder
          v-if="tab === 'builder'"
          :model-value="expression"
          :syntax="syntax"
          :locale="locale"
          :theme="theme"
          :disabled="disabled"
          layout="tabs"
          :active-field="activeField"
          @update:model-value="setExpression"
          @active-field-change="activeField = $event"
        />

        <CronExpression
          v-else-if="tab === 'expression'"
          :model-value="expression"
          :syntax="syntax"
          :locale="locale"
          :theme="theme"
          :disabled="disabled"
          @update:model-value="setExpression"
        />

        <CronTemplates
          v-else-if="tab === 'templates'"
          :model-value="expression"
          :syntax="syntax"
          :locale="locale"
          :theme="theme"
          @select="setExpression"
        />

        <CronExplain
          v-else-if="tab === 'explain'"
          :model-value="expression"
          :syntax="syntax"
          :locale="locale"
          :theme="theme"
        />
      </div>

      <div v-if="showNextRuns" class="ck-col">
        <CronNextRuns
          :model-value="expression"
          :syntax="syntax"
          :time-zone="timeZone"
          :locale="locale"
          :theme="theme"
          :count="nextRunsCount"
        />
      </div>
    </div>

    <slot />
  </div>
</template>
