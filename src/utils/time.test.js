import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatAbsoluteTime, formatRelativeTime } from './time.js';

function ts(date) {
  return { toDate: () => date };
}

describe('formatAbsoluteTime', () => {
  it('formats as "h:mm am/pm Weekday Month Dayth, Year"', () => {
    // 2026-06-09 was a Tuesday — pick a date/time with a known ordinal edge case (9th -> "th").
    const date = new Date(2026, 5, 9, 9, 21); // June 9, 2026, 9:21am
    expect(formatAbsoluteTime(ts(date))).toBe('9:21 am Tuesday June 9th, 2026');
  });

  it('uses 12-hour clock with lowercase am/pm and pads minutes', () => {
    const date = new Date(2026, 0, 1, 13, 5); // Jan 1, 2026, 1:05pm
    expect(formatAbsoluteTime(ts(date))).toBe('1:05 pm Thursday January 1st, 2026');
  });

  it('returns empty string for a missing/invalid timestamp', () => {
    expect(formatAbsoluteTime(null)).toBe('');
    expect(formatAbsoluteTime(undefined)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date(2026, 5, 9, 12, 0, 0); // June 9, 2026, noon

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says "less than a minute ago" for anything under a minute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeTime(ts(new Date(now.getTime() - 30 * 1000)))).toBe('less than a minute ago');
  });

  it('says "N min ago" within the same hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeTime(ts(new Date(now.getTime() - 37 * 60 * 1000)))).toBe('37 min ago');
  });

  it('says "Nh ago" later the same calendar day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeTime(ts(new Date(2026, 5, 9, 3, 0)))).toBe('9h ago');
  });

  it('says "yesterday" for the previous calendar day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeTime(ts(new Date(2026, 5, 8, 23, 59)))).toBe('yesterday');
  });

  it('says "N days ago" for 2-6 calendar days back', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeTime(ts(new Date(2026, 5, 5, 12, 0)))).toBe('4 days ago');
  });

  it('says "a week ago" for 7-13 days back', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeTime(ts(new Date(2026, 5, 1, 12, 0)))).toBe('a week ago');
  });

  it('says "N weeks ago" for 14-27 days back', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(formatRelativeTime(ts(new Date(2026, 4, 20, 12, 0)))).toBe('2 weeks ago');
  });

  it('falls back to the absolute format beyond 28 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const old = new Date(2026, 0, 1, 9, 0);
    expect(formatRelativeTime(ts(old))).toBe(formatAbsoluteTime(ts(old)));
  });

  it('returns empty string for a missing/invalid timestamp', () => {
    expect(formatRelativeTime(null)).toBe('');
  });
});
