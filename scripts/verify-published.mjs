#!/usr/bin/env node
/**
 * 发布后验收：从 registry 真实安装已发布的包，确认它们真的能用。
 *
 * 与 ./publish.mjs 的分工：
 *   publish.mjs  推送**前**的预检 —— 产物是否齐全、凭据能否发布、版本是否被占用
 *   本脚本        推送**后**的验收 —— 真实安装、双入口、类型声明、样式文件、两端渲染
 *
 * 为什么不直接在工作区里测：工作区的 node_modules 是符号链接到本地 packages/，
 * 验不出「用户从 npm 装下来的是什么」。所以这里另建干净的临时目录并只装线上包。
 *
 * 用法：
 *   node scripts/verify-published.mjs            # 验证三个包当前版本
 *   node scripts/verify-published.mjs --keep     # 保留临时目录，便于手动排查
 *   CRON_KIT_REGISTRY=... node scripts/verify-published.mjs
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = process.env.CRON_KIT_REGISTRY ?? 'https://registry.npmjs.org';
const IS_WIN = process.platform === 'win32';
const workDir = resolve(root, '.tmp', 'published-check');
const keep = process.argv.includes('--keep');

const targets = ['core', 'react', 'vue'].map((short) => {
  const { name, version } = JSON.parse(
    readFileSync(resolve(root, 'packages', short, 'package.json'), 'utf8'),
  );
  return `${name}@${version}`;
});

console.log('发布后验收（从 registry 真实安装，不使用本地工作区）');
console.log(`registry: ${REGISTRY}`);
console.log(`目标：${targets.join('  ')}\n`);

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

writeFileSync(
  resolve(workDir, 'package.json'),
  `${JSON.stringify(
    { name: 'cron-kit-published-check', version: '0.0.0', private: true, type: 'module' },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log('安装…');
const install = spawnSync(
  'npm',
  ['install', ...targets, 'react', 'react-dom', 'vue', `--registry=${REGISTRY}`],
  { cwd: workDir, shell: IS_WIN, stdio: 'inherit', encoding: 'utf8' },
);

if (install.status !== 0) {
  console.error(`
安装失败。
若报 404，通常是 registry 索引有延迟，该版本还没同步过来，等一两分钟重试即可。`);
  process.exit(1);
}

// 检查脚本必须落在临时目录里执行，否则裸模块名会解析到工作区的本地包
copyFileSync(resolve(root, 'scripts', 'published-checks.mjs'), resolve(workDir, 'checks.mjs'));

console.log('\n开始检查…');
const checks = spawnSync(process.execPath, ['checks.mjs'], {
  cwd: workDir,
  stdio: 'inherit',
  encoding: 'utf8',
});

if (keep) {
  console.log(`\n临时目录已保留：${workDir}`);
} else {
  rmSync(workDir, { recursive: true, force: true });
}

process.exit(checks.status ?? 1);
