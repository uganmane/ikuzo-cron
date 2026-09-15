import { DOW_NAMES_EN, DOW_NAMES_ZH } from './syntax';
import type { CronLocale } from './types';

/** 挂钟时间（某个时区下看到的年月日时分秒） */
export interface WallClock {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0=周日 … 6=周六 */
  weekday: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** 取系统本地时区名 */
export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** 校验是否是合法的 IANA 时区名 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** 取某个瞬时在指定时区下的挂钟时间 */
export function getWallClockParts(date: Date, timeZone?: string): WallClock {
  if (!timeZone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      weekday: date.getDay(),
    };
  }
  const parts = getFormatter(timeZone).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute);
  const second = Number(map.second);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/** 取某时区在某瞬时的 UTC 偏移（分钟） */
export function getOffsetMinutes(date: Date, timeZone?: string): number {
  if (!timeZone) return -date.getTimezoneOffset();
  const wall = getWallClockParts(date, timeZone);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  const ts = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - ts) / 60000);
}

/**
 * 把某时区下的挂钟时间转换为 UTC 瞬时。
 *
 * 若该挂钟时间因夏令时不存在，返回被就近推移后的瞬时；
 * 调用方可用 `getWallClockParts` 回读校验。
 */
export function zonedTimeToDate(wall: Omit<WallClock, 'weekday'>, timeZone?: string): Date {
  if (!timeZone) {
    return new Date(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute,
      wall.second,
    );
  }
  const utcGuess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  const offset1 = getOffsetMinutes(new Date(utcGuess), timeZone);
  let timestamp = utcGuess - offset1 * 60000;
  const offset2 = getOffsetMinutes(new Date(timestamp), timeZone);
  if (offset2 !== offset1) timestamp = utcGuess - offset2 * 60000;
  return new Date(timestamp);
}

/** 把挂钟时间的字段做溢出归一化（用于迭代推进） */
export function normalizeWallClock(wall: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): WallClock {
  const date = new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second),
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    weekday: 0,
  };
}

/** 当月天数 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 某天的归一化星期（0=周日） */
export function getWeekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 当月最后一个工作日 */
export function getLastWeekdayOfMonth(year: number, month: number): number {
  const lastDay = getDaysInMonth(year, month);
  const weekday = getWeekdayOf(year, month, lastDay);
  if (weekday === 6) return lastDay - 1;
  if (weekday === 0) return lastDay - 2;
  return lastDay;
}

/** 距离指定日期最近的工作日（Quartz 的 nW 语义） */
export function getNearestWeekday(year: number, month: number, day: number): number {
  const lastDay = getDaysInMonth(year, month);
  let target = Math.min(Math.max(day, 1), lastDay);
  const weekday = getWeekdayOf(year, month, target);
  if (weekday === 6) {
    target = target - 1 >= 1 ? target - 1 : target + 2;
  } else if (weekday === 0) {
    target = target + 1 <= lastDay ? target + 1 : target - 2;
  }
  return target;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** 把 UTC 偏移分钟数格式化为 `UTC+08:00` */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** 取某瞬时在指定时区下的偏移文本 */
export function formatOffsetText(date: Date, timeZone?: string): string {
  return formatOffset(getOffsetMinutes(date, timeZone));
}

export interface FormatDateTimeOptions {
  /** IANA 时区，不传使用本地时区 */
  timeZone?: string;
  /** 是否附带星期，默认 true */
  withWeekday?: boolean;
  /** 是否附带秒，默认 true */
  withSecond?: boolean;
  /** 语言，默认 zh-CN */
  locale?: CronLocale;
}

/** 把瞬时格式化为目标时区下的 `YYYY-MM-DD HH:mm:ss 周X` */
export function formatDateTime(date: Date, options: FormatDateTimeOptions = {}): string {
  const { timeZone, withWeekday = true, withSecond = true, locale = 'zh-CN' } = options;
  const wall = getWallClockParts(date, timeZone);
  const datePart = `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
  const timePart = withSecond
    ? `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}`
    : `${pad(wall.hour)}:${pad(wall.minute)}`;
  if (!withWeekday) return `${datePart} ${timePart}`;
  const names = locale === 'en-US' ? DOW_NAMES_EN : DOW_NAMES_ZH;
  return `${datePart} ${timePart} ${names[wall.weekday]}`;
}

/** 取目标时区下的星期文本 */
export function formatWeekday(date: Date, timeZone?: string, locale: CronLocale = 'zh-CN'): string {
  const wall = getWallClockParts(date, timeZone);
  const names = locale === 'en-US' ? DOW_NAMES_EN : DOW_NAMES_ZH;
  return names[wall.weekday];
}

/** 把瞬时格式化为 ISO 字符串（含时区偏移） */
export function formatIso(date: Date, timeZone?: string): string {
  if (!timeZone) return date.toISOString();
  const wall = getWallClockParts(date, timeZone);
  const offset = getOffsetMinutes(date, timeZone);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return (
    `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T` +
    `${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
