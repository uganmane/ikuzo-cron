#!/usr/bin/env node
/**
 * 清理构建产物。
 *
 *   npm run clean
 *
 * 只删仓库内**明确列出**的构建目录，不做递归通配扫描：
 *   - packages/<pkg>/dist      各包的构建输出
 *   - playground/<app>/dist    playground 的构建输出（npm run demo 的产物）
 *   - .tmp                     脚本用的临时目录（如 verify:published 的解包目录）
 *   - 各处 *.tsbuildinfo       增量编译缓存
 *
 * 源码目录（src/、test/、scripts/、tests/）一律不碰。
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const removed = [];

function drop(target) {
  const abs = resolve(target);
  // 安全闸：只允许删仓库内的路径
  if (abs !== ROOT && !abs.startsWith(ROOT + (process.platform === 'win32' ? '\\' : '/'))) {
    throw new Error(`拒绝删除仓库外的路径：${abs}`);
  }
  if (!existsSync(abs)) return false;
  rmSync(abs, { recursive: true, force: true });
  removed.push(abs.slice(ROOT.length + 1).replace(/\\/g, '/'));
  return true;
}

// 1) 各组包与 playground 的 dist/
for (const group of ['packages', 'playground']) {
  const groupDir = join(ROOT, group);
  if (!existsSync(groupDir)) continue;
  for (const name of readdirSync(groupDir)) {
    const pkgDir = join(groupDir, name);
    if (!statSync(pkgDir).isDirectory()) continue;
    drop(join(pkgDir, 'dist'));
    // 2) 增量编译缓存
    for (const f of readdirSync(pkgDir)) {
      if (f.endsWith('.tsbuildinfo')) drop(join(pkgDir, f));
    }
  }
}

// 3) 根目录的 tsbuildinfo
for (const f of readdirSync(ROOT)) {
  if (f.endsWith('.tsbuildinfo')) drop(join(ROOT, f));
}

// 4) 临时目录
drop(join(ROOT, '.tmp'));

if (removed.length === 0) {
  console.log('clean: 没有需要清理的构建产物。');
} else {
  console.log(`clean: 已删除 ${removed.length} 项`);
  for (const p of removed) console.log(`  - ${p}`);
}
