/**
 * 把 cron-kit-core 构建出的 styles.css 复制到各 UI 包的 dist 下，
 * 方便使用者按需单独引入样式文件。
 *
 * 用法：node scripts/copy-styles.mjs <react|vue>
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const target = process.argv[2];
const mapping = {
  react: 'packages/react/dist/style.css',
  vue: 'packages/vue/dist/style.css',
};

if (!target || !mapping[target]) {
  console.error('用法：node scripts/copy-styles.mjs <react|vue>');
  process.exit(1);
}

const source = resolve(root, 'packages/core/dist/styles.css');
if (!existsSync(source)) {
  console.error('未找到 packages/core/dist/styles.css，请先构建 cron-kit-core');
  process.exit(1);
}

const destination = resolve(root, mapping[target]);
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`[copy-styles] ${mapping[target]} 已更新`);
