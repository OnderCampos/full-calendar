import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockUseCalendar = jest.fn();

jest.mock('@/features/calendar/contexts/calendar-context', () => ({
  useCalendar: () => mockUseCalendar(),
}));

import { cn } from '@/lib/utils';
import {
  HOUR_HEIGHT_PX,
  calculateMonthEventPositions,
  formatTime,
  getBgColor,
  getCalendarCells,
  getColorClass,
  getEventBlockStyle,
  getEventsCount,
  getEventsForDay,
  getEventsForMonth,
  getEventsForWeek,
  getEventsForYear,
  getFirstLetters,
  getMonthCellEvents,
  getWeekDates,
  groupEvents,
  navigateDate,
  rangeText,
  toCapitalize,
  useGetEventsByMode,
  useScrollPosition,
} from '@/features/calendar/helpers';
import { getEvents, getUsers } from '@/features/calendar/requests';
import { CALENDAR_ITEMS_MOCK, USERS_MOCK } from '@/features/calendar/mocks';
import { eventSchema } from '@/features/calendar/schemas';
import type { IEvent } from '@/features/calendar/interfaces';

const originalEnv = process.env;

const makeEvent = (
  id: number,
  startDate: string,
  endDate: string,
  overrides: Partial<IEvent> = {},
): IEvent => ({
  id,
  startDate,
  endDate,
  title: `Event ${id}`,
  color: 'blue',
  description: 'desc',
  user: USERS_MOCK[0],
  ...overrides,
});

describe('calendar helpers and utilities', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, TEST_API_KEY: 'test-mock-key' };
    mockUseCalendar.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('merges class names with cn', () => {
    expect(cn('px-2', undefined, 'px-4', 'font-bold')).toBe('px-4 font-bold');
  });

  it('formats range text for each supported view', () => {
    const date = new Date('2025-03-15T10:00:00Z');

    expect(rangeText('day', date)).toBe('Mar 15, 2025');
    expect(rangeText('week', date)).toContain('Mar');
    expect(rangeText('month', date)).toBe('Mar 1, 2025 - Mar 31, 2025');
    expect(rangeText('year', date)).toBe('Jan 1, 2025 - Dec 31, 2025');
    expect(rangeText('agenda', date)).toBe('Mar 1, 2025 - Mar 31, 2025');
    expect(rangeText('invalid' as never, date)).toBe('Error while formatting');
  });

  it('navigates dates based on direction and view', () => {
    const date = new Date('2025-03-15T00:00:00Z');

    expect(navigateDate(date, 'day', 'next').getUTCDate()).toBe(16);
    expect(navigateDate(date, 'week', 'previous').getUTCDate()).toBe(8);
    expect(navigateDate(date, 'month', 'next').getUTCMonth()).toBe(3);
    expect(navigateDate(date, 'year', 'previous').getUTCFullYear()).toBe(2024);
    expect(navigateDate(date, 'agenda', 'next').getUTCMonth()).toBe(3);
  });

  it('counts events by selected view', () => {
    const events = [
      makeEvent(1, '2025-03-15T09:00:00.000Z', '2025-03-15T10:00:00.000Z'),
      makeEvent(2, '2025-03-16T09:00:00.000Z', '2025-03-16T10:00:00.000Z'),
      makeEvent(3, '2025-04-01T09:00:00.000Z', '2025-04-01T10:00:00.000Z'),
    ];
    const date = new Date('2025-03-15T12:00:00.000Z');

    expect(getEventsCount(events, date, 'day')).toBe(1);
    expect(getEventsCount(events, date, 'week')).toBe(2);
    expect(getEventsCount(events, date, 'month')).toBe(2);
    expect(getEventsCount(events, date, 'year')).toBe(3);
    expect(getEventsCount(events, date, 'agenda')).toBe(2);
  });

  it('groups overlapping events into separate columns', () => {
    const events = [
      makeEvent(1, '2025-03-15T09:00:00.000Z', '2025-03-15T10:00:00.000Z'),
      makeEvent(2, '2025-03-15T09:30:00.000Z', '2025-03-15T11:00:00.000Z'),
      makeEvent(3, '2025-03-15T10:00:00.000Z', '2025-03-15T11:00:00.000Z'),
    ];

    const groups = groupEvents(events);

    expect(groups).toHaveLength(2);
    expect(groups[0].map((event) => event.id)).toEqual([1, 3]);
    expect(groups[1].map((event) => event.id)).toEqual([2]);
  });

  it('computes event block style including day clipping', () => {
    const result = getEventBlockStyle(
      makeEvent(1, '2025-03-14T23:30:00.000Z', '2025-03-15T01:00:00.000Z'),
      new Date('2025-03-15T12:00:00.000Z'),
      1,
      2,
    );

    expect(result).toEqual({ top: '0%', width: '50%', left: '50%' });
  });

  it('builds padded calendar cells for a month grid', () => {
    const cells = getCalendarCells(new Date('2025-03-15T00:00:00.000Z'));

    expect(cells).toHaveLength(42);
    expect(cells[0].currentMonth).toBe(false);
    expect(cells.some((cell) => cell.currentMonth && cell.day === 15)).toBe(true);
    expect(cells.at(-1)?.currentMonth).toBe(false);
  });

  it('calculates month event positions and sorts month cell events', () => {
    const multiDay = [
      makeEvent(1, '2025-03-02T00:00:00.000Z', '2025-03-04T00:00:00.000Z'),
      makeEvent(2, '2025-03-02T00:00:00.000Z', '2025-03-03T00:00:00.000Z'),
    ];
    const singleDay = [
      makeEvent(3, '2025-03-03T09:00:00.000Z', '2025-03-03T10:00:00.000Z'),
      makeEvent(4, '2025-03-03T11:00:00.000Z', '2025-03-03T12:00:00.000Z'),
    ];

    const positions = calculateMonthEventPositions(multiDay, singleDay, new Date('2025-03-15T00:00:00.000Z'));
    const monthEvents = getMonthCellEvents(
      new Date('2025-03-03T08:00:00.000Z'),
      [...multiDay, ...singleDay],
      positions,
    );

    expect(positions[1]).toBe(0);
    expect(positions[2]).toBe(1);
    expect(monthEvents.map((event) => event.id)).toEqual([1, 2, 3, 4]);
    expect(monthEvents[0]).toMatchObject({ isMultiDay: true, position: 0 });
    expect(monthEvents[2]).toMatchObject({ isMultiDay: false });
  });

  it('formats time in 12h and 24h modes and handles invalid input', () => {
    expect(formatTime('2025-03-15T13:05:00.000Z', true)).toBe('13:05');
    expect(formatTime('2025-03-15T13:05:00.000Z', false)).toContain('1:05');
    expect(formatTime('invalid-date', true)).toBe('');
  });

  it('extracts initials and capitalizes words safely', () => {
    expect(getFirstLetters('John Doe')).toBe('JD');
    expect(getFirstLetters('john')).toBe('J');
    expect(getFirstLetters('')).toBe('');
    expect(toCapitalize('calendar')).toBe('Calendar');
    expect(toCapitalize('')).toBe('');
  });

  it('gets events for a day and annotates start, end and none points', () => {
    const date = new Date('2025-03-03T00:00:00.000Z');
    const events = [
      makeEvent(1, '2025-03-03T09:00:00.000Z', '2025-03-03T10:00:00.000Z'),
      makeEvent(2, '2025-03-03T09:00:00.000Z', '2025-03-05T10:00:00.000Z'),
      makeEvent(3, '2025-03-01T09:00:00.000Z', '2025-03-03T10:00:00.000Z'),
    ];

    const regular = getEventsForDay(events, date);
    const weekMode = getEventsForDay(events, date, true);

    expect(regular.map((event) => event.point)).toEqual(['none', 'start', 'end']);
    expect(weekMode.map((event) => event.id)).toEqual([2, 3]);
  });

  it('gets week dates and filters events for week, month and year', () => {
    const baseDate = new Date('2025-03-12T00:00:00.000Z');
    const events = [
      makeEvent(1, '2025-03-10T00:00:00.000Z', '2025-03-10T01:00:00.000Z'),
      makeEvent(2, '2025-04-01T00:00:00.000Z', '2025-04-01T01:00:00.000Z'),
      makeEvent(3, '2025-12-31T00:00:00.000Z', '2026-01-01T01:00:00.000Z'),
      makeEvent(4, 'invalid', '2025-03-11T01:00:00.000Z'),
    ];

    const weekDates = getWeekDates(baseDate);

    expect(weekDates).toHaveLength(7);
    expect(weekDates[0].getDay()).toBe(1);
    expect(getEventsForWeek(events, baseDate).map((event) => event.id)).toEqual([1]);
    expect(getEventsForMonth(events, baseDate).map((event) => event.id)).toEqual([1]);
    expect(getEventsForYear(events, baseDate).map((event) => event.id)).toEqual([1, 2, 3]);
    expect(getEventsForYear(null as never, new Date('invalid'))).toEqual([]);
  });

  it('returns color utility classes and empty string for unknown colors', () => {
    expect(getColorClass('blue')).toContain('border-blue-200');
    expect(getBgColor('red')).toContain('bg-red-400');
    expect(getColorClass('unknown')).toBe('');
    expect(getBgColor('unknown')).toBe('');
  });

  it('selects events based on calendar mode and computes scroll position through mocked mediator', () => {
    const events = [makeEvent(1, '2025-03-15T09:00:00.000Z', '2025-03-15T10:00:00.000Z')];
    mockUseCalendar.mockReturnValue({
      view: 'day',
      selectedDate: new Date('2025-03-15T00:00:00.000Z'),
      startOfDayHour: 6,
    });

    expect(useGetEventsByMode(events)).toHaveLength(1);
    expect(useScrollPosition()).toBe(6 * HOUR_HEIGHT_PX);

    mockUseCalendar.mockReturnValue({
      view: 'invalid',
      selectedDate: new Date('2025-03-15T00:00:00.000Z'),
      startOfDayHour: 1,
    });

    expect(useGetEventsByMode(events)).toEqual([]);
  });

  it('returns mocked requests data without external io', async () => {
    await expect(getEvents()).resolves.toBe(CALENDAR_ITEMS_MOCK);
    await expect(getUsers()).resolves.toBe(USERS_MOCK);
    expect(process.env.TEST_API_KEY).toBe('test-mock-key');
  });

  it('validates event schema for success and failure cases', () => {
    const valid = eventSchema.safeParse({
      title: 'Meeting',
      description: 'Sprint planning',
      startDate: new Date('2025-03-15T09:00:00.000Z'),
      endDate: new Date('2025-03-15T10:00:00.000Z'),
      color: 'green',
    });
    const invalid = eventSchema.safeParse({
      title: '',
      description: '',
      startDate: 'bad',
      endDate: 'bad',
      color: 'pink',
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
