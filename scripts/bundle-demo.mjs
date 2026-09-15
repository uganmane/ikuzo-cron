/**
 * 把 playground 的构建产物压成单文件 HTML 演示页。
 *
 * 用法：node scripts/bundle-demo.mjs [react|vue] [--all]
 *
 * 产物写到 playground/<name>/dist/demo.html，双击即可打开，
 * 也可以直接丢到任意静态服务器 / 分享给他人查看效果。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 把 html 里的外链脚本与样式替换成内联内容 */
async function inline(dir, html) {
  const assetsDir = join(dir, 'assets');
  let files = [];
  try {
    files = await readdir(assetsDir);
  } catch {
    files = [];
  }

  // 先内联样式
  // 注意：替换内容统一用函数返回，避免压缩产物里的 `$&` / `$'` 被当成替换模式
  let output = html;
  const linkRe = /<link[^>]+rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g;
  for (const [tag, href] of [...html.matchAll(linkRe)].map((m) => [m[0], m[1]])) {
    const css = await readFile(join(dir, href), 'utf8');
    output = output.replace(tag, () => `<style>\n${css}\n</style>`);
  }

  // 再内联模块脚本
  const scriptRe = /<script[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g;
  for (const [tag, src] of [...html.matchAll(scriptRe)].map((m) => [m[0], m[1]])) {
    const js = await readFile(join(dir, src), 'utf8');
    output = output.replace(tag, () => `<script type="module">\n${js}\n</script>`);
  }

  const leftovers = files.filter((file) => file.endsWith('.js') || file.endsWith('.css'));
  return { output, leftovers };
}

const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const names = targets.length ? targets : ['react', 'vue'];

for (const name of names) {
  const dist = join(root, 'playground', name, 'dist');
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  const { output, leftovers } = await inline(dist, html);
  const outFile = join(dist, 'demo.html');
  await writeFile(outFile, output, 'utf8');
  console.log(`[bundle-demo] ${name} -> ${outFile}（内联 ${leftovers.length} 个资源）`);
}
