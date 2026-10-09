/**
 * UI 组件冒烟测试。
 *
 * 在 Node 里对 React 与 Vue 两套组件各做一次服务端渲染，
 * 用来验证组件能正常挂载、派生数据正确、且不会抛错。
 * 运行前请先构建三个包：npm run build
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { createSSRApp, h as hVue } from 'vue';
import { renderToString as renderVueToString } from '@vue/server-renderer';

import * as R from 'cron-kit-react';
import * as V from 'cron-kit-vue';

const QUARTZ = '0 0 9 ? * MON-FRI *';

const renderReact = (element) => renderToString(element);
const renderVue = (component, props) =>
  renderVueToString(createSSRApp({ render: () => hVue(component, props) }));

/** 从渲染结果中取出运行时间文本 */
const extractRunTimes = (html) =>
  [...html.matchAll(/ck-runs__time">([^<]+)</g)].map((match) => match[1]);

/** 从渲染结果中取出描述摘要 */
const extractSummary = (html) => html.match(/ck-summary[\s\S]*?<span>([^<]+)<\/span>/)?.[1];

describe('cron-kit-react 服务端渲染', () => {
  it('CronPanel 渲染出逐字段表达式、描述与运行时间', () => {
    const html = renderReact(h(R.CronPanel, { value: QUARTZ, timeZone: 'Asia/Shanghai' }));
    assert.match(html, /ck-root/);
    // 表达式被拆成 7 个带字段名的 token
    assert.match(html, /ck-expr__tokens/);
    assert.equal((html.match(/ck-token__value/g) ?? []).length, 7);
    assert.match(html, /ck-token__label">秒</);
    assert.match(html, /ck-token__value">MON-FRI</);
    assert.match(html, /ck-token__label">年</);
    // 当前字段高亮
    assert.match(html, /ck-token is-active/);
    assert.match(html, /每周一至周五 09:00:00 执行/);
    assert.match(html, /最近运行时间/);
    assert.match(html, /ck-runs__item/);
  });

  it('CronBuilder 渲染出字段标签与配置项', () => {
    const html = renderReact(h(R.CronBuilder, { value: QUARTZ }));
    assert.match(html, /ck-field/);
    assert.match(html, /ck-seg__item/);
    assert.match(html, /ck-chip/);
  });

  it('CronExpression 展示校验与摘要', () => {
    const valid = renderReact(h(R.CronExpression, { value: QUARTZ }));
    assert.match(valid, /每周一至周五/);

    const invalid = renderReact(h(R.CronExpression, { value: '0 0 9 * * *' }));
    assert.match(invalid, /ck-alert--error/);
    assert.match(invalid, /必须有一个是/);
  });

  it('CronNextRuns 输出 5 条时间', () => {
    const html = renderReact(
      h(R.CronNextRuns, { value: QUARTZ, timeZone: 'Asia/Shanghai', count: 5 }),
    );
    assert.equal((html.match(/ck-runs__item/g) ?? []).length, 5);
  });

  it('CronExplain 展示逐字段说明与特殊字符', () => {
    const html = renderReact(h(R.CronExplain, { value: QUARTZ }));
    assert.match(html, /ck-explain__card/);
    assert.match(html, /特殊字符含义/);
    assert.match(html, /周一至周五/);
  });

  it('CronTemplates 列出模板并做语法过滤', () => {
    const quartz = renderReact(h(R.CronTemplates, { syntax: 'quartz' }));
    assert.match(quartz, /每月最后一个工作日/);

    const linux = renderReact(h(R.CronTemplates, { syntax: 'linux' }));
    assert.doesNotMatch(linux, /每月最后一个工作日/);
  });

  it('CronInput 渲染输入框与配置按钮，弹窗默认关闭', () => {
    const html = renderReact(h(R.CronInput, { value: QUARTZ }));
    assert.match(html, /ck-trigger__input/);
    assert.match(html, /配置/);
    assert.doesNotMatch(html, /ck-modal-mask/);
  });

  it('四种语法都能正常渲染', () => {
    for (const [syntax, expression] of [
      ['quartz', '0 0 9 ? * MON-FRI *'],
      ['spring', '0 0 9 ? * 1-5'],
      ['linux', '0 9 * * 1-5'],
      ['node', '0 0 9 * * 1-5'],
    ]) {
      const html = renderReact(h(R.CronPanel, { value: expression, syntax }));
      assert.match(html, /ck-runs__item/, `${syntax} 未产出运行时间`);
    }
  });
});

describe('cron-kit-vue 服务端渲染', () => {
  it('CronPanel 渲染出逐字段表达式、描述与运行时间', async () => {
    const html = await renderVue(V.CronPanel, { modelValue: QUARTZ, timeZone: 'Asia/Shanghai' });
    assert.match(html, /ck-root/);
    assert.match(html, /ck-expr__tokens/);
    assert.equal((html.match(/ck-token__value/g) ?? []).length, 7);
    assert.match(html, /ck-token__label">秒</);
    assert.match(html, /ck-token__value">MON-FRI</);
    assert.match(html, /ck-token__label">年</);
    assert.match(html, /ck-token is-active/);
    assert.match(html, /每周一至周五 09:00:00 执行/);
    assert.match(html, /最近运行时间/);
    assert.match(html, /ck-runs__item/);
  });

  it('CronBuilder 渲染出字段标签与配置项', async () => {
    const html = await renderVue(V.CronBuilder, { modelValue: QUARTZ });
    assert.match(html, /ck-field/);
    assert.match(html, /ck-seg__item/);
    assert.match(html, /ck-chip/);
  });

  it('CronExpression 展示校验与摘要', async () => {
    const valid = await renderVue(V.CronExpression, { modelValue: QUARTZ });
    assert.match(valid, /每周一至周五/);

    const invalid = await renderVue(V.CronExpression, { modelValue: '0 0 9 * * *' });
    assert.match(invalid, /ck-alert--error/);
    assert.match(invalid, /必须有一个是/);
  });

  it('CronNextRuns 输出 5 条时间', async () => {
    const html = await renderVue(V.CronNextRuns, {
      modelValue: QUARTZ,
      timeZone: 'Asia/Shanghai',
      count: 5,
    });
    assert.equal((html.match(/ck-runs__item/g) ?? []).length, 5);
  });

  it('CronExplain 展示逐字段说明与特殊字符', async () => {
    const html = await renderVue(V.CronExplain, { modelValue: QUARTZ });
    assert.match(html, /ck-explain__card/);
    assert.match(html, /特殊字符含义/);
    assert.match(html, /周一至周五/);
  });

  it('CronTemplates 列出模板并做语法过滤', async () => {
    const quartz = await renderVue(V.CronTemplates, { syntax: 'quartz' });
    assert.match(quartz, /每月最后一个工作日/);

    const linux = await renderVue(V.CronTemplates, { syntax: 'linux' });
    assert.doesNotMatch(linux, /每月最后一个工作日/);
  });

  it('CronInput 渲染输入框与配置按钮，弹窗默认关闭', async () => {
    const html = await renderVue(V.CronInput, { modelValue: QUARTZ });
    assert.match(html, /ck-trigger__input/);
    assert.match(html, /配置/);
    assert.doesNotMatch(html, /ck-modal-mask/);
  });

  it('四种语法都能正常渲染', async () => {
    for (const [syntax, expression] of [
      ['quartz', '0 0 9 ? * MON-FRI *'],
      ['spring', '0 0 9 ? * 1-5'],
      ['linux', '0 9 * * 1-5'],
      ['node', '0 0 9 * * 1-5'],
    ]) {
      const html = await renderVue(V.CronPanel, { modelValue: expression, syntax });
      assert.match(html, /ck-runs__item/, `${syntax} 未产出运行时间`);
    }
  });
});

describe('按需组合子组件', () => {
  // 所有 --ck-* 变量都定义在 .ck-root 上，子组件漏掉 ck-root 就会整体没样式
  it('React 每个独立子组件都自带 ck-root', () => {
    const cases = [
      ['CronBuilder', h(R.CronBuilder, { value: QUARTZ })],
      ['CronExpression', h(R.CronExpression, { value: QUARTZ })],
      ['CronNextRuns', h(R.CronNextRuns, { value: QUARTZ })],
      ['CronExplain', h(R.CronExplain, { value: QUARTZ })],
      ['CronTemplates', h(R.CronTemplates, { syntax: 'quartz' })],
    ];
    for (const [name, element] of cases) {
      assert.match(renderReact(element), /class="ck-root/, `${name} 缺少 ck-root`);
    }
  });

  it('Vue 每个独立子组件都自带 ck-root', async () => {
    const cases = [
      ['CronBuilder', V.CronBuilder, { modelValue: QUARTZ }],
      ['CronExpression', V.CronExpression, { modelValue: QUARTZ }],
      ['CronNextRuns', V.CronNextRuns, { modelValue: QUARTZ }],
      ['CronExplain', V.CronExplain, { modelValue: QUARTZ }],
      ['CronTemplates', V.CronTemplates, { syntax: 'quartz' }],
    ];
    for (const [name, component, props] of cases) {
      assert.match(await renderVue(component, props), /class="ck-root/, `${name} 缺少 ck-root`);
    }
  });

  it('四种基础模式的文案是「每秒 / 范围 / 周期 / 指定」', () => {
    const html = renderReact(h(R.CronBuilder, { value: QUARTZ }));
    for (const label of ['每秒', '范围', '周期', '指定']) {
      assert.match(html, new RegExp(`ck-chip[^>]*>${label}<`), `缺少「${label}」模式`);
    }
  });

  it('「指定」模式把可选值列出来，秒字段限高滚动', () => {
    const html = renderReact(h(R.CronBuilder, { value: '30 0 9 ? * MON-FRI *' }));
    // 秒字段处于「指定」模式，0-59 共 60 个可点选值（已选中的那个带 is-active）
    assert.match(html, /ck-grid--num/);
    assert.match(html, /ck-grid--scroll/);
    assert.equal((html.match(/ck-check/g) ?? []).length, 60);
    assert.match(html, /ck-check is-active[^>]*>30</);
    assert.match(html, /已选 1 个：30/);
  });

  it('「指定」栅格提示可拖拽框选，两端渲染一致', async () => {
    const expression = '30 0 9 ? * MON-FRI *';
    const reactHtml = renderReact(h(R.CronBuilder, { value: expression }));
    const vueHtml = await renderVue(V.CronBuilder, { modelValue: expression });

    const gridClasses = (html) => {
      const matched = html.match(/class="([^"]*\bck-grid\b[^"]*)"/);
      return [...new Set(matched[1].split(/\s+/))].sort();
    };
    // is-dragging 只在按住鼠标期间出现，服务端渲染不该带
    const expected = ['ck-grid', 'ck-grid--num', 'ck-grid--scroll'];
    assert.deepEqual(gridClasses(reactHtml), expected);
    assert.deepEqual(gridClasses(vueHtml), expected);

    // 选中态由同一份 displayList 推导，两端必须一致
    const activeCells = (html) =>
      [...html.matchAll(/ck-check is-active[^>]*>([^<]+)</g)].map((match) => match[1]);
    assert.deepEqual(activeCells(reactHtml), ['30']);
    assert.deepEqual(activeCells(vueHtml), activeCells(reactHtml));

    for (const html of [reactHtml, vueHtml]) {
      assert.match(html, /按住鼠标滑动可框选/, '提示里没有告诉用户可以拖拽框选');
    }
  });
});

describe('两套组件的一致性', () => {
  const samples = [
    ['quartz', '0 0 9 ? * MON-FRI *'],
    ['quartz', '0 0 0 L * ? *'],
    ['linux', '*/15 9-18 * * 1-5'],
    ['node', '0 30 2 * * *'],
    ['spring', '0 0 9 ? * 1-5'],
  ];

  it('同一表达式产出的运行时间完全一致', async () => {
    for (const [syntax, expression] of samples) {
      const reactHtml = renderReact(h(R.CronNextRuns, { value: expression, syntax }));
      const vueHtml = await renderVue(V.CronNextRuns, { modelValue: expression, syntax });

      const reactTimes = extractRunTimes(reactHtml);
      const vueTimes = extractRunTimes(vueHtml);

      assert.ok(reactTimes.length > 0, `${expression} 没有产出运行时间`);
      assert.deepEqual(vueTimes, reactTimes, `${syntax} ${expression}`);
    }
  });

  it('同一表达式产出的描述完全一致', async () => {
    for (const [syntax, expression] of [
      ['quartz', '0 0 9 ? * MON-FRI *'],
      ['quartz', '0 0/5 * * * ?'],
      ['linux', '0 9 * * 1-5'],
    ]) {
      const reactHtml = renderReact(h(R.CronExplain, { value: expression, syntax }));
      const vueHtml = await renderVue(V.CronExplain, { modelValue: expression, syntax });
      assert.equal(extractSummary(vueHtml), extractSummary(reactHtml), `${syntax} ${expression}`);
    }
  });
});
