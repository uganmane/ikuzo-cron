import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts', styles: 'src/styles.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'es2020',
    platform: 'neutral',
    outExtension({ format }) {
      return { js: format === 'cjs' ? '.cjs' : '.js' };
    },
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['iife'],
    globalName: 'CronKit',
    dts: false,
    clean: false,
    sourcemap: false,
    minify: true,
    target: 'es2018',
    outExtension() {
      return { js: '.global.js' };
    },
  },
]);
