import {
  buildExpression,
  describeExpression,
  getNextRunTimes,
  getTemplates,
  parseExpression,
} from '../packages/core/dist/index.js';

const cases = [
  ['quartz', '0 0 9 ? * MON-FRI'],
  ['quartz', '0 0 0 * * ?'],
  ['quartz', '0 0/5 * * * ?'],
  ['quartz', '0 * * * * ?'],
  ['quartz', '* * * * * ?'],
  ['quartz', '0 0 0 L * ?'],
  ['quartz', '0 0 0 15W * ?'],
  ['quartz', '0 0 0 LW * ?'],
  ['quartz', '0 0 0 ? * MON#2'],
  ['quartz', '0 0 0 ? * 6L'],
  ['quartz', '0 0 0 1 1 ? *'],
  ['quartz', '0 0 0 1 1,4,7,10 ? *'],
  ['quartz', '0 0 9,18 * * ?'],
  ['quartz', '0 0 */2 * * ?'],
  ['quartz', '0 30 2 * * ?'],
  ['quartz', '0 0 9 * * *'],
  ['spring', '0 0 9 ? * MON-FRI'],
  ['linux', '* * * * *'],
  ['linux', '0 9 * * 1-5'],
  ['linux', '0 0 1 * *'],
  ['node', '0 0 9 * * 1-5'],
];

for (const [syntax, expr] of cases) {
  const parsed = parseExpression(expr, syntax);
  const desc = describeExpression(expr, syntax);
  console.log(
    `[${syntax}] ${expr.padEnd(24)} valid=${parsed.valid}`,
    parsed.valid ? '→' : `× ${parsed.issues[0]?.message}`,
  );
  if (parsed.valid) console.log(`    ${desc.summary}`);
  console.log(
    '    ' +
      desc.segments.map((s) => `${s.label}=${s.raw}(${s.text})`).join(' '),
  );
}

console.log('\n=== 下次运行时间 ===');
const tz = 'Asia/Shanghai';
for (const [syntax, expr] of [
  ['quartz', '0 0 9 ? * MON-FRI'],
  ['quartz', '0 0 0 L * ?'],
  ['quartz', '0 0 0 15W * ?'],
  ['quartz', '0 0 0 ? * MON#2'],
  ['quartz', '0 0 0 LW * ?'],
  ['linux', '0 9 * * 1-5'],
]) {
  const runs = getNextRunTimes(expr, {
    syntax,
    count: 5,
    timeZone: tz,
    from: '2026-09-15T00:00:00+08:00',
  });
  console.log(`${expr} →`);
  runs.forEach((r) => console.log(`   ${r.text} ${r.weekday} ${r.offset}`));
}

console.log('\n=== 时区对照 ===');
const a = getNextRunTimes('0 0 9 ? * *', {
  count: 1,
  timeZone: 'Asia/Shanghai',
  from: '2026-09-15T00:00:00Z',
})[0];
const b = getNextRunTimes('0 0 9 ? * *', {
  count: 1,
  timeZone: 'UTC',
  from: '2026-09-15T00:00:00Z',
})[0];
console.log('Shanghai', a.text, a.timestamp, '| UTC', b.text, b.timestamp);

console.log('\n=== 夏令时 ===');
getNextRunTimes('0 30 2 * * ?', {
  count: 4,
  timeZone: 'America/New_York',
  from: '2026-03-07T00:00:00-05:00',
}).forEach((r) => console.log('  ', r.text, r.offset));

console.log('\n=== 模板 ===');
for (const syntax of ['quartz', 'spring', 'linux', 'node']) {
  console.log(`-- ${syntax}`);
  getTemplates(syntax).forEach((t) => console.log(`   ${t.expression.padEnd(22)} ${t.label} | ${t.description}`));
}

console.log('\n=== 反解析回填 ===');
console.log(buildExpression({ syntax: 'quartz', fields: { hour: { mode: 'interval', from: 0, step: 2 } } }));
