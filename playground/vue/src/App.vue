<script setup lang="ts">
import { reactive, ref } from 'vue';
import {
  CronBuilder,
  CronExplain,
  CronExpression,
  CronInput,
  CronModal,
  CronNextRuns,
  CronPanel,
  CronTemplates,
  type CronTheme,
} from 'cron-kit-vue';

type Demo = 'panel' | 'form' | 'parts';

const theme = ref<CronTheme>('light');
const demo = ref<Demo>('panel');

// 完整面板
const panelExpr = ref('0 0 9 ? * MON-FRI *');
const showSyntaxSwitch = ref(true);

// 表单集成
const form = reactive({
  name: '每日数据同步',
  cron: '0 0 2 * * ?',
  enabled: true,
});
const submitted = ref<string | null>(null);

// 子组件演示
const partsExpr = ref('0 0/5 * * * ?');
const part = ref<'builder' | 'expression' | 'runs' | 'explain' | 'templates'>('builder');

// 独立弹窗
const modalOpen = ref(false);
const modalExpr = ref('0 0 0 L * ? *');

const navItems: Array<[Demo, string]> = [
  ['panel', '完整面板'],
  ['form', '表单 / 弹窗集成'],
  ['parts', '按需组合'],
];

const partItems: Array<[typeof part.value, string]> = [
  ['builder', 'CronBuilder'],
  ['expression', 'CronExpression'],
  ['runs', 'CronNextRuns'],
  ['explain', 'CronExplain'],
  ['templates', 'CronTemplates'],
];

function submit() {
  submitted.value = JSON.stringify(form, null, 2);
}

function reset() {
  form.name = '每日数据同步';
  form.cron = '0 0 2 * * ?';
  form.enabled = true;
  submitted.value = null;
}
</script>

<template>
  <div class="page" :class="{ 'page--dark': theme === 'dark' }">
    <header class="page__head">
      <div>
        <h1>cron-kit-vue</h1>
        <p>Vue 3 版 Cron 表达式可视化组件 · 零运行时依赖 · 支持 Quartz / Spring / Linux / Node 四种语法</p>
      </div>
      <label class="switch">
        <input
          type="checkbox"
          :checked="theme === 'dark'"
          @change="theme = ($event.target as HTMLInputElement).checked ? 'dark' : 'light'"
        />
        <span>深色主题</span>
      </label>
    </header>

    <nav class="page__nav">
      <button
        v-for="[key, label] in navItems"
        :key="key"
        type="button"
        class="page__nav-item"
        :class="{ 'is-active': demo === key }"
        @click="demo = key"
      >
        {{ label }}
      </button>
    </nav>

    <section v-if="demo === 'panel'" class="card">
      <div class="card__head">
        <h2>完整面板</h2>
        <p>
          同时提供可视化配置、表达式编辑、常用模板、字段说明与最近运行时间。
          表达式按字段拆开显示，正在编辑的字段会高亮，点一下即可切换。
        </p>
        <label class="switch">
          <input type="checkbox" v-model="showSyntaxSwitch" />
          <span>显示 Quartz / Spring / Linux / Node 语法切换（可选项）</span>
        </label>
      </div>
      <CronPanel
        v-model="panelExpr"
        :theme="theme"
        :next-runs-count="6"
        :show-syntax-switch="showSyntaxSwitch"
      />
    </section>

    <div v-else-if="demo === 'form'" class="grid-2">
      <section class="card">
        <div class="card__head">
          <h2>嵌进表单弹窗（v-model）</h2>
          <p>
            <code>CronInput</code> 支持 <code>v-model</code>，也可以直接放进 Element Plus 的{' '}
            <code>el-form-item</code>。点击「配置」在弹窗里可视化编辑。
          </p>
        </div>

        <div class="form">
          <label class="form__row">
            <span class="form__label">任务名称</span>
            <input class="form__input" v-model="form.name" />
          </label>

          <div class="form__row">
            <span class="form__label">执行时间</span>
            <CronInput v-model="form.cron" :theme="theme" locale="zh-CN" />
          </div>

          <div class="form__actions">
            <button type="button" class="btn btn--primary" @click="submit">提交</button>
            <button type="button" class="btn" @click="reset">重置</button>
          </div>

          <pre v-if="submitted" class="result">{{ submitted }}</pre>
          <p v-else class="hint">点击「提交」查看表单收集到的值。</p>
        </div>
      </section>

      <section class="card">
        <div class="card__head">
          <h2>独立弹窗</h2>
          <p><code>CronModal</code> 可单独作为唤起容器，内容自定义。</p>
        </div>
        <div class="inline-demo">
          <code class="mono">{{ modalExpr }}</code>
          <button type="button" class="btn btn--primary" @click="modalOpen = true">打开弹窗</button>
        </div>

        <CronModal
          :open="modalOpen"
          :theme="theme"
          :width="900"
          title="选择执行时间"
          @cancel="modalOpen = false"
          @ok="modalOpen = false"
        >
          <CronPanel
            v-model="modalExpr"
            :theme="theme"
            :title="null"
            flat
          />
        </CronModal>
      </section>
    </div>

    <div v-else class="grid-2">
      <section class="card">
        <div class="card__head">
          <h2>按需组合</h2>
          <p>五个子组件可以单独引入，也能自由拼装；每个都自带 ck-root 与主题，单独用也有完整样式。</p>
        </div>

        <div class="seg">
          <button
            v-for="[key, label] in partItems"
            :key="key"
            type="button"
            class="seg__item"
            :class="{ 'is-active': part === key }"
            @click="part = key"
          >
            {{ label }}
          </button>
        </div>

        <div style="margin-top: 16px">
          <CronBuilder
            v-if="part === 'builder'"
            v-model="partsExpr"
            :theme="theme"
            layout="stack"
          />
          <CronExpression
            v-else-if="part === 'expression'"
            v-model="partsExpr"
            :theme="theme"
            show-success-tip
          />
          <CronNextRuns v-else-if="part === 'runs'" v-model="partsExpr" :theme="theme" :count="8" />
          <CronExplain v-else-if="part === 'explain'" v-model="partsExpr" :theme="theme" />
          <CronTemplates
            v-else-if="part === 'templates'"
            v-model="partsExpr"
            :theme="theme"
          />
        </div>
      </section>

      <section class="card">
        <div class="card__head">
          <h2>实时结果</h2>
          <p>当前表达式与运行时间。</p>
        </div>
        <CronNextRuns v-model="partsExpr" :theme="theme" :count="5" title="最近运行时间" />
      </section>
    </div>

    <footer class="page__foot">
      <span>cron-kit-vue · MIT License</span>
      <span>零运行时依赖，样式自动注入</span>
    </footer>
  </div>
</template>
