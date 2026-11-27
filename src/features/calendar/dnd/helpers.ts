import type { IEvent } from "@/features/calendar/interfaces";

export function calculateDroppedEventDates(
  event: IEvent,
  targetDate: Date,
  hour?: number,
  minute?: number,
) {
  const originalStart = new Date(event.startDate);
  const originalEnd = new Date(event.endDate);
  const duration = originalEnd.getTime() - originalStart.getTime();

  const newStart = new Date(targetDate);
  if (hour !== undefined) {
    newStart.setHours(hour, minute || 0, 0, 0);
  } else {
    newStart.setHours(
      originalStart.getHours(),
      originalStart.getMinutes(),
      0,
      0,
    );
  }

  return {
    newStart,
    newEnd: new Date(newStart.getTime() + duration),
  };
}
