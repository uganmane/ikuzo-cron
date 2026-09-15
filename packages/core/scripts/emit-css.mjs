/**
 * 构建后把内联样式导出为独立的 dist/styles.css，
 * 方便不使用打包器或希望单独引入样式的用户。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '../dist');
const cssPath = resolve(distDir, 'styles.css');

const { CRON_KIT_CSS } = await import(
  new URL('../dist/styles.js', import.meta.url).href
);

mkdirSync(distDir, { recursive: true });
writeFileSync(cssPath, `${CRON_KIT_CSS.trim()}\n`, 'utf8');

console.log(`[cron-kit-core] dist/styles.css 已生成（${CRON_KIT_CSS.length} 字符）`);
