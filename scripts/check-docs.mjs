#!/usr/bin/env node
/**
 * 文档自检：
 *  1. Markdown 表格的列数是否一致（手写表格最容易错位）
 *  2. 文档里出现的 `cron-kit-*` 包名是否真实存在
 *  3. 文档里引用的本地相对链接是否存在
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DOCS = [
  'README.md',
  'PUBLISHING.md',
  'packages/core/README.md',
  'packages/react/README.md',
  'packages/vue/README.md',
];

const KNOWN_PACKAGES = ['cron-kit-core', 'cron-kit-react', 'cron-kit-vue'];

let problems = 0;
const fail = (doc, line, message) => {
  problems += 1;
  console.log(`  ✗ ${doc}:${line} ${message}`);
};

/**
 * 切分一行表格为单元格。
 * GFM 里单元格内的竖线必须写成 `\|`，所以先把转义竖线替换成占位符再切分，
 * 否则 `'quartz' \| 'spring'` 这类类型列会被误判成多列。
 */
const PIPE = '\u0001';
const cells = (line) =>
  line
    .trim()
    .replace(/\\\|/g, PIPE)
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((item) => item.split(PIPE).join('|').trim());

for (const doc of DOCS) {
  const path = resolve(root, doc);
  if (!existsSync(path)) {
    fail(doc, 0, '文件不存在');
    continue;
  }

  const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
  console.log(`\n${doc}  (${lines.length} 行)`);

  let tableStart = 0;
  let expected = 0;
  let inFence = false;

  lines.forEach((line, index) => {
    const no = index + 1;

    // 跟踪代码围栏，避免把代码块里的竖线当表格
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      tableStart = 0;
      return;
    }
    if (inFence) return;

    const isRow = /^\s*\|.*\|\s*$/.test(line);
    const isDivider = /^\s*\|[\s:|-]+\|\s*$/.test(line);

    if (isRow) {
      const count = cells(line).length;
      if (isDivider) {
        tableStart = no;
        expected = count;
      } else if (!tableStart) {
        // 没有分隔行的裸竖线行，跳过
      } else if (count !== expected) {
        fail(doc, no, `表格列数 ${count} 与表头 ${expected} 不一致`);
      }
    } else if (line.trim() === '') {
      tableStart = 0;
    }

    // 包名白名单：只校验「cron-kit-xxx」这种形态
    for (const hit of line.matchAll(/cron-kit-[a-z]+/g)) {
      if (!KNOWN_PACKAGES.includes(hit[0])) {
        fail(doc, no, `出现未知包名 ${hit[0]}`);
      }
    }
  });

  // 本地相对链接
  for (const [index, line] of lines.entries()) {
    for (const hit of line.matchAll(/\]\(\.\/([^)#]+)\)/g)) {
      const target = resolve(root, hit[1]);
      if (!existsSync(target)) fail(doc, index + 1, `相对链接失效 → ${hit[1]}`);
    }
  }
}

console.log(
  problems === 0 ? '\n文档自检通过 ✅' : `\n文档自检发现 ${problems} 个问题 ❌`,
);
process.exit(problems === 0 ? 0 : 1);
