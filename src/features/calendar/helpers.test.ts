import { describe, it, expect, jest, afterEach } from '@jest/globals';

jest.mock('../calendar/contexts/calendar-context', () => ({
  useCalendar: jest.fn(),
}));

import {
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
} from './helpers';

const { useCalendar } = jest.requireMock('../calendar/contexts/calendar-context') as {
  useCalendar: jest.Mock;
};

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  delete process.env.TEST_API_KEY;
});

const user = { id: 'u1', name: 'User One', picturePath: null };
const baseEvents = [
  {
    id: 1,
    startDate: '2025-01-15T09:00:00.000Z',
    endDate: '2025-01-15T10:00:00.000Z',
    title: 'Morning sync',
    color: 'blue' as const,
    description: 'desc',
    user,
  },
  {
    id: 2,
    startDate: '2025-01-15T09:30:00.000Z',
    endDate: '2025-01-15T11:00:00.000Z',
    title: 'Overlap',
    color: 'red' as const,
    description: 'desc',
    user,
  },
  {
    id: 3,
    startDate: '2025-01-14T00:00:00.000Z',
    endDate: '2025-01-16T00:00:00.000Z',
    title: 'Conference',
    color: 'green' as const,
    description: 'desc',
    user,
  },
];

describe('calendar helpers', () => {
  it('formats date ranges for all views and handles invalid view fallback', () => {
    const date = new Date('2025-01-15T12:00:00.000Z');

    expect(rangeText('day', date)).toBe('Jan 15, 2025');
    expect(rangeText('month', date)).toContain('Jan 1, 2025 - Jan 31, 2025');
    expect(rangeText('week', date)).toContain('Jan');
    expect(rangeText('year', date)).toContain('Jan 1, 2025 - Dec 31, 2025');
    expect(rangeText('agenda', date)).toContain('Jan 1, 2025 - Jan 31, 2025');
    expect(rangeText('invalid' as never, date)).toBe('Error while formatting');
  });

  it('navigates dates based on view and direction', () => {
    const date = new Date('2025-01-15T00:00:00.000Z');

    expect(navigateDate(date, 'day', 'next').getDate()).toBe(16);
    expect(navigateDate(date, 'week', 'previous').getDate()).toBe(8);
    expect(navigateDate(date, 'month', 'next').getMonth()).toBe(1);
    expect(navigateDate(date, 'year', 'previous').getFullYear()).toBe(2024);
    expect(navigateDate(date, 'agenda', 'next').getMonth()).toBe(1);
  });

  it('counts events by selected view', () => {
    const date = new Date('2025-01-15T00:00:00.000Z');

    expect(getEventsCount(baseEvents, date, 'day')).toBe(2);
    expect(getEventsCount(baseEvents, date, 'week')).toBe(3);
    expect(getEventsCount(baseEvents, date, 'month')).toBe(3);
    expect(getEventsCount(baseEvents, date, 'year')).toBe(3);
    expect(getEventsCount(baseEvents, date, 'agenda')).toBe(3);
  });

  it('groups overlapping events into columns', () => {
    const grouped = groupEvents(baseEvents.slice(0, 2));

    expect(grouped).toHaveLength(2);
    expect(grouped[0][0].id).toBe(1);
    expect(grouped[1][0].id).toBe(2);
  });

  it('calculates event block style respecting day start and group size', () => {
    const style = getEventBlockStyle(baseEvents[0], new Date('2025-01-15T00:00:00.000Z'), 1, 2);

    expect(style).toEqual({ top: '37.5%', width: '50%', left: '50%' });
  });

  it('builds calendar cells including previous and next month filler days', () => {
    const cells = getCalendarCells(new Date('2025-02-15T00:00:00.000Z'));

    expect(cells.length % 7).toBe(0);
    expect(cells.some((cell) => cell.currentMonth)).toBe(true);
    expect(cells[0].currentMonth).toBe(false);
    expect(cells[cells.length - 1].currentMonth).toBe(false);
  });

  it('calculates month event positions and returns sorted month cell events', () => {
    const multiDayEvents = [baseEvents[2]];
    const singleDayEvents = [baseEvents[0], baseEvents[1]];
    const positions = calculateMonthEventPositions(
      multiDayEvents,
      singleDayEvents,
      new Date('2025-01-15T00:00:00.000Z'),
    );

    expect(positions['3']).toBe(0);

    const monthEvents = getMonthCellEvents(
      new Date('2025-01-15T00:00:00.000Z'),
      baseEvents,
      positions,
    );

    expect(monthEvents[0].id).toBe(3);
    expect(monthEvents[0]).toMatchObject({ isMultiDay: true, position: 0 });
  });

  it('formats time in 12h and 24h mode and returns empty string for invalid date', () => {
    expect(formatTime('2025-01-15T13:05:00.000Z', true)).toBe('13:05');
    expect(formatTime('2025-01-15T13:05:00.000Z', false)).toContain('1:05');
    expect(formatTime('not-a-date', true)).toBe('');
  });

  it('returns initials and capitalized values safely', () => {
    expect(getFirstLetters('John Doe')).toBe('JD');
    expect(getFirstLetters('single')).toBe('S');
    expect(getFirstLetters('')).toBe('');
    expect(toCapitalize('calendar')).toBe('Calendar');
    expect(toCapitalize('')).toBe('');
  });

  it('filters events for day including multi-day point metadata for week mode', () => {
    const results = getEventsForDay(baseEvents, new Date('2025-01-15T00:00:00.000Z'), true);

    expect(results).toHaveLength(3);
    expect(results.find((event) => event.id === 3)).toHaveProperty('point', undefined);
    expect(results.find((event) => event.id === 1)).toHaveProperty('point', 'none');
  });

  it('returns week dates starting on monday and filters week, month and year events', () => {
    const weekDates = getWeekDates(new Date('2025-01-15T00:00:00.000Z'));
    expect(weekDates).toHaveLength(7);
    expect(weekDates[0].getDay()).toBe(1);

    expect(getEventsForWeek(baseEvents, new Date('2025-01-15T00:00:00.000Z'))).toHaveLength(3);
    expect(getEventsForMonth(baseEvents, new Date('2025-01-15T00:00:00.000Z'))).toHaveLength(3);
    expect(getEventsForYear(baseEvents, new Date('2025-01-15T00:00:00.000Z'))).toHaveLength(3);
    expect(getEventsForYear(null as never, new Date('invalid'))).toEqual([]);
  });

  it('returns configured color classes and blank for unknown colors', () => {
    expect(getColorClass('blue')).toContain('bg-blue-50');
    expect(getBgColor('red')).toContain('bg-red-400');
    expect(getColorClass('unknown')).toBe('');
    expect(getBgColor('unknown')).toBe('');
  });

  it('uses mocked calendar context for mode-based event retrieval and scroll position', () => {
    process.env.TEST_API_KEY = 'test-mock-key';
    useCalendar.mockReturnValue({
      view: 'day',
      selectedDate: new Date('2025-01-15T00:00:00.000Z'),
      startOfDayHour: 6,
    });

    expect(useGetEventsByMode(baseEvents)).toHaveLength(3);
    expect(useScrollPosition()).toBe(576);

    useCalendar.mockReturnValue({
      view: 'week',
      selectedDate: new Date('2025-01-15T00:00:00.000Z'),
      startOfDayHour: 8,
    });
    expect(useGetEventsByMode(baseEvents)).toHaveLength(3);

    useCalendar.mockReturnValue({
      view: 'month',
      selectedDate: new Date('2025-01-15T00:00:00.000Z'),
      startOfDayHour: 8,
    });
    expect(useGetEventsByMode(baseEvents)).toHaveLength(3);

    useCalendar.mockReturnValue({
      view: 'year',
      selectedDate: new Date('2025-01-15T00:00:00.000Z'),
      startOfDayHour: 8,
    });
    expect(useGetEventsByMode(baseEvents)).toHaveLength(3);

    useCalendar.mockReturnValue({
      view: 'unknown',
      selectedDate: new Date('2025-01-15T00:00:00.000Z'),
      startOfDayHour: 8,
    });
    expect(useGetEventsByMode(baseEvents)).toEqual([]);
  });
});
