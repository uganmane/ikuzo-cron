import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  VERSION,
  applySelection,
  buildExpression,
  buildField,
  describeExpression,
  expressionToConfig,
  getNextRunTimes,
  getTemplates,
  parseExpression,
  ruleToFieldValue,
  validateExpression,
  willEverRun,
} from '../dist/index.js';
import { CRON_KIT_CSS } from '../dist/styles.js';

/** 取运行时间列表中的时刻文本 */
const runs = (expression, syntax, extra = {}) =>
  getNextRunTimes(expression, {
    syntax,
    count: 5,
    timeZone: 'Asia/Shanghai',
    from: '2026-09-15T00:00:00+08:00',
    ...extra,
  }).map((item) => item.text);

const expectRuns = (expression, syntax, expected, extra = {}) => {
  assert.deepEqual(runs(expression, syntax, extra), expected, `${syntax} ${expression}`);
};

describe('解析与校验', () => {
  it('各语法接受合法的字段数量', () => {
    assert.equal(parseExpression('0 0 9 ? * MON-FRI', 'quartz').valid, true);
    assert.equal(parseExpression('0 0 9 ? * MON-FRI *', 'quartz').valid, true);
    assert.equal(parseExpression('0 0 9 ? * MON-FRI', 'spring').valid, true);
    assert.equal(parseExpression('0 9 * * 1-5', 'linux').valid, true);
    assert.equal(parseExpression('0 0 9 * * 1-5', 'node').valid, true);
    // node 允许省略秒
    assert.equal(parseExpression('0 9 * * 1-5', 'node').valid, true);
  });

  it('字段数量不符时报错', () => {
    const result = parseExpression('0 9 * *', 'linux');
    assert.equal(result.valid, false);
    assert.equal(result.issues[0].code, 'field-count');
  });

  it('Quartz 缺少年字段时自动补全', () => {
    assert.equal(
      parseExpression('0 0 9 ? * MON-FRI', 'quartz').normalized,
      '0 0 9 ? * MON-FRI *',
    );
  });

  it('Quartz / Spring 要求日与周中必须有一个是 ?', () => {
    const conflict = parseExpression('0 0 9 * * *', 'quartz');
    assert.equal(conflict.valid, false);
    assert.ok(conflict.issues.some((issue) => issue.code === 'day-week-conflict'));

    assert.equal(parseExpression('0 0 9 * * ?', 'quartz').valid, true);
    assert.equal(parseExpression('0 0 9 ? * *', 'quartz').valid, true);

    const bothAny = parseExpression('0 0 9 ? * ?', 'spring');
    assert.equal(bothAny.valid, false);
    assert.ok(bothAny.issues.some((issue) => issue.code === 'day-week-conflict'));
  });

  it('Linux 与 Node 允许日和周同时限定', () => {
    assert.equal(parseExpression('0 0 1 * 5', 'linux').valid, true);
    assert.equal(parseExpression('0 0 0 1 * 5', 'node').valid, true);
  });

  it('拒绝语法不支持的字符', () => {
    // Linux 不支持 ?
    assert.ok(
      parseExpression('* * * * ?', 'linux').issues.some(
        (issue) => issue.code === 'unsupported-char',
      ),
    );
    // Spring 不支持 W
    assert.ok(
      parseExpression('0 0 0 15W * ?', 'spring').issues.some(
        (issue) => issue.code === 'unsupported-char',
      ),
    );
    // Node 不支持 #
    assert.ok(
      parseExpression('0 0 0 ? * 1#2', 'node').issues.some(
        (issue) => issue.code === 'unsupported-char',
      ),
    );
    // 全语法都不支持 @
    assert.equal(parseExpression('@daily', 'linux').valid, false);
  });

  it('拒绝越界取值', () => {
    assert.ok(
      parseExpression('60 * * * * ?', 'quartz').issues.some(
        (issue) => issue.code === 'out-of-range',
      ),
    );
    assert.ok(
      parseExpression('0 0 0 ? * 8', 'quartz').issues.some(
        (issue) => issue.code === 'out-of-range',
      ),
    );
    // Quartz 的周字段是 1-7
    assert.ok(
      parseExpression('0 0 0 ? * 0', 'quartz').issues.some(
        (issue) => issue.code === 'out-of-range',
      ),
    );
    // 其他语法的周字段是 0-7
    assert.equal(parseExpression('0 0 0 ? * 0', 'spring').valid, true);
  });

  it('拒绝非法步长', () => {
    assert.ok(
      parseExpression('0 0/0 * * * ?', 'quartz').issues.some(
        (issue) => issue.code === 'invalid-step',
      ),
    );
  });

  it('validateExpression 返回首条错误信息', () => {
    const result = validateExpression('0 0 9 * * *', 'quartz');
    assert.equal(result.valid, false);
    assert.match(result.message, /日/);
  });
});

describe('字段解析', () => {
  const ruleOf = (expression, key, syntax = 'quartz') =>
    parseExpression(expression, syntax).rules[key];

  it('支持 * 与 ?', () => {
    const rule = ruleOf('0 0 9 ? * MON-FRI', 'day');
    assert.equal(rule.any, true);
    assert.equal(rule.every, false);

    const every = ruleOf('0 0 9 * * ?', 'day');
    assert.equal(every.every, true);
  });

  it('支持枚举、区间与步长', () => {
    assert.deepEqual(ruleOf('0 0 9 1,15 * ?', 'day').values, [1, 15]);
    assert.deepEqual(ruleOf('0 0 9 * 1-3 ?', 'month').values, [1, 2, 3]);
    assert.deepEqual(ruleOf('0 0/15 * * * ?', 'minute').values, [0, 15, 30, 45]);
    assert.deepEqual(ruleOf('0 10-50/20 * * * ?', 'minute').values, [10, 30, 50]);
  });

  it('支持月份与星期别名', () => {
    assert.deepEqual(ruleOf('0 0 9 * JAN-MAR ?', 'month').values, [1, 2, 3]);
    // Quartz 的 1=周日，归一化后 MON-FRI 为 1-5
    assert.deepEqual(ruleOf('0 0 9 ? * MON-FRI', 'week').values, [1, 2, 3, 4, 5]);
    // Spring 的 0=周日，归一化后 MON-FRI 为 1-5
    assert.deepEqual(ruleOf('0 0 9 ? * MON-FRI', 'week', 'spring').values, [1, 2, 3, 4, 5]);
  });

  it('支持 L / L-n / LW / nW', () => {
    assert.deepEqual(ruleOf('0 0 0 L * ?', 'day').specials, [
      { kind: 'lastDay', offset: 0 },
    ]);
    assert.deepEqual(ruleOf('0 0 0 L-3 * ?', 'day').specials, [
      { kind: 'lastDay', offset: 3 },
    ]);
    assert.deepEqual(ruleOf('0 0 0 LW * ?', 'day').specials, [
      { kind: 'lastWeekdayOfMonth' },
    ]);
    assert.deepEqual(ruleOf('0 0 0 15W * ?', 'day').specials, [
      { kind: 'nearestWeekday', day: 15 },
    ]);
  });

  it('支持 nL 与 n#m', () => {
    // Quartz 6 = 周五
    assert.deepEqual(ruleOf('0 0 0 ? * 6L', 'week').specials, [
      { kind: 'lastOfWeek', dow: 5 },
    ]);
    assert.deepEqual(ruleOf('0 0 0 ? * MON#2', 'week').specials, [
      { kind: 'nthWeekday', dow: 1, nth: 2 },
    ]);
  });

  it('# 的序号只能是 1-5', () => {
    assert.equal(parseExpression('0 0 0 ? * MON#6', 'quartz').valid, false);
    assert.equal(parseExpression('0 0 0 ? * MON#5', 'quartz').valid, true);
  });
});

describe('可视化配置与表达式互转', () => {
  it('按语法裁剪字段', () => {
    const config = {
      syntax: 'linux',
      fields: {
        second: { mode: 'specific', list: [30] },
        minute: { mode: 'specific', list: [0] },
        hour: { mode: 'specific', list: [9] },
      },
    };
    assert.equal(buildExpression(config), '0 9 * * *');
  });

  it('自动处理日与周的互斥', () => {
    const withWeek = buildExpression({
      syntax: 'quartz',
      fields: {
        second: { mode: 'specific', list: [0] },
        minute: { mode: 'specific', list: [0] },
        hour: { mode: 'specific', list: [9] },
        week: { mode: 'range', from: 1, to: 5 },
      },
    });
    assert.equal(withWeek, '0 0 9 ? * 2-6 *');

    const withDay = buildExpression({
      syntax: 'quartz',
      fields: {
        second: { mode: 'specific', list: [0] },
        minute: { mode: 'specific', list: [0] },
        hour: { mode: 'specific', list: [9] },
        day: { mode: 'specific', list: [1] },
        week: { mode: 'range', from: 1, to: 5 },
      },
    });
    // 默认以「日」为准
    assert.equal(withDay, '0 0 9 1 * ? *');
  });

  it('生成的结果始终能通过校验', () => {
    const configs = [
      { syntax: 'quartz', fields: { day: { mode: 'last' } } },
      { syntax: 'quartz', fields: { day: { mode: 'nearestWeekday', from: 15 } } },
      { syntax: 'quartz', fields: { day: { mode: 'lastWeekday' } } },
      { syntax: 'spring', fields: { week: { mode: 'nthWeekday', from: 1, nth: 2 } } },
      { syntax: 'quartz', fields: { second: { mode: 'interval', from: 0, step: 10 } } },
      { syntax: 'node', fields: { minute: { mode: 'raw', raw: '*/7' } } },
    ];
    for (const config of configs) {
      const expression = buildExpression(config);
      const parsed = parseExpression(expression, config.syntax);
      assert.equal(
        parsed.valid,
        true,
        `${config.syntax} 生成 ${expression} 却校验失败：${parsed.issues[0]?.message}`,
      );
    }
  });

  it('buildField 覆盖全部模式', () => {
    assert.equal(buildField('minute', { mode: 'every' }, 'quartz'), '*');
    assert.equal(buildField('day', { mode: 'any' }, 'quartz'), '?');
    assert.equal(buildField('day', { mode: 'any' }, 'linux'), '*');
    assert.equal(buildField('minute', { mode: 'specific', list: [5, 1] }, 'quartz'), '1,5');
    assert.equal(buildField('hour', { mode: 'range', from: 9, to: 18 }, 'quartz'), '9-18');
    assert.equal(
      buildField('hour', { mode: 'range', from: 9, to: 18, step: 3 }, 'quartz'),
      '9-18/3',
    );
    assert.equal(buildField('minute', { mode: 'interval', from: 0, step: 5 }, 'quartz'), '*/5');
    assert.equal(buildField('minute', { mode: 'interval', from: 10, step: 5 }, 'quartz'), '10/5');
    assert.equal(buildField('day', { mode: 'last', offset: 2 }, 'quartz'), 'L-2');
    assert.equal(buildField('day', { mode: 'lastWeekday' }, 'quartz'), 'LW');
    assert.equal(buildField('week', { mode: 'nthWeekday', from: 1, nth: 2 }, 'quartz'), '2#2');
  });

  it('expressionToConfig 能把表达式回填为配置', () => {
    const { config } = expressionToConfig('0 0/5 9-18 ? * MON#2', 'quartz');
    assert.deepEqual(config.minute?.values, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    assert.deepEqual(config.hour?.values, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    assert.deepEqual(config.week?.specials, [{ kind: 'nthWeekday', dow: 1, nth: 2 }]);
  });
});

describe('自然语言描述', () => {
  const summaryOf = (expression, syntax = 'quartz') =>
    describeExpression(expression, syntax).summary;

  it('覆盖常见调度场景', () => {
    assert.equal(summaryOf('* * * * * ?'), '每秒执行');
    assert.equal(summaryOf('0 * * * * ?'), '每分钟执行');
    assert.equal(summaryOf('0 0/5 * * * ?'), '每 5 分钟执行');
    assert.equal(summaryOf('0 0 * * * ?'), '每小时执行');
    assert.equal(summaryOf('0 0 0 * * ?'), '每天 00:00:00 执行');
    assert.equal(summaryOf('0 0 9 ? * MON-FRI'), '每周一至周五 09:00:00 执行');
    assert.equal(summaryOf('0 0 0 L * ?'), '每月最后一天 00:00:00 执行');
    assert.equal(summaryOf('0 0 0 LW * ?'), '每月最后一个工作日 00:00:00 执行');
    assert.equal(summaryOf('0 0 0 15W * ?'), '每月最接近 15 日的工作日 00:00:00 执行');
    assert.equal(summaryOf('0 0 0 ? * MON#2'), '每月第二个周一 00:00:00 执行');
    assert.equal(summaryOf('0 0 0 ? * 6L'), '每月最后一个周五 00:00:00 执行');
    assert.equal(summaryOf('0 0 0 1 1 ? *'), '1 月 1 日 00:00:00 执行');
    assert.equal(summaryOf('0 0 9,18 * * ?'), '每天 09:00、18:00 执行');
    assert.equal(summaryOf('0 0 */2 * * ?'), '每 2 小时执行');
  });

  it('按语法调整粒度', () => {
    assert.equal(summaryOf('* * * * *', 'linux'), '每分钟执行');
    assert.equal(summaryOf('0 9 * * 1-5', 'linux'), '每周一至周五 09:00 执行');
    assert.equal(summaryOf('0 0 1 * *', 'linux'), '每月 1 日 00:00 执行');
    // Spring 的 0/7 表示周日，因此周一至周五写作 1-5
    assert.equal(summaryOf('0 0 9 ? * 1-5', 'spring'), '每周一至周五 09:00:00 执行');
  });

  it('给出逐字段说明', () => {
    const result = describeExpression('0 0 9 ? * MON-FRI', 'quartz');
    assert.equal(result.valid, true);
    assert.equal(result.segments.length, 7);
    assert.equal(result.segments[0].label, '秒');
    assert.equal(result.segments[0].text, '第 0 秒');
    assert.equal(result.segments[3].text, '不指定');
    assert.equal(result.segments[5].text, '周一至周五');
  });

  it('附带英文描述', () => {
    const result = describeExpression('0 0 9 ? * MON-FRI', 'quartz', 'en-US');
    assert.match(result.summary, /Monday/);
    assert.equal(result.segments[0].label, 'Second');
  });

  it('表达式非法时不产出摘要', () => {
    const result = describeExpression('0 0 9 * * *', 'quartz');
    assert.equal(result.valid, false);
    assert.equal(result.summary, '');
  });
});

describe('运行时间计算', () => {
  it('工作日 9 点，跳过周末', () => {
    expectRuns('0 0 9 ? * MON-FRI', 'quartz', [
      '2026-09-15 09:00:00',
      '2026-09-16 09:00:00',
      '2026-09-17 09:00:00',
      '2026-09-18 09:00:00',
      '2026-09-21 09:00:00',
    ]);
  });

  it('每月最后一天', () => {
    expectRuns('0 0 0 L * ?', 'quartz', [
      '2026-09-30 00:00:00',
      '2026-10-31 00:00:00',
      '2026-11-30 00:00:00',
      '2026-12-31 00:00:00',
      '2027-01-31 00:00:00',
    ]);
  });

  it('最近工作日 15W', () => {
    expectRuns('0 0 0 15W * ?', 'quartz', [
      '2026-10-15 00:00:00',
      '2026-11-16 00:00:00',
      '2026-12-15 00:00:00',
      '2027-01-15 00:00:00',
      '2027-02-15 00:00:00',
    ]);
  });

  it('每月最后一个工作日 LW', () => {
    expectRuns('0 0 0 LW * ?', 'quartz', [
      '2026-09-30 00:00:00',
      '2026-10-30 00:00:00',
      '2026-11-30 00:00:00',
      '2026-12-31 00:00:00',
      '2027-01-29 00:00:00',
    ]);
  });

  it('每月第二个周一', () => {
    expectRuns('0 0 0 ? * MON#2', 'quartz', [
      '2026-10-12 00:00:00',
      '2026-11-09 00:00:00',
      '2026-12-14 00:00:00',
      '2027-01-11 00:00:00',
      '2027-02-08 00:00:00',
    ]);
  });

  it('每月最后一个周五', () => {
    expectRuns('0 0 0 ? * 6L', 'quartz', [
      '2026-09-25 00:00:00',
      '2026-10-30 00:00:00',
      '2026-11-27 00:00:00',
      '2026-12-25 00:00:00',
      '2027-01-29 00:00:00',
    ]);
  });

  it('Linux 的最小粒度是分钟，不会逐秒触发', () => {
    expectRuns('0 9 * * 1-5', 'linux', [
      '2026-09-15 09:00:00',
      '2026-09-16 09:00:00',
      '2026-09-17 09:00:00',
      '2026-09-18 09:00:00',
      '2026-09-21 09:00:00',
    ]);
  });

  it('支持秒级步长与闰年', () => {
    // 起点为 00:00:00，结果严格晚于起点
    expectRuns('*/30 * * * * ?', 'quartz', [
      '2026-09-15 00:00:30',
      '2026-09-15 00:01:00',
    ], { count: 2 });

    expectRuns('0 0 0 29 2 ?', 'quartz', ['2028-02-29 00:00:00'], { count: 1 });
  });

  it('表达式不可能成立时返回空数组', () => {
    assert.deepEqual(getNextRunTimes('0 0 0 30 2 ?', { syntax: 'quartz', count: 3 }), []);
    assert.equal(willEverRun('0 0 0 30 2 ?', { syntax: 'quartz' }), false);
    assert.equal(willEverRun('0 0 0 29 2 ?', { syntax: 'quartz' }), true);
  });

  it('表达式非法时返回空数组', () => {
    assert.deepEqual(getNextRunTimes('0 0 9 * * *', { syntax: 'quartz' }), []);
  });
});

describe('时区与夏令时', () => {
  it('同一瞬时在不同时区下的挂钟时间不同', () => {
    const shanghai = getNextRunTimes('0 0 9 ? * *', {
      count: 1,
      timeZone: 'Asia/Shanghai',
      from: '2026-09-15T00:00:00Z',
    })[0];
    const utc = getNextRunTimes('0 0 9 ? * *', {
      count: 1,
      timeZone: 'UTC',
      from: '2026-09-15T00:00:00Z',
    })[0];

    assert.equal(shanghai.text, '2026-09-15 09:00:00');
    assert.equal(utc.text, '2026-09-15 09:00:00');
    assert.equal(shanghai.offset, 'UTC+08:00');
    assert.equal(utc.offset, 'UTC+00:00');
    assert.equal(utc.timestamp - shanghai.timestamp, 8 * 3600 * 1000);
  });

  it('夏令时跳变当天不存在的时刻被跳过', () => {
    const list = getNextRunTimes('0 30 2 * * ?', {
      count: 4,
      timeZone: 'America/New_York',
      from: '2026-03-07T00:00:00-05:00',
    }).map((item) => item.text);
    // 2026-03-08 02:30 因夏令时不存在，被跳过
    assert.deepEqual(list, [
      '2026-03-07 02:30:00',
      '2026-03-09 02:30:00',
      '2026-03-10 02:30:00',
      '2026-03-11 02:30:00',
    ]);
  });

  it('夏令时切换后偏移随之变化', () => {
    const list = getNextRunTimes('0 30 2 * * ?', {
      count: 3,
      timeZone: 'America/New_York',
      from: '2026-03-07T00:00:00-05:00',
    });
    assert.equal(list[0].offset, 'UTC-05:00');
    assert.equal(list[1].offset, 'UTC-04:00');
  });

  it('拒绝非法时区', () => {
    assert.throws(
      () => getNextRunTimes('0 0 9 ? * *', { timeZone: 'Not/AZone' }),
      /无效的时区/,
    );
  });
});

describe('模板', () => {
  for (const syntax of ['quartz', 'spring', 'linux', 'node']) {
    it(`${syntax} 的全部模板都是合法表达式且能算出运行时间`, () => {
      const templates = getTemplates(syntax);
      assert.ok(templates.length > 5);
      for (const template of templates) {
        const parsed = parseExpression(template.expression, syntax);
        assert.equal(
          parsed.valid,
          true,
          `${template.id} 生成 ${template.expression} 校验失败：${parsed.issues[0]?.message}`,
        );
        assert.ok(template.description.length > 0, `${template.id} 缺少描述`);
        const next = getNextRunTimes(template.expression, {
          syntax,
          count: 1,
          timeZone: 'Asia/Shanghai',
        });
        assert.equal(next.length, 1, `${template.id} 无法算出运行时间`);
      }
    });
  }

  it('Linux 与 Spring 会过滤掉不适用的模板', () => {
    const linuxIds = getTemplates('linux').map((item) => item.id);
    assert.ok(!linuxIds.includes('every-second'));

    const springIds = getTemplates('spring').map((item) => item.id);
    assert.ok(!springIds.includes('monthly-last-weekday'));

    const quartzIds = getTemplates('quartz').map((item) => item.id);
    assert.ok(quartzIds.includes('monthly-last-weekday'));
  });
});

describe('往返一致性', () => {
  const samples = [
    ['quartz', '0 0 9 ? * MON-FRI'],
    ['quartz', '0 0/5 * * * ?'],
    ['quartz', '0 0 0 L * ?'],
    ['quartz', '0 0 0 ? * 6L'],
    ['quartz', '0 0 0 ? * MON#2'],
    ['quartz', '0 0 0 1 1,4,7,10 ? *'],
    ['spring', '0 0 9 ? * 1-5'],
    ['linux', '*/15 9-18 * * 1-5'],
    ['node', '0 0 0 1 * *'],
  ];

  const runTexts = (expression, syntax) =>
    getNextRunTimes(expression, {
      syntax,
      count: 8,
      timeZone: 'Asia/Shanghai',
      from: '2026-09-15T00:00:00+08:00',
    }).map((item) => item.text);

  for (const [syntax, expression] of samples) {
    it(`${syntax} ${expression} 反解析后重建，运行时间不变`, () => {
      const { config, valid } = expressionToConfig(expression, syntax);
      assert.equal(valid, true);

      const fields = {};
      for (const [key, rule] of Object.entries(config)) {
        fields[key] = ruleToFieldValue(rule, syntax);
      }
      const rebuilt = buildExpression({ syntax, fields });

      assert.equal(
        parseExpression(rebuilt, syntax).valid,
        true,
        `${expression} 重建为 ${rebuilt} 后校验失败`,
      );

      const before = runTexts(expression, syntax);
      const after = runTexts(rebuilt, syntax);
      assert.ok(before.length > 0, `${expression} 未算出运行时间`);
      assert.deepEqual(after, before, `${expression} → ${rebuilt} 语义发生变化`);
    });
  }
});

describe('栅格选区（单击与鼠标滑动框选）', () => {
  // 单击切换与拖拽框选共用同一份「涂色」语义，React / Vue 两端都直接调它
  it('paint=true 把划过的值并入选区，并去重排序', () => {
    assert.deepEqual(applySelection([1, 5], [3, 1], true), [1, 3, 5]);
    assert.deepEqual(applySelection([], [7], true), [7]);
  });

  it('paint=false 把划过的值移出选区', () => {
    assert.deepEqual(applySelection([1, 2, 3, 4], [2, 3], false), [1, 4]);
  });

  it('移空时退回原选区（字段一旦为空就是非法表达式）', () => {
    assert.deepEqual(applySelection([5], [5], false), [5]);
    assert.deepEqual(applySelection([9], [1, 2, 9], false), [9]);
  });

  it('空选区上做移出仍是空', () => {
    assert.deepEqual(applySelection([], [3], false), []);
  });

  it('一次划过一串连续值，与逐格操作结果相同', () => {
    const dragged = [10, 11, 12, 13, 14, 15];
    assert.deepEqual(applySelection([1], dragged, true), [1, 10, 11, 12, 13, 14, 15]);

    let stepwise = [1];
    for (const value of dragged) stepwise = applySelection(stepwise, [value], true);
    assert.deepEqual(applySelection([1], dragged, true), stepwise);
  });

  it('不改写入参，返回新数组', () => {
    const current = [1, 2];
    const result = applySelection(current, [3], true);
    assert.deepEqual(current, [1, 2]);
    assert.notEqual(result, current);
  });

  it('VERSION 与 package.json 对齐', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(VERSION, pkg.version);
  });
});

describe('共享样式', () => {
  it('亮暗两套根节点都声明 color-scheme，原生控件不会串色', () => {
    assert.match(CRON_KIT_CSS, /\.ck-root\s*\{[\s\S]*?color-scheme: light;/);
    assert.match(CRON_KIT_CSS, /\.ck-root\[data-ck-theme='dark'\]\s*\{[\s\S]*?color-scheme: dark;/);
    assert.match(CRON_KIT_CSS, /\.ck-root\[data-ck-theme='auto'\]\s*\{[\s\S]*?color-scheme: dark;/);
  });

  it('每个可滚动面板都显式给了滚动条配色', () => {
    // 只写 scrollbar-width 时 Chrome 121+ 会忽略 ::-webkit-* ，转而用系统配色画滚动条，
    // 暗色面板右侧就会露出一条白底——所以必须同时给 scrollbar-color。
    const rule = CRON_KIT_CSS.match(/[^}]*\{[^}]*scrollbar-color:[^}]*\}/)?.[0] ?? '';
    assert.match(rule, /scrollbar-width: thin;/);
    assert.match(rule, /scrollbar-color: var\(--ck-border-strong\) transparent;/);

    for (const selector of ['.ck-dropdown__list', '.ck-grid--scroll', '.ck-modal__body', '.ck-modal-mask']) {
      assert.ok(rule.includes(selector), `${selector} 没有声明滚动条配色`);
    }
  });
});
