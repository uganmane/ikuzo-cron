# cron-kit

Cron 表达式可视化组件库。**Vue 3 + React 双端**，**零运行时依赖**，可直接嵌进表单弹窗，配置完回传表达式字符串。

对标 [cron.ciding.cc](https://cron.ciding.cc/) 的完整体验：可视化配置、表达式互转、自然语言描述、最近运行时间、时区、模板与特殊字符说明。

## 包结构

| 包 | 说明 | 运行时依赖 |
| --- | --- | --- |
| [`cron-kit-core`](./packages/core) | 零依赖表达式引擎：解析、校验、描述、运行时间计算 | 无 |
| [`cron-kit-react`](./packages/react) | React 组件（React 17/18/19） | 无（`react` 为 peer） |
| [`cron-kit-vue`](./packages/vue) | Vue 3 组件 | 无（`vue` 为 peer） |

三个包各自独立发布，互不强绑。只用核心引擎也可以，只装一个 UI 包也可以。

## 特性

- **四种语法**：Quartz、Spring、Linux crontab、Node cron，字段数量与语义各按官方规范处理。**语法切换是可选项** —— 关掉 `showSyntaxSwitch` 即可固定在某个运行环境，或用 `syntaxes` 限定只允许哪几种
- **可视化配置**：每个字段都有「每秒 / 范围 / 周期 / 指定」四个基础模式（日、周、月另加「最后一天 / 最后一个工作日 / 最近的工作日 / 第几个星期几」），切换语法时自动适配
- **「指定」直接列出可选值**：秒、分、时、日、月、周、年的候选值全部铺成可点选栅格，选中的值实时汇总成一句话；值多的字段（如 0-59 秒）限高滚动，不撑破布局
- **表达式逐字段高亮**：顶部表达式栏按字段拆成 token 并标注字段名（`0`秒 `0`分 `9`时 …），当前正在配置的字段高亮；点任意 token 可直接跳到该字段
- **双向互转**：`表达式 → 表单`（反解析回填）与 `表单 → 表达式`，任何合法表达式都能被拆回可视化状态
- **自然语言描述**：中文 / 英文秒级描述，如 `0 0 9 ? * MON-FRI *` → `每周一至周五 09:00:00 执行`
- **时区感知的运行时间**：基于 `Intl` 做墙上时钟换算，正确处理夏令时跳变（春季跳过不存在的时刻、秋季不重复触发）
- **表单友好**：`onChange` 第一个参数就是表达式字符串，可直接对接 `Form.Item` / `el-form-item`；`CronInput` 提供「输入框 + 弹窗配置」的完整形态
- **零依赖 + 样式自动注入**：不引入 dayjs/antd/element，样式用 `ck-` 前缀隔离，不污染宿主页面
- **子组件可单独用**：每个子组件自带 `ck-root` 与主题，按需引入时样式同样完整
- **暗色主题**：`light` / `dark` / `auto` 三态

## 安装

```bash
# React
npm i cron-kit-react

# Vue 3
npm i cron-kit-vue

# 只用引擎
npm i cron-kit-core
```

## 快速上手

### React —— 嵌进表单弹窗

```tsx
import { Form, Input, Button } from 'antd';
import { CronInput } from 'cron-kit-react';

export default function Demo() {
  const [form] = Form.useForm();

  return (
    <Form form={form} onFinish={(v) => console.log(v.cron)}>
      {/* onChange 的第一个参数就是表达式，Form.Item 可直接受控 */}
      <Form.Item name="cron" label="执行时间" rules={[{ required: true, message: '请配置执行时间' }]}>
        <CronInput />
      </Form.Item>

      <Button htmlType="submit">提交</Button>
    </Form>
  );
}
```

点「配置」打开弹窗，确认后把表达式写回输入框与表单。想边改边同步（弹窗内实时回传）就传 `applyMode="live"`。

不用弹窗、只想自己控制面板，用 `CronPanel`：

```tsx
import { useState } from 'react';
import { CronPanel } from 'cron-kit-react';

const [cron, setCron] = useState('0 0 9 ? * MON-FRI *');

<CronPanel value={cron} onChange={(expression) => setCron(expression)} />
```

### Vue 3 —— `v-model` 直接用

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CronInput } from 'cron-kit-vue';

const cron = ref('0 0 9 ? * MON-FRI *');
</script>

<template>
  <!-- v-model 绑表达式，配合 el-form-item 直接做校验 -->
  <el-form-item label="执行时间" prop="cron">
    <CronInput v-model="cron" />
  </el-form-item>
</template>
```

`CronInput` 内部用 `Teleport` 挂到 `body`，不受父容器 `overflow: hidden` 影响。

### 只用引擎

```ts
import { parseExpression, describeExpression, getNextRunTimes } from 'cron-kit-core';

const expression = '0 0 9 ? * MON-FRI *';

parseExpression(expression, 'quartz');
// { expression, syntax, valid: true, issues: [], rules: { second: {...}, ... }, normalized }

describeExpression(expression, 'quartz');
// { expression, syntax, valid: true, issues: [], summary: '每周一至周五 09:00:00 执行', segments: [...] }

getNextRunTimes(expression, { syntax: 'quartz', count: 3, timeZone: 'Asia/Shanghai' });
// [{ date: Date, timestamp, text: '2026-09-16 09:00:00', weekday: '周三', offset: 'UTC+08:00' }, ...]
```

## 组件一览

两套包组件同名同义，仅受控方式不同（React `value`/`onChange`，Vue `v-model`）。

| 组件 | 用途 |
| --- | --- |
| `CronInput` | 表单触发器：输入框 + `配置`按钮 + 弹窗，回传表达式 |
| `CronModal` | 通用弹窗容器，Esc / 遮罩关闭、body 滚动锁 |
| `CronPanel` | 一站式面板：语法切换、时区、可视化配置、表达式、模板、字段说明、运行时间 |
| `CronBuilder` | 纯可视化字段编辑器，可 `tabs` / `stack` 两种布局 |
| `CronExpression` | 表达式输入框 + 实时校验 + 摘要 |
| `CronNextRuns` | 最近 N 次运行时间列表 |
| `CronExplain` | 逐字段说明 + 特殊字符词典 |
| `CronTemplates` | 常用模板，按语法自动过滤 |

`CronBuilder` 的当前字段是受控的（`activeField` / `onActiveFieldChange`，Vue 为 `v-model:active-field`），
把它的值接到 `CronPanel` 的表达式栏就能实现「配置哪个字段就高亮哪一段」。`CronPanel` 内部已经这么做了。

## 支持的语法

| 语法 | `syntax` | 字段数 | 示例 |
| --- | --- | --- | --- |
| Quartz | `quartz` | 7（秒 分 时 日 月 周 年） | `0 0 9 ? * MON-FRI *` |
| Spring | `spring` | 6（秒 分 时 日 月 周） | `0 0 9 ? * 1-5` |
| Linux crontab | `linux` | 5（分 时 日 月 周） | `0 9 * * 1-5` |
| Node cron | `node` | 6（秒 分 时 日 月 周） | `0 0 9 * * 1-5` |

日与周在 Quartz / Spring 下是互斥的（一个必须为 `?`），库会自动处理并在冲突时给出提示。

支持的特殊字符：`*` `?` `,` `-` `/` `L` `W` `#`，以及 `JAN`–`DEC`、`SUN`–`SAT` 别名。各语法差异（比如 `L` 只在 Quartz/Spring 有意义、`W` 只在 Quartz 有意义）会在字段说明里标注。

## 样式

样式随组件自动注入（幂等，只注入一次），一般不用管。需要覆盖或做 SSR 时：

```ts
import { ensureCronKitStyles, removeCronKitStyles } from 'cron-kit-react'; // 或 cron-kit-vue
```

或直接引 CSS 文件：

```ts
import 'cron-kit-react/style.css';
// import 'cron-kit-core/styles.css';
```

所有类名带 `ck-` 前缀；主题变量集中在 `.ck-root` 上，覆盖 CSS 变量即可换肤。

## 常见问题

**表单里怎么拿到表达式？**

React 用 `CronInput` 的 `onChange` 第一个参数；Vue 用 `v-model`。两者的值都是纯字符串，不需要任何适配层。

**只想支持一种语法（比如后端跑 Quartz）？**

```tsx
<CronPanel syntaxes={['quartz']} showSyntaxSwitch={false} />
```

`syntaxes` 限定切换里出现哪几种，`showSyntaxSwitch` 直接关掉整个切换器。

**要嵌进自己的弹窗（antd `Modal` / `el-dialog`）里怎么办？**

不必用 `CronInput`（它自带弹窗），直接用 `CronPanel` 加 `flat` 去掉外框和内边距即可：

```tsx
<Modal open={open} onOk={submit}>
  <CronPanel value={draft} onChange={setDraft} flat title={null} />
</Modal>
```

**表达式非法时会怎样？**

`onChange` 照常触发，但 `info.valid` 为 `false`、`info.issues` 里是中文错误文案、`info.nextRuns` 为空数组。`CronInput` / `CronExpression` 会把输入框标红并在下方显示第一条错误；`CronPanel` 的表达式栏会显示错误样式。

**最近运行时间和本机对不上？**

时间按 `timeZone` 算，默认跟随系统。显式传一个就不会有歧义：

```tsx
<CronNextRuns value={cron} timeZone="Asia/Shanghai" count={5} />
```

**SSR 下样式怎么办？**

样式是运行时注入的，而 `ensureCronKitStyles()` 在无 `document` 时会安静跳过（不会报错）。所以 SSR 时应由构建管线引一次 CSS，让样式进入你的产物：

```ts
import 'cron-kit-react/style.css';
```

**能换肤吗？**

主题变量共 25 个。亮色定义在 `.ck-root` 上，暗色定义在 `.ck-root[data-ck-theme='dark']` 上，`auto` 则交给 `prefers-color-scheme` 媒体查询。覆盖同名变量即可：

```css
.ck-root {
  --ck-primary: #722ed1;      /* 主色，用于高亮、选中、按钮 */
  --ck-radius: 8px;           /* 圆角 */
  --ck-gap: 12px;             /* 间距基准 */
  --ck-font: system-ui, sans-serif;
}
```

注意暗色是**更高优先级**的选择器：只写 `.ck-root { ... }` 在 `theme="dark"` 时不生效，两种主题都要改就一起写：

```css
.ck-root,
.ck-root[data-ck-theme='dark'] {
  --ck-primary: #722ed1;
}
```

变量分五组：颜色（`--ck-primary` / `--ck-success` / `--ck-danger` / `--ck-warning` 及各自的 `-soft`、`-hover`、`-ring` 变体）、背景（`--ck-bg` / `--ck-bg-subtle` / `--ck-bg-hover` / `--ck-bg-elevated`）、文字（`--ck-text` / `--ck-text-muted` / `--ck-text-faint`）、边框与阴影（`--ck-border` / `--ck-border-strong` / `--ck-shadow` / `--ck-shadow-lg`）、排版（`--ck-font` / `--ck-mono` / `--ck-gap` / `--ck-radius` / `--ck-radius-sm`）。

**运行时要求？**

Node `>=18`（用到 `Intl.DateTimeFormat` 的时区能力，浏览器端无额外要求）。React `>=17`、Vue `>=3.2`。

## 本地开发

```bash
npm install
npm run build          # 构建 core → react → vue
npm run typecheck      # 三个包类型检查
npm run test           # 核心引擎 53 项 + 组件 SSR 冒烟 22 项（共 75 项）
npm run test:core      # 只跑核心引擎
npm run test:ui        # 只跑组件服务端渲染冒烟
npm run dev:react      # React playground，http://localhost:5180
npm run dev:vue        # Vue playground，http://localhost:5181
npm run demo           # 构建两个 playground 并产出单文件 demo.html
npm run check:docs     # 校验文档：表格列数、包名、相对链接
npm run verify         # build + typecheck + test + check:docs 一把梭
```

`playground/` 下的两个演示站覆盖了面板、弹窗表单、各子组件与暗色主题。`npm run demo` 会把它们内联成 `playground/*/dist/demo.html`，单文件可直接双击打开或分享。

## 发布

见 [PUBLISHING.md](./PUBLISHING.md)。

## License

MIT
