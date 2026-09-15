#!/usr/bin/env node
/**
 * cron-kit 发布脚本。
 *
 * 为什么不用裸 `npm publish`：
 *  1. 本机 ~/.npmrc 的 registry 常被设成镜像源（如 npmmirror），而**镜像只能装不能发**。
 *     这里强制把 --registry 指到官方源，不依赖全局配置。
 *  2. 发布顺序必须是 core → react / vue，UI 包依赖 core，顺序反了用户可能拉不到对应版本。
 *  3. 版本号已存在时 npm 会报 403，这里提前查出来并给出人话提示。
 *
 * 用法：
 *   node scripts/publish.mjs                 # 发布全部三个包
 *   node scripts/publish.mjs core            # 只发 core
 *   node scripts/publish.mjs react vue       # 只发两个 UI 包
 *   node scripts/publish.mjs --dry-run       # 彩排：只校验，不推送
 *   node scripts/publish.mjs --otp=123456    # 带 2FA 动态码
 *   node scripts/publish.mjs --tag=next      # 发到指定 dist-tag
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = process.env.CRON_KIT_REGISTRY ?? 'https://registry.npmjs.org';
const IS_WIN = process.platform === 'win32';

/** 发布顺序即此数组顺序：core 必须先于 UI 包 */
const ORDER = ['core', 'react', 'vue'];
const SHORT_TO_NAME = {
  core: 'cron-kit-core',
  react: 'cron-kit-react',
  vue: 'cron-kit-vue',
};

// —————————————— 命令行参数 ——————————————
const argv = process.argv.slice(2);
const flags = argv.filter((item) => item.startsWith('-'));
const positional = argv.filter((item) => !item.startsWith('-'));

const dryRun = flags.includes('--dry-run');
const otp = flags.find((item) => item.startsWith('--otp='));
const tag = flags.find((item) => item.startsWith('--tag='));

const targets = positional.length ? positional.map((item) => item.replace(/^cron-kit-/, '')) : [...ORDER];

for (const item of targets) {
  if (!SHORT_TO_NAME[item]) {
    console.error(`未知的包名：${item}（可选：${ORDER.join(' / ')}）`);
    process.exit(2);
  }
}

// 保持 ORDER 的先后关系，即使用户把参数顺序写反了
const queue = ORDER.filter((item) => targets.includes(item));

// —————————————— 工具 ——————————————
function npm(args, { inherit = false } = {}) {
  return spawnSync('npm', args, {
    cwd: root,
    shell: IS_WIN,
    stdio: inherit ? 'inherit' : 'pipe',
    encoding: 'utf8',
  });
}

function npmOut(args) {
  const result = npm(args);
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function readPkg(short) {
  const file = resolve(root, 'packages', short, 'package.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

const ok = (msg) => console.log(`  \u2713 ${msg}`);
const bad = (msg) => console.log(`  \u2717 ${msg}`);

// —————————————— 预检 ——————————————
console.log(`cron-kit 发布${dryRun ? '（彩排，不会真正推送）' : ''}`);
console.log(`registry: ${REGISTRY}\n`);

console.log('预检');

// 1. 构建产物是否就绪
let buildReady = true;
for (const short of queue) {
  const dist = resolve(root, 'packages', short, 'dist');
  const entry = resolve(dist, 'index.js');
  const types = resolve(dist, 'index.d.ts');
  if (existsSync(entry) && existsSync(types)) {
    // UI 包还应有 CSS
    const css = resolve(dist, short === 'core' ? 'styles.css' : 'style.css');
    const cssText = existsSync(css) ? '' : '（缺 CSS）';
    ok(`${SHORT_TO_NAME[short]} 构建产物就绪${cssText}`);
  } else {
    bad(`${SHORT_TO_NAME[short]} 缺少 dist 产物，先跑 npm run build`);
    buildReady = false;
  }
}
if (!buildReady) {
  console.log('\n构建产物不全，已中止。');
  process.exit(1);
}

// 2. 登录状态（彩排模式下只警告，因为 dry-run 也需要认证）
const whoami = npm(['whoami', `--registry=${REGISTRY}`]);
const user = whoami.status === 0 ? (whoami.stdout ?? '').trim() : '';
if (user) {
  ok(`已登录：${user}`);
} else if (dryRun) {
  console.log(`  ! 未登录官方源，彩排将只能校验包清单（无法验证发布权限）`);
} else {
  bad('未登录官方源，无法发布');
  console.log(`
请先在自己的终端执行（注意必须带 --registry，否则会登进镜像源）：

  npm login --registry=${REGISTRY}
  npm whoami --registry=${REGISTRY}

登录成功后再回来执行本脚本。`);
  process.exit(1);
}

// 从本地 npmrc 里取出实际生效的 token（项目级优先于用户级）
function readEffectiveToken() {
  const candidates = [
    resolve(root, '.npmrc'),
    process.env.NPM_CONFIG_USERCONFIG,
    resolve(process.env.USERPROFILE ?? process.env.HOME ?? '', '.npmrc'),
  ].filter(Boolean);

  for (const file of candidates) {
    try {
      const hit = readFileSync(file, 'utf8').match(/\/\/registry\.npmjs\.org\/:_authToken=(\S+)/);
      if (hit) return hit[1].trim();
    } catch {
      // 文件不存在或不可读，继续看下一个
    }
  }
  return '';
}

// 3. 凭据能力核对：这枚 token 到底能不能发布
//
// npm 强制要求「账号开启 2FA，或使用勾了 Bypass 2FA 的 granular access token」才能发布。
// 光有写权限是不够的：bypass_2fa 为 false 时 npm 会回一个极具误导性的 403 ——
//   Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
// 明明交的就是 token，报错却不提「你少勾了一个框」。这里提前把真实能力查出来。
console.log('\n凭据能力核对');
if (otp) {
  ok('已提供 --otp，走账号 2FA 路径');
} else {
  let tokens = null;
  try {
    tokens = JSON.parse(npmOut(['token', 'list', '--json', `--registry=${REGISTRY}`]));
  } catch {
    tokens = null;
  }

  if (!Array.isArray(tokens)) {
    console.log('  ! 读不到 token 列表（该凭据可能没有账号级读取权限），跳过此项检查');
  } else {
    const writable = tokens.filter(
      (item) =>
        !item.revoked && item.permissions?.some((p) => p.name === 'package' && p.action === 'write'),
    );
    const local = readEffectiveToken();
    const mask = (value) => (value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value);
    const matched = local ? writable.find((item) => item.token === mask(local)) : undefined;

    if (matched && matched.bypass_2fa === false) {
      bad(`当前 token（${matched.token}，名「${matched.name}」）的 bypass_2fa 为 false，无法发布`);
      console.log(`
npm 要求：账号开启 2FA，或使用勾选了 Bypass two-factor authentication 的 granular access token。
这个选框在创建页面默认是【未勾选】的，漏勾就会撞上那个 403。

修法一（推荐）：到 https://www.npmjs.com/settings/~/tokens 重新建一个 token
  · Permissions 选 Read and write（publish and stage）
  · Select Packages 选 All Packages
  · ★ 勾上 "Bypass two-factor authentication"

修法二：给账号开启 2FA，然后加 --otp=六位动态码 发布。

建好后先自检，bypass_2fa 必须为 true：
  npm token list --json --registry=${REGISTRY}
`);
      process.exit(1);
    }

    if (matched) {
      ok(`当前 token ${matched.token}（名「${matched.name}」）具备发布能力`);
    } else if (writable.some((item) => item.bypass_2fa === true)) {
      ok('账号下存在带 Bypass 2FA 的写权限 token（未能与本地 token 精确匹配）');
    } else {
      console.log('  ! 未能在 token 列表里定位本地凭据，跳过此项检查');
    }
  }
}

// 4. 本地版本 vs 远端版本
console.log('\n版本核对');
const plan = [];
for (const short of queue) {
  const name = SHORT_TO_NAME[short];
  const { version } = readPkg(short);

  const remoteRaw = npmOut(['view', name, 'version', `--registry=${REGISTRY}`]);
  const remote = /^\d+\.\d+\.\d+/.test(remoteRaw) ? remoteRaw.split('\n').pop().trim() : '';

  if (!remote) {
    ok(`${name}@${version}  —— 新包名，将首次发布`);
    plan.push({ short, name, version, first: true });
    continue;
  }

  const exact = npmOut(['view', `${name}@${version}`, 'version', `--registry=${REGISTRY}`]);
  if (/^\d+\.\d+\.\d+/.test(exact)) {
    bad(`${name}@${version} 已存在于官方源（远端最新 ${remote}）—— 需要先升版本号`);
    plan.push({ short, name, version, blocked: true });
  } else {
    ok(`${name}@${version} 可发布（远端最新 ${remote}）`);
    plan.push({ short, name, version });
  }
}

if (plan.some((item) => item.blocked)) {
  console.log(`
用法：
  npm version patch --no-git-tag-version -w ${plan.find((i) => i.blocked).name}
（三个包版本建议保持一致，都要改）`);
  process.exit(1);
}

// —————————————— 发布 ——————————————
console.log(`\n开始发布（顺序：${queue.map((s) => SHORT_TO_NAME[s]).join(' → ')}）`);

for (const item of plan) {
  const args = ['publish', '-w', item.name, `--registry=${REGISTRY}`, '--access', 'public'];
  if (dryRun) args.push('--dry-run');
  if (otp) args.push(otp);
  if (tag) args.push(tag);

  console.log(`\n→ ${item.name}@${item.version}${item.first ? '（首次发布）' : ''}`);

  if (dryRun && !user) {
    // 未登录时 npm publish --dry-run 会直接失败，退化为 pack --dry-run 校验清单
    const pack = npm(['pack', '-w', item.name, '--dry-run'], { inherit: true });
    if (pack.status !== 0) {
      bad(`${item.name} 清单校验失败`);
      process.exit(1);
    }
    ok('清单校验通过（未登录，跳过权限验证）');
    continue;
  }

  const result = npm(args, { inherit: true });
  if (result.status !== 0) {
    bad(`${item.name} 发布失败`);
    console.log(
      '\n若报 403 且提示 need auth / 2FA，用 --otp=六位动态码 重试；' +
        '\n若提示 cannot publish over existing version，说明版本号已被占用，需要升版本。',
    );
    process.exit(1);
  }
  ok(`${item.name}@${item.version} 发布成功`);
}

if (dryRun) {
  console.log('\n彩排结束，没有推送任何内容。');
  process.exit(0);
}

// —————————————— 发布后校验 ——————————————
console.log('\n发布后校验');
for (const item of plan) {
  const online = npmOut(['view', item.name, 'version', `--registry=${REGISTRY}`]);
  if (online.trim() === item.version) {
    ok(`${item.name}@${online.trim()} 已上线`);
  } else {
    bad(`${item.name} 线上版本为 ${online || '(查询失败)'}，与预期 ${item.version} 不一致（npm 索引可能有延迟，可稍后重跑核对）`);
  }
}

console.log(`
完成。包详情页（README 会自动作为正文渲染）：
${plan.map((item) => `  https://www.npmjs.com/package/${item.name}`).join('\n')}

建议再真实装一次验证 exports 与类型：
  mkdir -p /tmp/ck-check && cd /tmp/ck-check && npm init -y
  npm i ${plan.map((item) => item.name).join(' ')} --registry=${REGISTRY}
`);
