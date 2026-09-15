# cron-kit-core

零依赖的 Cron 表达式引擎。解析、校验、自然语言描述、可视化配置互转、时区感知的最近运行时间计算。

支持 **Quartz / Spring / Linux crontab / Node cron** 四种语法。可单独使用，也可以作为 [`cron-kit-react`](https://www.npmjs.com/package/cron-kit-react) / [`cron-kit-vue`](https://www.npmjs.com/package/cron-kit-vue) 的底层引擎。

## 安装

```bash
npm i cron-kit-core
```

无任何运行时依赖，可在浏览器、Node、边缘运行时使用。

## 快速上手

```ts
import { parseExpression, describeExpression, getNextRunTimes } from 'cron-kit-core';

const expression = '0 0 9 ? * MON-FRI *';

const parsed = parseExpression(expression, 'quartz');
parsed.valid;          // true
parsed.issues;         // []
parsed.normalized;     // 规范化后的表达式
parsed.rules.hour;     // { key: 'hour', raw: '9', every: false, any: false, values: [9], specials: [], restricted: true }

describeExpression(expression, 'quartz').summary;
// '每周一至周五 09:00:00 执行'

getNextRunTimes(expression, { syntax: 'quartz', count: 3, timeZone: 'Asia/Shanghai' });
// [
//   { date: Date, timestamp: 1789520400000, text: '2026-09-16 09:00:00', weekday: '周三', offset: 'UTC+08:00' },
//   ...
// ]
```

## 支持的语法

| 语法 | `syntax` | 字段数 | 顺序 | 示例 |
| --- | --- | --- | --- | --- |
| Quartz | `quartz` | 7 | second minute hour day month week year | `0 0 9 ? * MON-FRI *` |
| Spring | `spring` | 6 | second minute hour day month week | `0 0 9 ? * 1-5` |
| Linux crontab | `linux` | 5 | minute hour day month week | `0 9 * * 1-5` |
| Node cron | `node` | 6 | second minute hour day month week | `0 0 9 * * 1-5` |

Quartz 与 Node 的表达式允许省略末尾字段，`splitFields` / `parseExpression` 会自动补齐。

## API

### 解析与校验

| 函数 | 说明 |
| --- | --- |
| `parseExpression(expression, syntax?)` | 解析为 `ParseResult`（`valid` / `issues` / `rules` / `normalized`） |
| `validateExpression(expression, syntax?)` | 返回 `{ valid, issues, message }`，`message` 是第一条错误文案 |
| `parseField(raw, key, syntax?)` | 解析单个字段，返回 `{ rule, issues }`。注意参数顺序是**原始文本在前、字段名在后** |
| `splitFields(expression)` | 按空白切分表达式为字段数组。只做切分，不补位（补位由 `parseExpression` 负责） |
| `expressionToConfig(expression, syntax?)` | 表达式 → `{ config, valid, issues }`。注意 `config` 里装的是逐字段 **`FieldRule`**，**不是** `buildExpression` 直接可用的 `CronConfig`，中间需要 `ruleToFieldValue()` 转换（见下方互转说明） |

```ts
interface ParseResult {
  expression: string;
  syntax: CronSyntax;
  valid: boolean;
  issues: CronIssue[];
  rules: Partial<Record<FieldKey, FieldRule>>;  // 解析成功时的逐字段规则
  normalized: string;                           // 字段补全、大小写统一后的表达式
}
```

### 生成

| 函数 | 说明 |
| --- | --- |
| `buildExpression(config, prefer?)` | 可视化配置 → 表达式。`prefer` 决定日/周冲突时以谁为准，默认 `'day'` |
| `buildField(key, value, syntax)` | 单个字段 → 字符串 |
| `normalizeConfig(config, prefer?)` | 处理日与周的互斥、补全缺省，返回合规配置 |
| `ruleToFieldValue(rule, syntax)` | `FieldRule` → 编辑器用的 `FieldValue`（含 DOW 归一化） |
| `formatFieldValue(value, key, syntax)` | 单个数值 → 该字段的字符串写法（周字段按语法输出 `1-7` 或 `0-6`） |

**表达式 ↔ 表单 互转**。中间那步 `ruleToFieldValue()` 不能省：

```ts
import { parseExpression, ruleToFieldValue, buildExpression } from 'cron-kit-core';

// ① 解析出逐字段规则
const { rules } = parseExpression('0 0 9 ? * MON-FRI *', 'quartz');

// ② 规则 → 编辑器用的字段值
const fields = {};
for (const [key, rule] of Object.entries(rules)) {
  if (rule) fields[key] = ruleToFieldValue(rule, 'quartz');
}

// ③ 字段值 → 表达式（prefer 决定日与周冲突时以谁为准）
const rebuilt = buildExpression({ syntax: 'quartz', fields }, 'day');
// '0 0 9 ? * MON-FRI *'
```

⚠️ **`expressionToConfig()` 返回的 `config` 是 `FieldRule`，不能直接喂给 `buildExpression()`** —— 后者要的是 `FieldValue`。少写第 ② 步会**静默失败**：字段全部退化成默认值，构建出 `* * * ? * * *` 这种结果，且**不抛任何错误**。组件内部的反解析（`CronBuilder` 的 rehydrate）走的正是上面这三步。

### 描述

| 函数 | 说明 |
| --- | --- |
| `describeExpression(expression, syntax?, locale?)` | `{ summary, segments }`，`locale` 支持 `zh-CN` / `en-US` |
| `describeRule(rule, syntax?, locale?)` | 单字段的 `FieldRule` → 说明文本 |

### 运行时间

| 函数 | 说明 |
| --- | --- |
| `getNextRunTimes(expression, options)` | 最近 N 次运行时间，`options` = `{ syntax, count, from, timeZone }` |
| `getNextRunTime(expression, options)` | 只有下一次 |
| `getNextRunDates(expression, options)` | 只要 `Date[]` |
| `willEverRun(expression, options)` | 判断该表达式是否还会有下一次执行（如 `0 0 0 30 2 *` 这类永远不成立的日期） |

`count` 会被夹在 `1..100`；表达式非法时返回空数组；`timeZone` 非法会抛出 `无效的时区：xxx`。

时区计算基于 `Intl.DateTimeFormat`，按目标时区的墙上时钟推进，夏令时处理是显式的：

- 春季向前跳变导致某时刻不存在（如 `America/New_York` 的 `0 30 2 * * ?`）→ 跳过该小时，不会死循环
- 秋季向后回拨导致时刻重复 → 只触发一次，不重复执行

### 编辑器元信息

给自研 UI 用的一组工具，`cron-kit-react` / `cron-kit-vue` 的字段编辑器就是基于它们实现的。

| 函数 | 说明 |
| --- | --- |
| `getModeOptions(key, syntax?)` | 该字段可用的配置方式，返回 `{ mode, label, labelEn }[]`。基础四个模式为每秒/范围/周期/指定 |
| `getValueOptions(key, syntax?, locale?)` | 该字段的可选值，返回 `{ value, label, labelEn }[]`（周字段 `value` 为 0=周日 … 6=周六） |
| `createFieldValue(mode, key, syntax?)` | 按模式创建默认字段值 |
| `previewField(key, value, syntax?)` | 预览字段的最终字符串 |
| `getExpressionTokens(expression, syntax?, locale?)` | 把表达式拆成与字段一一对应的 token（`{ key, label, value }[]`），用于逐字段标注与高亮；字段数与语法不匹配时返回 `[]` |
| `stringifyValueList(values, key, syntax?)` / `parseValueListText(text, key, syntax?)` | 值列表与输入框文本互转 |
| `getFieldLabel(key, locale?)` | 字段短标签，如「秒」 |

```ts
interface FieldValue {
  mode: FieldMode;   // every | any | specific | range | interval | last
                     // | lastWeekday | nearestWeekday | lastOfWeek | nthWeekday | raw
  from?: number;     // specific 的单值 / range 与 interval 的起点 / nearestWeekday 的日期
  to?: number;       // range 的终点
  step?: number;     // interval 的步长
  list?: number[];   // specific 的值列表
  offset?: number;   // last 的倒推天数：L-2 → 2
  nth?: number;      // nthWeekday 的序号：MON#2 → 2
  raw?: string;      // mode 为 raw 时直接写入的文本
}
```

### 元数据

```ts
import { CRON_SYNTAXES, SYNTAX_SPECS, SPECIAL_CHARS, COMMON_TIME_ZONES, getTemplates } from 'cron-kit-core';

CRON_SYNTAXES;                 // ['quartz', 'spring', 'linux', 'node']
SYNTAX_SPECS.quartz.fieldCount; // 7
SPECIAL_CHARS;                 // * ? , - / L W # 的说明与适用语法
COMMON_TIME_ZONES;             // { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+08:00)' }[]
getTemplates('quartz');        // 该语法可用的模板（跨语法模板会自动过滤）
```

## 特殊字符

`*` `?` `,` `-` `/` `L` `W` `#`，以及 `JAN`–`DEC`、`SUN`–`SAT` 别名。差异按各语法规范处理，例如：

- `?` 用于 Quartz / Spring 的日周互斥
- `L` / `W` / `#` 只在支持它们的语法下有效
- 周字段 Quartz 用 `1=周日 … 7=周六`，其余语法用 `0=周日 … 6=周六`，由 `normalizeDow` / `denormalizeDow` 统一

`SPECIAL_CHARS` 里每一项都带 `syntaxes` 字段，UI 可据此只展示当前语法支持的字符。

## 样式

本包同时导出一份共享样式（供两个 UI 包使用），与引擎逻辑无关：

```ts
import 'cron-kit-core/styles.css';              // 直接引 CSS
import { ensureCronKitStyles } from 'cron-kit-core/styles';  // 运行时注入
```

## License

MIT
