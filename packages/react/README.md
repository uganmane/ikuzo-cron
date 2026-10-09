# cron-kit-react

React 版 Cron 表达式可视化组件。**零运行时依赖**，样式自动注入，可直接嵌进表单弹窗并回传表达式。

对标 [cron.ciding.cc](https://cron.ciding.cc/)：可视化配置、表达式互转、中文描述、最近运行时间、时区、模板、特殊字符说明。引擎在 [`cron-kit-core`](https://www.npmjs.com/package/cron-kit-core)。

## 安装

```bash
npm i cron-kit-react
```

`react` / `react-dom` 是 peer 依赖（`>=17`），不随包安装。

## 快速上手

### 嵌进表单弹窗（最常用）

`CronInput` = 输入框 + `配置`按钮 + 弹窗。`onChange` 的第一个参数就是表达式字符串，因此能直接对接 antd 的 `Form.Item`（rc-field-form 约定）。

```tsx
import { Form, Button, message } from 'antd';
import { CronInput } from 'cron-kit-react';

export default function Demo() {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      onFinish={(values) => message.success(`表达式：${values.cron}`)}
    >
      <Form.Item
        name="cron"
        label="执行时间"
        rules={[{ required: true, message: '请配置执行时间' }]}
      >
        <CronInput />
      </Form.Item>

      <Button type="primary" htmlType="submit">提交</Button>
    </Form>
  );
}
```

- 默认 `applyMode="confirm"`：弹窗里点「确定」才回传；
- 想边改边同步传 `applyMode="live"`；
- 不需要按钮、只想手写表达式传 `hideButton`；
- 不带 UI 库也能用，它只是普通的受控组件。

### 只用面板

```tsx
import { useState } from 'react';
import { CronPanel } from 'cron-kit-react';

export default function Demo() {
  const [cron, setCron] = useState('0 0 9 ? * MON-FRI *');

  return (
    <CronPanel
      value={cron}
      onChange={(expression, info) => setCron(expression)}
      timeZone="Asia/Shanghai"
      theme="light"
    />
  );
}
```

## 组件

| 组件 | 说明 |
| --- | --- |
| `CronInput` | 表单触发器：输入框 + `配置`按钮 + 弹窗 |
| `CronModal` | 弹窗容器，Esc / 遮罩关闭、body 滚动锁，`createPortal` 挂到 body |
| `CronPanel` | 一站式面板：语法切换、时区、可视化配置、表达式、模板、字段说明、运行时间 |
| `CronBuilder` | 纯可视化字段编辑器，`layout="tabs" \| "stack"` |
| `CronExpression` | 表达式输入框 + 实时校验 + 摘要 |
| `CronNextRuns` | 最近 N 次运行时间列表 |
| `CronExplain` | 逐字段说明 + 特殊字符词典 |
| `CronTemplates` | 常用模板，按当前语法自动过滤 |

## Props

### 受控 / 非受控

所有涉及表达式的组件都遵循同一套约定（`CronValueProps`）：

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `value` | `string` | 表达式，传入即为受控 |
| `defaultValue` | `string` | 非受控时的初始值 |
| `onChange` | `(expression: string, info: CronChangeInfo) => void` | 第一个参数是表达式，可直接接表单 |
| `onValidChange` | `(valid: boolean) => void` | 合法性变化 |

`CronChangeInfo`：

```ts
interface CronChangeInfo {
  expression: string;
  valid: boolean;
  issues: CronIssue[];
  summary: string;          // 自然语言描述
  nextRuns: NextRunItem[];
  syntax: CronSyntax;
  timeZone?: string;
}
```

### 通用（`CronBaseProps`）

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `syntax` | `'quartz' \| 'spring' \| 'linux' \| 'node'` | `quartz` | 语法，传入即受控 |
| `defaultSyntax` | 同上 | `quartz` | 非受控时的初始语法 |
| `onSyntaxChange` | `(syntax) => void` | — | 语法变化 |
| `timeZone` | `string` | 系统时区 | IANA 时区，传入即受控 |
| `defaultTimeZone` | `string` | 系统时区 | 非受控初始时区 |
| `onTimeZoneChange` | `(timeZone) => void` | — | 时区变化 |
| `locale` | `'zh-CN' \| 'en-US'` | `zh-CN` | 语言 |
| `theme` | `'light' \| 'dark' \| 'auto'` | `light` | 主题 |
| `nextRunsCount` | `number` | `5` | 计算并展示的运行时间条数 |
| `disabled` | `boolean` | `false` | 禁用交互 |
| `className` / `style` | — | — | 挂到根节点 |

### `CronInput` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `modalTitle` | `Cron 表达式配置` | 弹窗标题 |
| `modalWidth` | `920` | 弹窗宽度 |
| `zIndex` | `1000` | 弹窗层级 |
| `applyMode` | `'confirm'` | `confirm` 确认后回传；`live` 实时回传 |
| `placeholder` | 按语法生成 | 输入框占位 |
| `buttonText` | `配置` | 按钮文案 |
| `hideButton` | `false` | 隐藏按钮，只留手写输入 |
| `showSummary` | `true` | 输入框下方是否展示描述摘要 |
| `okText` / `cancelText` | `确定` / `取消` | 按钮文案 |

### `CronPanel` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `activeTab` / `defaultActiveTab` | `builder` | 当前标签页（`builder` \| `expression` \| `templates` \| `explain`） |
| `onTabChange` | — | 标签页变化 |
| `tabs` | 全部四个 | 要展示的标签页 |
| `showNextRuns` | `true` | 右侧运行时间栏 |
| `showHeader` | `true` | 顶部标题栏 |
| `title` | `Cron 表达式配置` | 标题，传 `null` 隐藏 |
| `showSyntaxSwitch` | `true` | 语法切换（可选项，关掉即固定当前语法） |
| `syntaxes` | 四种全给 | 限定语法切换里可选展示哪几种，如 `['quartz', 'linux']` |
| `showTimeZone` | `true` | 时区选择 |
| `showSummary` | `true` | 表达式下方常驻自然语言摘要 |
| `flat` | `false` | 去掉外框与内边距，便于嵌进弹窗 |
| `footer` | — | 底部自定义内容 |

### `CronBuilder` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `layout` | `'tabs'` | 字段编辑区显示方式：`tabs` 标签页 或 `stack` 全部平铺 |
| `activeField` | 首个字段 | 当前正在编辑的字段，传入即受控 |
| `defaultActiveField` | 首个字段 | 非受控时的初始字段 |
| `onActiveFieldChange` | — | 字段变化回调，可用于在表达式栏同步高亮 |

### `CronExpression` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `placeholder` | 按语法生成 | 输入框占位 |
| `showSuccessTip` | `false` | 合法时是否展示绿色的「表达式合法」 |
| `showSummary` | `true` | 输入框下方是否展示自然语言摘要 |
| `readOnly` | `false` | 只读，仅允许由外部（如 `CronBuilder`）改动 |
| `size` | `'md'` | 字体尺寸：`sm` / `md` / `lg` |

`CronExpression` 下方会常驻一行字段提示，如「共 7 个字段：秒 分 时 日 月 周 年」。

### `CronNextRuns` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `value` / `defaultValue` | — | 表达式 |
| `count` | `5` | 展示条数 |
| `title` | `最近运行时间` | 标题，传 `null` 隐藏 |

它是只读组件，没有 `onChange`；`timeZone` 会直接影响算出来的时间。

### `CronExplain` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `value` / `defaultValue` | — | 表达式 |
| `showLegend` | `true` | 是否展示特殊字符词典，词典按当前语法自动过滤 |

### `CronTemplates` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `value` / `defaultValue` | — | 表达式 |
| `onSelect` | — | 选中模板回调，参数为该语法下的表达式。不传则只更新自身 |

### `CronModal` 额外

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `open` | — | **必填**，是否打开 |
| `title` | `Cron 表达式配置` | 标题，传 `null` 隐藏标题栏 |
| `width` | `920` | 最大宽度 |
| `zIndex` | `1000` | 层级 |
| `maskClosable` | `true` | 点遮罩是否关闭 |
| `closable` | `true` | 是否显示右上角关闭按钮 |
| `showFooter` | `true` | 是否显示页脚 |
| `okText` / `cancelText` | `确定` / `取消` | 页脚文案 |
| `lockScroll` | `true` | 打开时锁定 `body` 滚动 |
| `onOk` / `onCancel` | — | 确认 / 取消回调 |
| `footer` | — | 完全自定义页脚，传了就覆盖默认按钮 |

弹窗内容通过 `createPortal` 挂到 `body`，不受父级 `overflow: hidden` 影响；Esc 与点遮罩都会触发 `onCancel`。

## 字段配置模式

每个字段的「指定」模式会把该字段的全部候选值铺成可点选栅格 —— 秒 / 分是 `0-59`，时是 `0-23`，日是 `1-31`，月带月份名，周带星期名，年是当前年份往后 10 年。选中的值会实时汇总（如「已选 3 个：0、15、30」），值多的字段限高滚动。

**支持鼠标滑动框选**：在某个数值上按住左键横向 / 纵向划过，划过的格子会跟着切换。起手那一格决定本次是「填入」还是「取消」——在未选中的格子上起手就是一路填入，在已选中的格子上起手就是一路取消，两种方向互不干扰，可以放心迭加多段。划过滚动区上下边缘时会自动滚动，方便一次框完 `0-59`；松手才把结果一次性提交给 `onChange`，不会划一格触发一次。键盘用户按 Enter / 空格仍可单个切换。

**下拉一律是自绘面板**：月 / 周的「范围」、第几个星期几、时区这几处的下拉都不使用原生 `<select>` —— 原生弹层由浏览器按系统配色绘制，暗色界面里会弹出一块纯白面板，而且圆角、悬停高亮、内边距都无法定制。改成自绘浮层后，配色跟随 `light` / `dark`，当前项带钩，支持键盘 ↑↓ 选择、Enter 确认、Esc 或点击外部关闭，下方空间不足时自动向上弹。时区下拉额外支持输入筛选（输入「上海」或 `Asia` 都能筛出来）。

以秒为例，四个基础模式是：

| 模式 | 生成 | 含义 |
| --- | --- | --- |
| 每秒 | `*` | 每秒执行 |
| 范围 | `10-30` | 10 到 30 秒之间 |
| 周期 | `*/15` | 从 0 开始每 15 秒（起点非 0 时为 `5/15` 这种写法） |
| 指定 | `0,15,30` | 只在选中的这些秒 |

日与周额外有「最后一天 / 最后一个工作日 / 最近的工作日 / 第几个星期几」，仅在该语法支持时才出现。

## 样式

样式随组件自动注入（幂等，整个页面只注入一次），一般不用管。

需要 SSR、想自己控制注入时机，或者要做覆盖：

```tsx
import { ensureCronKitStyles, removeCronKitStyles, CRON_KIT_CSS } from 'cron-kit-react';

ensureCronKitStyles();   // 手动注入
removeCronKitStyles();   // 移除
```

也可以直接引 CSS 文件：

```tsx
import 'cron-kit-react/style.css';
```

所有类名带 `ck-` 前缀，不会污染宿主页面。主题变量集中在 `.ck-root` / `.ck-root[data-ck-theme]` 上，覆盖 CSS 变量即可换肤。

## 支持的语法

| 语法 | `syntax` | 字段数 | 示例 |
| --- | --- | --- | --- |
| Quartz | `quartz` | 7（秒 分 时 日 月 周 年） | `0 0 9 ? * MON-FRI *` |
| Spring | `spring` | 6（秒 分 时 日 月 周） | `0 0 9 ? * 1-5` |
| Linux crontab | `linux` | 5（分 时 日 月 周） | `0 9 * * 1-5` |
| Node cron | `node` | 6（秒 分 时 日 月 周） | `0 0 9 * * 1-5` |

支持 `*` `?` `,` `-` `/` `L` `W` `#` 与 `JAN`–`DEC`、`SUN`–`SAT` 别名。

## TypeScript

包内自带类型声明，`CronSyntax` / `CronIssue` / `NextRunItem` 等核心类型会从 `cron-kit-core` 透出，无需重复安装。

## License

MIT
