# 发布指南

`cron-kit` 是一个 npm workspaces 单仓，三个包各自独立发布到 npm 官方源（公开、无 scope 前缀）。

| 包 | registry | 首次发布前 |
| --- | --- | --- |
| `cron-kit-core` | https://www.npmjs.com/package/cron-kit-core | 名称未被占用 |
| `cron-kit-react` | https://www.npmjs.com/package/cron-kit-react | 名称未被占用 |
| `cron-kit-vue` | https://www.npmjs.com/package/cron-kit-vue | 名称未被占用 |

> 三个包名当前在**官方源**（`registry.npmjs.org`）上均返回 404，可以注册。若已被占用，需要先改 `packages/*/package.json` 的 `name`，以及所有交叉引用的依赖名。

## ⚠️ 先看这条：registry 必须是官方源

国内机器上 `~/.npmrc` 常把 registry 设成镜像加速，例如：

```ini
registry=https://registry.npmmirror.com
```

**镜像只能下载、不能发布。** 在这种配置下直接 `npm publish` 会推到一个不接受写入的地址，最终以 404 / 403 收场，且报错信息不会直接告诉你「你用错源了」。

本仓的 `scripts/publish.mjs` 已经把 `--registry=https://registry.npmjs.org` 写死在命令里，不依赖全局配置。命令行的 `--registry` 优先级高于 `~/.npmrc`，所以不会改动你的全局设置。

但 **`npm login` 没有这层保护**，必须手动指定：

```bash
npm login --registry=https://registry.npmjs.org
```

## ⚠️ 第二条：发布强制要求 2FA

npm 已对**所有包**强制要求：创建与发布必须满足下列之一，否则 `npm publish` 一律返回 403，报错原文是：

```
Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

- 账号开启了 2FA，**或**
- 使用一个启用了 **Bypass 2FA** 的 granular access token（GAT）

这条是**新包的默认策略**，与账号当前是否设置过 2FA 无关——哪怕 `npm profile get` 显示 `two-factor auth: disabled`，也照样拦。

```bash
# 查看当前账号状态
npm profile get --registry=https://registry.npmjs.org
```

两条可行路径，二选一：

| 路径 | 操作 | 发布方式 |
| --- | --- | --- |
| **A. 开启 2FA**（npm 推荐） | npmjs.com → Account → Two-Factor Authentication → Enable，选 `Authorization and Writes`，用验证器 App 扫码 | `node scripts/publish.mjs --otp=123456`，或在自有终端交互式发布、让 npm 直接弹提示 |
| **B. GAT + Bypass 2FA** | npmjs.com → Access Tokens → Generate New Token → **Granular Access Token**，权限 `Read and write`，Packages 选 **All Packages**，勾上 **Bypass two-factor authentication** | token 写入项目级 `.npmrc` 后正常发布 |

**路径 A 的注意点**：务必保存 **recovery codes**。验证器与恢复码同时丢失会**永久锁死账号**，只能走 npm 支持找回。

**路径 B 的注意点**（每一条都是实际会绊住人的）：

- **必须勾选 `Bypass two-factor authentication`，它默认是【不勾】的。** 漏勾的后果最难排查：权限、范围、有效期全都对，`npm whoami` 也成功，但一发布就撞上
  `Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages`
  ——错误信息只字不提「你少勾了一个框」。**建好后务必自检**：

  ```bash
  npm token list --json --registry=https://registry.npmjs.org
  # 找到你那一枚，确认 "bypass_2fa": true
  ```

  该命令还能一并确认 `permissions`（应有 `package` + `write`）与 `scopes`（`name: null` 即 All Packages）。
- **Packages 必须显式点选 `All Packages`** —— 三个包名尚不存在，无法在下拉里单独勾选。这个单选按钮**默认看似已选、实际未选**，是报「Must select at least one package」的常见原因。
- **权限要选 Read and write（publish and stage）**，不要选 **stage only**。stage-only 的 token 跑 `npm publish` 会直接报 `E_STAGE_REQUIRED`，只能走 `npm stage publish` + 人工批准。
- **写权限 token 最长有效期 90 天**。它是一次性开包工具，**不要当永久凭据用**；npm 在 2026 年 5 月曾一次性作废全部 bypass-2FA 写 token。
- Bypass 2FA **在创建时决定、之后不可修改**，要改只能重建 token。
- 项目级 `.npmrc` 里是明文 token，**必须确保被 `.gitignore` 忽略**，绝不能提交（本仓已在 `.gitignore` 中加了 `.npmrc`）。

```ini
# .npmrc（项目根目录，需在 .gitignore 中）
registry=https://registry.npmjs.org
//registry.npmjs.org/:_authToken=<你的 token>
```

发布完成后清掉，避免 token 长期留在磁盘上：

```bash
npm config delete //registry.npmjs.org/:_authToken --location=project
```

> 自 2026 年 8 月起，bypass-2FA token **不再适用于账号身份与治理类操作**（改密码、改 2FA 设置、增删维护者等），这类操作必须交互式验证。**发布包不受此限**。

> **这条路有截止日期。** npm 已宣布**自 2027 年 1 月起**，granular access token 不能再直接发布新版本，必须改用 `npm stage publish` + 维护者批准，或改用 trusted publishing。
>
> 对本项目影响可控：三个包**首发**完成后，后续版本可以把发布切到 GitHub Actions 的 **trusted publishing（OIDC）**——不需要任何 token，也就绕开了 2FA 这件事。trusted publishing 只能配置在**已存在**的包上，所以「首次用 token 手工开包，之后交给 CI」正好是 npm 官方推荐的节奏。

另有一条不需要 2FA 的旁路：`npm stage publish` 可先把包推进暂存区，再由维护者在 npmjs.com 上审核发布。但**批准环节仍然需要 2FA**，所以它只适合 CI 提交、人工放行的流程，不能用来绕开这条政策。

## 前置准备

```bash
# 1. 登录官方源（必须带 --registry，否则会登进镜像源）
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org   # 应输出你的 npm 用户名

# 2. 安装依赖
npm install
```

发布前先确认已满足上文的 **2FA 要求**，否则必然 403。开了 2FA 的话，发布时加 `--otp=六位动态码`。

## 一、发布前验证

这三步全过再发，不要跳。

```bash
# 1. 全量校验：构建 + 类型检查 + 全部测试 + 文档自检
npm run verify

# 2. 彩排：校验构建产物、登录状态、版本占用、包清单，但不推送
npm run build
node scripts/publish.mjs --dry-run
```

彩排会打印每个包的实际文件清单。清单里必须能看到：

- `LICENSE`
- `README.md`（包详情页的正文）
- `package.json`
- `dist/` 下的 `.js` / `.cjs` / `.d.ts`（Vue 包还要有 `style.css`，core 还要有 `styles.css`）

`LICENSE` 由 npm 自动收录（不看 `files` 字段），`README.md` 必须在 `files` 里显式声明。

## 二、版本号

三个包版本保持一致，便于用户对号入座：

```bash
npm version patch --no-git-tag-version -w cron-kit-core
npm version patch --no-git-tag-version -w cron-kit-react
npm version patch --no-git-tag-version -w cron-kit-vue
```

`cron-kit-react` / `cron-kit-vue` 对 core 的依赖写的是 `^0.2.0`。⚠️ **`0.x` 下 caret 只锁到 minor**：`^0.1.0` 等于 `>=0.1.0 <0.2.0`，**不覆盖 `0.2.0`**。所以每次抬 minor 都必须同步把两个 UI 包的依赖范围改成 `^<新的 minor>`，否则用户装 `cron-kit-react@0.2.0` 会连带拉到旧版 core（甚至因为找不到匹配版本而失败）。已用 `npm version minor` 从 `0.1.0` 升到 `0.2.0`，依赖范围同步改成了 `^0.2.0`。

（仓库里的 `playground/*` 也是 workspace 依赖，同样要跟着抬 —— 范围不匹配时 npm 会跳过本地链接、改从 registry 装，那样调试的就不是本地代码了。）

npm 不允许覆盖已发布的版本号。如果 `scripts/publish.mjs` 报「已存在于官方源」，就是这个原因 —— 升版本号，不是重试。

## 三、发布

**顺序很重要：先 core，再 react / vue。** UI 包依赖 core，反过来的话用户装 UI 包可能拉不到对应版本的 core。脚本已把顺序固化，即使你把参数写反也会按正确顺序执行。

```bash
# 发全部三个（推荐）
npm run publish:all

# 或只发某几个
npm run publish:core          # 只发 core
npm run publish:ui            # 只发两个 UI 包
node scripts/publish.mjs core # 等效
```

脚本内部做六件事：检查 `dist` 产物是否齐全 → 检查登录状态 → **核对凭据能力**（读出 token 的 `bypass_2fa` 等真实属性，不合格就在推送前中止）→ 核对本地版本与远端（已占用则提前拦下）→ 按 core → react → vue 顺序发布 → 发布后回查线上版本。

手工发也可以，但**每条都要带 registry**：

```bash
npm publish -w cron-kit-core  --registry=https://registry.npmjs.org --access public
npm publish -w cron-kit-react --registry=https://registry.npmjs.org --access public
npm publish -w cron-kit-vue   --registry=https://registry.npmjs.org --access public
```

`--access public` 是必需的：包名不带 scope 时 npm 默认就是 public，但显式写上可以避免账号默认配置为私有包时发布失败。

## 四、发布后验收

发布成功不等于用户能用。**必须真实安装一次**：

```bash
npm run verify:published
```

它会新建干净的 `.tmp/published-check` 目录、从 registry 安装三个包（连同 `react` / `react-dom` / `vue`），然后跑 20 项检查：

| 类别 | 检查内容 |
| --- | --- |
| 双入口 | CJS `require` 与 ESM `import` 都能拿到完整导出（core 62 / react 11 / vue 13） |
| 功能 | 四语法解析、自然语言描述、时区化运行时间、**表达式 ↔ 配置 往返后运行时间逐条一致** |
| 打包 | `dist/index.d.ts`、`dist/styles.css`（UI 包为 `dist/style.css`）确实在包里，`exports` 字段完整 |
| 渲染 | 两端 SSR 渲染出 `ck-root` 与运行时间列表，且 **React 与 Vue 的结果逐条一致** |

**为什么不能在工作区里测**：工作区的 `node_modules` 是符号链接到本地 `packages/` 的，那样测等于测本地代码，验不出用户实际装到的东西。所以脚本另建目录、只装线上包。排查问题时可加 `--keep` 保留该目录。

若因 404 失败，通常只是 registry 索引延迟，等一两分钟重试。

必要时再手工确认版本已同步：

```bash
npm view cron-kit-core  version --registry=https://registry.npmjs.org
npm view cron-kit-react version --registry=https://registry.npmjs.org
npm view cron-kit-vue   version --registry=https://registry.npmjs.org
```

最后用 `playground/` 的两个 demo 各跑通一次，确认线上包行为与本地一致。

## 常见问题

**`npm publish` 报 404 Not Found**
→ 九成是 registry 指向了镜像源。检查 `npm config get registry`，并按上文加 `--registry=https://registry.npmjs.org`。

**`npm publish` 报 403，提示 `Two-factor authentication or granular access token with bypass 2fa enabled is required`**
→ 这是 npm 的强制策略，不是配置写错了。开启 2FA 后用 `--otp=六位动态码`，或改用勾了 **Bypass 2FA** 的 granular access token。
→ **如果你已经在用 granular token 却还报这句**，八成是创建时漏勾了 `Bypass two-factor authentication`（默认不勾）。别怀疑权限或包名，直接用这条命令看真实属性：

```bash
npm token list --json --registry=https://registry.npmjs.org
# "bypass_2fa" 必须为 true；同时确认 permissions 含 package/write、scopes 为 All Packages
```

→ 注意 **legacy / automation token 已不可用**（npm 自 2025-11 起只支持 granular access token）。
→ `scripts/publish.mjs` 已内置这项检查，会在推送前就中止并给出修法，不用等 403。

**`npm publish` 报 403 / need auth**
→ 先 `npm whoami --registry=https://registry.npmjs.org` 确认登录的是官方源。

**`cannot publish over existing version`**
→ 该版本号已被发布过，npm 不允许覆盖。升版本号后重发。

**包名已被占用**
→ 三个包名需同时可改；改名前要同步更新三处：`packages/*/package.json` 的 `name`、依赖方的 `dependencies`、以及三份 README 里的相互引用。

**发错了版本想撤回**
```bash
# 72 小时内可以彻底删除
npm unpublish cron-kit-core@0.1.1 --registry=https://registry.npmjs.org
# 超过 72 小时只能标记为废弃（推荐做法，已经装了的人还能装到）
npm deprecate cron-kit-core@0.1.1 "该版本有缺陷，请升级到 0.1.2"
```

> 注意 `npm unpublish` 会留下同名包名的 24 小时冷却期，这期间无法用同一个名字重新发布。首次发布前务必确认内容无误。

**只想试发布流程、不想真发**
→ `node scripts/publish.mjs --dry-run`。

**想发到内网私服**
→ 设环境变量覆盖默认源：`CRON_KIT_REGISTRY=https://your-registry/ node scripts/publish.mjs`。

## 发布检查清单

- [ ] 已满足 npm 的 2FA 要求（账号开启 2FA，或使用勾了 **Bypass 2FA** 的 granular access token）
- [ ] `npm run verify` 全绿（build + typecheck + 60 项核心测试 + 27 项组件测试 + 文档自检）
- [ ] `node scripts/publish.mjs --dry-run` 彩排通过，三个包清单里都有 `LICENSE` / `README.md` / `dist/`
- [ ] `npm whoami --registry=https://registry.npmjs.org` 能输出用户名（确认登的是官方源）
- [ ] 三个包的 `version` 已更新且一致，且该版本号在线上不存在
- [ ] 破坏性变更已同步上抬依赖范围
- [ ] 按 core → react / vue 的顺序发布
- [ ] `npm run verify:published` 全绿（真实安装后 20 项检查通过）
- [ ] 发布用的 token 已到 npm 后台吊销（Access Tokens 页面）
