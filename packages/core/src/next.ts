import { parseExpression } from './parse';
import { getFieldSpecs, getSyntaxSpec } from './syntax';
import {
  formatDateTime,
  formatOffsetText,
  formatWeekday,
  getDaysInMonth,
  getLastWeekdayOfMonth,
  getNearestWeekday,
  getWallClockParts,
  isValidTimeZone,
  normalizeWallClock,
  zonedTimeToDate,
  type WallClock,
} from './timezone';
import type {
  CronSyntax,
  FieldKey,
  FieldRule,
  NextRunItem,
  NextRunOptions,
  SpecialRule,
} from './types';

/** 迭代上限，防止不可能满足的表达式造成死循环 */
const MAX_ITERATIONS = 20000;

interface MatchContext extends WallClock {
  lastDayOfMonth: number;
  lastWeekdayOfMonth: number;
}

function buildContext(wall: WallClock): MatchContext {
  const lastDayOfMonth = getDaysInMonth(wall.year, wall.month);
  return {
    ...wall,
    weekday: new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay(),
    lastDayOfMonth,
    lastWeekdayOfMonth: getLastWeekdayOfMonth(wall.year, wall.month),
  };
}

function ruleValueOf(key: FieldKey, context: MatchContext): number {
  switch (key) {
    case 'second':
      return context.second;
    case 'minute':
      return context.minute;
    case 'hour':
      return context.hour;
    case 'day':
      return context.day;
    case 'month':
      return context.month;
    case 'week':
      return context.weekday;
    case 'year':
      return context.year;
    default:
      return 0;
  }
}

function matchSpecial(special: SpecialRule, context: MatchContext): boolean {
  switch (special.kind) {
    case 'lastDay':
      return context.day === context.lastDayOfMonth - special.offset;
    case 'lastWeekdayOfMonth':
      return context.day === context.lastWeekdayOfMonth;
    case 'nearestWeekday':
      return context.day === getNearestWeekday(context.year, context.month, special.day);
    case 'lastOfWeek':
      return (
        context.weekday === special.dow && context.day + 7 > context.lastDayOfMonth
      );
    case 'nthWeekday':
      return (
        context.weekday === special.dow && Math.ceil(context.day / 7) === special.nth
      );
    default:
      return false;
  }
}

function matchesRule(rule: FieldRule | undefined, key: FieldKey, context: MatchContext): boolean {
  if (!rule) return true;
  if (rule.every || rule.any) return true;
  if (rule.values.length > 0 && rule.values.includes(ruleValueOf(key, context))) return true;
  for (const special of rule.specials) {
    if (matchSpecial(special, context)) return true;
  }
  return false;
}

function isUnrestricted(rule: FieldRule | undefined): boolean {
  if (!rule) return true;
  return rule.every || rule.any;
}

/**
 * 「日」与「周」的组合判定。
 *
 * - Quartz / Spring：另一个字段必为 `?`，直接取被限定的那个
 * - Linux / Node：两者都被限定时取「或」，与 POSIX crontab 一致
 */
function matchesDate(
  rules: Partial<Record<FieldKey, FieldRule>>,
  syntax: CronSyntax,
  context: MatchContext,
): boolean {
  const dayRule = rules.day;
  const weekRule = rules.week;
  const dayFree = isUnrestricted(dayRule);
  const weekFree = isUnrestricted(weekRule);

  if (dayFree && weekFree) return true;
  if (dayFree) return matchesRule(weekRule, 'week', context);
  if (weekFree) return matchesRule(dayRule, 'day', context);

  if (syntax === 'linux' || syntax === 'node') {
    return (
      matchesRule(dayRule, 'day', context) || matchesRule(weekRule, 'week', context)
    );
  }
  return matchesRule(dayRule, 'day', context);
}

/**
 * 在挂钟时间空间里向前搜索下一个命中点。
 *
 * @param minuteGranularity 语法本身没有「秒」字段时为 true（如 Linux crontab），
 *                          此时调度粒度为分钟，只需命中每分钟的第 0 秒
 */
function searchNext(
  start: WallClock,
  rules: Partial<Record<FieldKey, FieldRule>>,
  syntax: CronSyntax,
  minuteGranularity: boolean,
): WallClock | null {
  let current = normalizeWallClock(start);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const context = buildContext(current);

    // 分钟级语法：非整秒的时刻直接跳到下一分钟
    if (minuteGranularity && current.second !== 0) {
      current = normalizeWallClock({
        year: current.year,
        month: current.month,
        day: current.day,
        hour: current.hour,
        minute: current.minute + 1,
        second: 0,
      });
      continue;
    }

    if (!matchesRule(rules.year, 'year', context)) {
      current = normalizeWallClock({
        year: current.year + 1,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      continue;
    }

    if (!matchesRule(rules.month, 'month', context)) {
      current = normalizeWallClock({
        year: current.year,
        month: current.month + 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      continue;
    }

    if (!matchesDate(rules, syntax, context)) {
      current = normalizeWallClock({
        year: current.year,
        month: current.month,
        day: current.day + 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      continue;
    }

    if (!matchesRule(rules.hour, 'hour', context)) {
      current = normalizeWallClock({
        year: current.year,
        month: current.month,
        day: current.day,
        hour: current.hour + 1,
        minute: 0,
        second: 0,
      });
      continue;
    }

    if (!matchesRule(rules.minute, 'minute', context)) {
      current = normalizeWallClock({
        year: current.year,
        month: current.month,
        day: current.day,
        hour: current.hour,
        minute: current.minute + 1,
        second: 0,
      });
      continue;
    }

    if (!matchesRule(rules.second, 'second', context)) {
      current = normalizeWallClock({
        year: current.year,
        month: current.month,
        day: current.day,
        hour: current.hour,
        minute: current.minute,
        second: current.second + 1,
      });
      continue;
    }

    return current;
  }

  return null;
}

function toDate(value: Date | number | string | undefined): Date {
  if (value === undefined) return new Date();
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'number') return new Date(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * 计算表达式的接下来若干次运行时间。
 *
 * @param expression Cron 表达式
 * @param options    选项（语法、条数、起始时间、时区）
 * @returns 运行时间列表，表达式非法时返回空数组
 */
export function getNextRunTimes(
  expression: string,
  options: NextRunOptions = {},
): NextRunItem[] {
  const syntax = options.syntax ?? 'quartz';
  const count = Math.min(Math.max(options.count ?? 5, 1), 100);
  const timeZone = options.timeZone;
  const locale = 'zh-CN';

  if (timeZone && !isValidTimeZone(timeZone)) {
    throw new Error(`无效的时区：${timeZone}`);
  }

  const parsed = parseExpression(expression, syntax);
  if (!parsed.valid) return [];

  // 语法本身没有「秒」字段时，调度粒度为分钟
  const minuteGranularity = !getFieldSpecs(syntax).some((spec) => spec.key === 'second');

  const from = toDate(options.from);
  // 从起始时间的下一秒开始，保证结果严格晚于起始时间
  let cursorMs = Math.floor(from.getTime() / 1000) * 1000 + 1000;

  const results: NextRunItem[] = [];
  // 每轮至少推进 1 秒；夏令时跳变可能消耗较多轮次，这里给足预算
  const maxRounds = 20000;

  for (let round = 0; round < maxRounds && results.length < count; round += 1) {
    const startWall = getWallClockParts(new Date(cursorMs), timeZone);
    const matched = searchNext(startWall, parsed.rules, syntax, minuteGranularity);
    if (!matched) break;

    const date = zonedTimeToDate(matched, timeZone);

    // 夏令时导致挂钟时间不存在：整点跳过该小时内所有时刻（跳变区间内的时刻都不可达）
    const roundTrip = getWallClockParts(date, timeZone);
    const sameWallClock =
      roundTrip.year === matched.year &&
      roundTrip.month === matched.month &&
      roundTrip.day === matched.day &&
      roundTrip.hour === matched.hour &&
      roundTrip.minute === matched.minute &&
      roundTrip.second === matched.second;

    if (!sameWallClock) {
      const nextHour = normalizeWallClock({
        year: matched.year,
        month: matched.month,
        day: matched.day,
        hour: matched.hour + 1,
        minute: 0,
        second: 0,
      });
      cursorMs = Math.max(
        zonedTimeToDate(nextHour, timeZone).getTime(),
        cursorMs + 1000,
      );
      continue;
    }

    // 夏令时回拨导致该时刻落在起点之前，跳过
    if (date.getTime() < cursorMs) {
      const nextSecond = normalizeWallClock({ ...matched, second: matched.second + 1 });
      cursorMs = Math.max(
        zonedTimeToDate(nextSecond, timeZone).getTime(),
        cursorMs + 1000,
      );
      continue;
    }

    results.push({
      date,
      timestamp: date.getTime(),
      text: formatDateTime(date, { timeZone, withWeekday: false, locale }),
      weekday: formatWeekday(date, timeZone, locale),
      offset: formatOffsetText(date, timeZone),
    });

    cursorMs = date.getTime() + 1000;
  }

  return results;
}

/** 计算下一次运行时间，无解时返回 null */
export function getNextRunTime(
  expression: string,
  options: NextRunOptions = {},
): NextRunItem | null {
  const list = getNextRunTimes(expression, { ...options, count: 1 });
  return list.length ? list[0] : null;
}

/** 只取 Date 对象的便捷方法 */
export function getNextRunDates(
  expression: string,
  options: NextRunOptions = {},
): Date[] {
  return getNextRunTimes(expression, options).map((item) => item.date);
}

/** 判断表达式在未来一段时间内是否真的会触发 */
export function willEverRun(expression: string, options: NextRunOptions = {}): boolean {
  const syntax = options.syntax ?? 'quartz';
  const parsed = parseExpression(expression, syntax);
  if (!parsed.valid) return false;
  const spec = getSyntaxSpec(syntax);
  const from = toDate(options.from);
  const startWall = getWallClockParts(from, options.timeZone);
  const limit: WallClock = {
    year: startWall.year + (spec.id === 'quartz' && parsed.rules.year && !isUnrestricted(parsed.rules.year) ? 300 : 8),
    month: startWall.month,
    day: startWall.day,
    hour: startWall.hour,
    minute: startWall.minute,
    second: startWall.second,
    weekday: startWall.weekday,
  };
  const matched = searchNext(
    startWall,
    parsed.rules,
    syntax,
    !getFieldSpecs(syntax).some((fieldSpec) => fieldSpec.key === 'second'),
  );
  if (!matched) return false;
  return (
    matched.year < limit.year ||
    (matched.year === limit.year && matched.month <= limit.month)
  );
}
