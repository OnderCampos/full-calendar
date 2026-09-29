import { renderHook } from '@testing-library/react';
import { cn } from '../../lib/utils';
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
  HOUR_HEIGHT_PX,
} from './helpers';
import { getEvents, getUsers } from './requests';
import { eventSchema } from './schemas';
import type { IEvent } from './interfaces';

const mockUseCalendar = jest.fn();

jest.mock('./contexts/calendar-context', () => ({
  useCalendar: () => mockUseCalendar(),
}));

describe('calendar helpers and utilities', () => {
  const baseUser = { id: 'u1', name: 'Jane Doe', picturePath: null };
  const makeEvent = (
    id: number,
    startDate: string,
    endDate: string,
    title = `Event ${id}`,
    color: IEvent['color'] = 'blue',
  ): IEvent => ({
    id,
    startDate,
    endDate,
    title,
    color,
    description: 'desc',
    user: baseUser,
  });

  const events = [
    makeEvent(1, '2025-03-10T09:00:00.000Z', '2025-03-10T10:00:00.000Z'),
    makeEvent(2, '2025-03-10T09:30:00.000Z', '2025-03-10T11:00:00.000Z', 'Overlap', 'red'),
    makeEvent(3, '2025-03-11T00:00:00.000Z', '2025-03-13T00:00:00.000Z', 'Trip', 'green'),
    makeEvent(4, '2025-07-01T12:00:00.000Z', '2025-07-01T13:00:00.000Z', 'Later', 'yellow'),
    makeEvent(5, 'invalid', 'invalid', 'Broken', 'purple'),
  ];

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('merges class names with cn', () => {
    expect(cn('p-2', undefined, 'p-4', 'text-sm')).toContain('p-4');
    expect(cn('p-2', undefined, 'p-4', 'text-sm')).not.toContain('p-2');
  });

  it('formats ranges for all calendar views and default branch', () => {
    const date = new Date('2025-03-10T12:00:00.000Z');
    expect(rangeText('day', date)).toBe('Mar 10, 2025');
    expect(rangeText('month', date)).toBe('Mar 1, 2025 - Mar 31, 2025');
    expect(rangeText('week', date)).toContain('Mar');
    expect(rangeText('year', date)).toBe('Jan 1, 2025 - Dec 31, 2025');
    expect(rangeText('agenda', date)).toBe('Mar 1, 2025 - Mar 31, 2025');
    expect(rangeText('bad' as never, date)).toBe('Error while formatting');
  });

  it('navigates dates by view and direction', () => {
    const date = new Date('2025-03-10T00:00:00.000Z');
    expect(navigateDate(date, 'day', 'next').getDate()).toBe(11);
    expect(navigateDate(date, 'week', 'previous').getDate()).toBe(3);
    expect(navigateDate(date, 'month', 'next').getMonth()).toBe(3);
    expect(navigateDate(date, 'year', 'previous').getFullYear()).toBe(2024);
    expect(navigateDate(date, 'agenda', 'next').getMonth()).toBe(3);
  });

  it('counts events by supported view', () => {
    const date = new Date('2025-03-10T00:00:00.000Z');
    expect(getEventsCount(events, date, 'day')).toBe(2);
    expect(getEventsCount(events, date, 'week')).toBe(3);
    expect(getEventsCount(events, date, 'month')).toBe(3);
    expect(getEventsCount(events, new Date('2025-07-01T00:00:00.000Z'), 'year')).toBe(4);
    expect(getEventsCount(events, date, 'agenda')).toBe(3);
  });

  it('groups overlapping events and computes block styles', () => {
    const grouped = groupEvents([events[1], events[0]]);
    expect(grouped).toHaveLength(2);
    const style = getEventBlockStyle(events[0], new Date('2025-03-10T00:00:00.000Z'), 1, 2);
    expect(style).toEqual({ top: '37.5%', width: '50%', left: '50%' });
  });

  it('builds calendar cells spanning previous and next month filler cells', () => {
    const cells = getCalendarCells(new Date('2025-03-10T00:00:00.000Z'));
    expect(cells).toHaveLength(42);
    expect(cells[0].currentMonth).toBe(false);
    expect(cells[0].day).toBe(23);
    expect(cells[cells.length - 1].currentMonth).toBe(false);
    expect(cells.some((cell) => cell.day === 1 && cell.currentMonth)).toBe(true);
  });

  it('calculates month event positions and merges month cell events ordering', () => {
    const positions = calculateMonthEventPositions(
      [events[2]],
      [events[0], events[1]],
      new Date('2025-03-10T00:00:00.000Z'),
    );
    expect(positions[3]).toBe(0);
    const cellEvents = getMonthCellEvents(new Date('2025-03-11T00:00:00.000Z'), [events[2]], positions);
    expect(cellEvents[0].id).toBe(3);
    expect(cellEvents[0]).toMatchObject({ isMultiDay: true, position: 0 });
  });

  it('formats time and handles invalid inputs', () => {
    expect(formatTime('2025-03-10T09:15:00.000Z', true)).toBe('09:15');
    expect(formatTime(new Date('2025-03-10T21:15:00.000Z'), false)).toContain('PM');
    expect(formatTime('bad-date', true)).toBe('');
  });

  it('extracts initials and capitalizes text safely', () => {
    expect(getFirstLetters('John Smith')).toBe('JS');
    expect(getFirstLetters('solo')).toBe('S');
    expect(getFirstLetters('')).toBe('');
    expect(toCapitalize('hello')).toBe('Hello');
    expect(toCapitalize('')).toBe('');
  });

  it('filters events for a day including multi-day point metadata', () => {
    const sameDay = getEventsForDay(events, new Date('2025-03-10T00:00:00.000Z'));
    expect(sameDay.find((event) => event.id === 1)?.point).toBe('none');
    const multiStart = getEventsForDay(events, new Date('2025-03-11T00:00:00.000Z'), true);
    expect(multiStart).toHaveLength(1);
    expect(multiStart[0].point).toBe('start');
    const multiEnd = getEventsForDay(events, new Date('2025-03-13T00:00:00.000Z'), true);
    expect(multiEnd[0].point).toBe('end');
  });

  it('filters events for week, month and year while rejecting invalid dates', () => {
    expect(getWeekDates(new Date('2025-03-12T00:00:00.000Z'))).toHaveLength(7);
    expect(getEventsForWeek(events, new Date('2025-03-12T00:00:00.000Z')).map((e) => e.id)).toEqual([1, 2, 3]);
    expect(getEventsForMonth(events, new Date('2025-03-12T00:00:00.000Z')).map((e) => e.id)).toEqual([1, 2, 3]);
    expect(getEventsForYear(events, new Date('2025-03-12T00:00:00.000Z')).map((e) => e.id)).toEqual([1, 2, 3, 4]);
    expect(getEventsForYear(null as never, new Date('invalid'))).toEqual([]);
  });

  it('returns color classes and background classes with fallback', () => {
    expect(getColorClass('blue')).toContain('border-blue-200');
    expect(getBgColor('red')).toContain('bg-red-400');
    expect(getColorClass('unknown')).toBe('');
    expect(getBgColor('unknown')).toBe('');
  });

  it('selects events by current calendar mode via mocked mediator context', () => {
    mockUseCalendar.mockReturnValue({ view: 'day', selectedDate: new Date('2025-03-10T00:00:00.000Z'), startOfDayHour: 8 });
    const { result: dayResult } = renderHook(() => useGetEventsByMode(events));
    expect(dayResult.current.map((e) => e.id)).toEqual([1, 2]);

    mockUseCalendar.mockReturnValue({ view: 'week', selectedDate: new Date('2025-03-10T00:00:00.000Z'), startOfDayHour: 8 });
    const { result: weekResult } = renderHook(() => useGetEventsByMode(events));
    expect(weekResult.current.map((e) => e.id)).toEqual([1, 2, 3]);

    mockUseCalendar.mockReturnValue({ view: 'month', selectedDate: new Date('2025-03-10T00:00:00.000Z'), startOfDayHour: 8 });
    const { result: monthResult } = renderHook(() => useGetEventsByMode(events));
    expect(monthResult.current.map((e) => e.id)).toEqual([1, 2, 3]);

    mockUseCalendar.mockReturnValue({ view: 'agenda', selectedDate: new Date('2025-03-10T00:00:00.000Z'), startOfDayHour: 8 });
    const { result: agendaResult } = renderHook(() => useGetEventsByMode(events));
    expect(agendaResult.current.map((e) => e.id)).toEqual([1, 2, 3]);

    mockUseCalendar.mockReturnValue({ view: 'year', selectedDate: new Date('2025-03-10T00:00:00.000Z'), startOfDayHour: 7 });
    const { result: yearResult } = renderHook(() => useGetEventsByMode(events));
    expect(yearResult.current.map((e) => e.id)).toEqual([1, 2, 3, 4]);

    mockUseCalendar.mockReturnValue({ view: 'other', selectedDate: new Date('2025-03-10T00:00:00.000Z'), startOfDayHour: 7 });
    const { result: unknownResult } = renderHook(() => useGetEventsByMode(events));
    expect(unknownResult.current).toEqual([]);

    const { result: scrollResult } = renderHook(() => useScrollPosition());
    expect(scrollResult.current).toBe(7 * HOUR_HEIGHT_PX);
  });

  it('returns mocked request data and validates schema', async () => {
    const requestEvents = await getEvents();
    const requestUsers = await getUsers();
    expect(Array.isArray(requestEvents)).toBe(true);
    expect(Array.isArray(requestUsers)).toBe(true);

    const parsed = eventSchema.safeParse({
      title: 'Meeting',
      description: 'Planning',
      startDate: new Date('2025-03-10T09:00:00.000Z'),
      endDate: new Date('2025-03-10T10:00:00.000Z'),
      color: 'blue',
    });
    expect(parsed.success).toBe(true);

    const invalid = eventSchema.safeParse({
      title: '',
      description: '',
      startDate: 'bad',
      endDate: new Date('2025-03-10T10:00:00.000Z'),
      color: 'cyan',
    });
    expect(invalid.success).toBe(false);
  });
});
