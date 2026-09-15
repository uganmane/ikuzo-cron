/**
 * 已发布包的真实可用性检查。
 *
 * 由 scripts/verify-published.mjs 复制到临时目录后执行 —— 必须跑在临时目录里，
 * 否则裸模块名会解析到工作区的本地包，就验不出「线上装下来的到底能不能用」了。
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const pass = [];
const fail = [];

const check = (name, fn) => {
  try {
    const detail = fn();
    pass.push(detail ? `${name} —— ${detail}` : name);
  } catch (error) {
    fail.push(`${name} —— ${error.message}`);
  }
};

const QUARTZ = '0 0 9 ? * MON-FRI *';
const pkgDir = (name) => resolve('node_modules', name);

// —————————— 1. CJS 入口 ——————————
let coreCjs;
check('cron-kit-core 的 CJS 入口可 require', () => {
  coreCjs = require('cron-kit-core');
  const keys = Object.keys(coreCjs);
  if (!keys.includes('parseExpression')) throw new Error('缺少 parseExpression 导出');
  return `${keys.length} 个导出`;
});

check('CJS 下 parseExpression 正确', () => {
  const result = coreCjs.parseExpression(QUARTZ, 'quartz');
  if (!result.valid) throw new Error(`解析失败：${JSON.stringify(result.issues)}`);
  return '可用';
});

check('cron-kit-react 的 CJS 入口可 require', () => {
  const mod = require('cron-kit-react');
  if (typeof mod.CronPanel !== 'function') throw new Error('CronPanel 不是组件');
  return `${Object.keys(mod).length} 个导出`;
});

check('cron-kit-vue 的 CJS 入口可 require', () => {
  const mod = require('cron-kit-vue');
  if (!mod.CronPanel) throw new Error('CronPanel 缺失');
  return `${Object.keys(mod).length} 个导出`;
});

// —————————— 2. ESM 入口 ——————————
const core = await import('cron-kit-core');
check('cron-kit-core 的 ESM 入口可 import', () => `${Object.keys(core).length} 个导出`);

check('四个语法全部可解析', () => {
  const samples = {
    quartz: '0 0 9 ? * MON-FRI *',
    spring: '0 0 9 ? * MON-FRI',
    linux: '0 9 * * 1-5',
    node: '0 0 9 * * 1-5',
  };
  for (const [syntax, sample] of Object.entries(samples)) {
    const result = core.parseExpression(sample, syntax);
    if (!result.valid) {
      throw new Error(`${syntax} 解析失败（${sample}）：${JSON.stringify(result.issues)}`);
    }
  }
  return 'quartz / spring / linux / node';
});

check('自然语言描述正确', () => {
  const { summary } = core.describeExpression(QUARTZ, 'quartz');
  if (!summary.includes('09:00')) throw new Error(`描述不符：${summary}`);
  return summary;
});

check('最近运行时间可用且时区正确', () => {
  const runs = core.getNextRunTimes(QUARTZ, {
    syntax: 'quartz',
    count: 3,
    timeZone: 'Asia/Shanghai',
  });
  if (runs.length !== 3) throw new Error(`期望 3 条，得到 ${runs.length}`);
  if (!runs.every((item) => item.date instanceof Date)) throw new Error('date 不是 Date 实例');
  return `${runs[0].text} 起`;
});

check('表达式 ↔ 配置 双向互转无损（比对运行时间）', () => {
  const cases = [
    ['quartz', '0 0 9 ? * MON-FRI *'],
    ['quartz', '0 15 10 ? * 6L *'],
    ['spring', '0 0 9 ? * MON-FRI'],
    ['linux', '*/15 9-17 * * 1-5'],
    ['node', '0 0 9 * * 1-5'],
  ];
  const done = [];
  for (const [syntax, expr] of cases) {
    const { rules } = core.parseExpression(expr, syntax);
    const fields = {};
    for (const [key, rule] of Object.entries(rules)) {
      if (rule) fields[key] = core.ruleToFieldValue(rule, syntax);
    }
    const rebuilt = core.buildExpression({ syntax, fields }, 'day');

    const before = core.getNextRunTimes(expr, { syntax, count: 3, timeZone: 'Asia/Shanghai' });
    const after = core.getNextRunTimes(rebuilt, { syntax, count: 3, timeZone: 'Asia/Shanghai' });
    const a = before.map((item) => item.text).join('|');
    const b = after.map((item) => item.text).join('|');
    if (!a || a !== b) {
      throw new Error(
        `${syntax} 回构后运行时间不一致\n    ${expr} → ${rebuilt}\n    原: ${a}\n    新: ${b}`,
      );
    }
    done.push(`${expr} → ${rebuilt}`);
  }
  return `${done.length} 组运行时间完全一致`;
});

// —————————— 3. 类型声明与样式 ——————————
for (const [name, extra] of [
  ['cron-kit-core', ['dist/index.d.ts', 'dist/styles.css']],
  ['cron-kit-react', ['dist/index.d.ts', 'dist/style.css']],
  ['cron-kit-vue', ['dist/index.d.ts', 'dist/style.css']],
]) {
  for (const file of extra) {
    check(`${name}/${file} 已随包发布`, () => {
      const target = resolve(pkgDir(name), file);
      if (!existsSync(target)) throw new Error('文件不存在');
      return `${(readFileSync(target).length / 1024).toFixed(1)}kB`;
    });
  }
}

check('包的 exports 字段声明完整', () => {
  const meta = JSON.parse(readFileSync(resolve(pkgDir('cron-kit-core'), 'package.json'), 'utf8'));
  const keys = Object.keys(meta.exports ?? {});
  if (!keys.includes('.') || !keys.includes('./styles.css')) {
    throw new Error(`exports 不完整：${keys.join(',')}`);
  }
  return keys.join(' ');
});

// —————————— 4. 两端真实 SSR 渲染 ——————————
const { createElement } = await import('react');
const { renderToString } = await import('react-dom/server');
const reactMod = await import('cron-kit-react');

check('React 端 CronPanel 服务端渲染', () => {
  const html = renderToString(
    createElement(reactMod.CronPanel, { value: QUARTZ, timeZone: 'Asia/Shanghai' }),
  );
  if (!html.includes('ck-root')) throw new Error('缺少 ck-root');
  if (!html.includes('ck-runs__item')) throw new Error('未渲染运行时间');
  return `${html.length} 字节`;
});

check('React 端 CronInput（表单弹窗形态）可渲染', () => {
  const html = renderToString(createElement(reactMod.CronInput, { defaultValue: QUARTZ }));
  if (!html.includes('ck-trigger')) throw new Error('缺少触发器结构');
  return '触发器正常';
});

const { createSSRApp, h } = await import('vue');
const { renderToString: renderVue } = await import('@vue/server-renderer');
const vueMod = await import('cron-kit-vue');

const vueHtml = await renderVue(
  createSSRApp({
    render: () => h(vueMod.CronPanel, { modelValue: QUARTZ, timeZone: 'Asia/Shanghai' }),
  }),
);
check('Vue 端 CronPanel 服务端渲染', () => {
  if (!vueHtml.includes('ck-root')) throw new Error('缺少 ck-root');
  if (!vueHtml.includes('ck-runs__item')) throw new Error('未渲染运行时间');
  return `${vueHtml.length} 字节`;
});

check('两端的运行时间列表一致', () => {
  const pick = (html) => [...html.matchAll(/ck-runs__time[^>]*>([^<]+)</g)].map((m) => m[1].trim());
  const reactHtml = renderToString(
    createElement(reactMod.CronPanel, { value: QUARTZ, timeZone: 'Asia/Shanghai' }),
  );
  const a = pick(reactHtml);
  const b = pick(vueHtml);
  if (!a.length || !b.length) throw new Error(`两侧列表为空（react=${a.length}, vue=${b.length}）`);
  if (a.join('|') !== b.join('|')) {
    throw new Error(`不一致：\n  react=${a.join(', ')}\n  vue  =${b.join(', ')}`);
  }
  return `${a.length} 条完全相同`;
});

// —————————— 汇总 ——————————
console.log('\n通过：');
for (const item of pass) console.log(`  ✓ ${item}`);
if (fail.length) {
  console.log('\n失败：');
  for (const item of fail) console.log(`  ✗ ${item}`);
}
console.log(`\n结果：${pass.length} 通过 / ${fail.length} 失败`);
process.exit(fail.length ? 1 : 0);
