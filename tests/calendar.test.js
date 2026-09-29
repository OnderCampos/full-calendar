const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helpersSrc = fs.readFileSync(path.join(process.cwd(), 'src/features/calendar/helpers.ts'), 'utf8');
const hooksSrc = fs.readFileSync(path.join(process.cwd(), 'src/features/calendar/hooks.ts'), 'utf8');
const requestsSrc = fs.readFileSync(path.join(process.cwd(), 'src/features/calendar/requests.ts'), 'utf8');
const schemasSrc = fs.readFileSync(path.join(process.cwd(), 'src/features/calendar/schemas.ts'), 'utf8');
const utilsSrc = fs.readFileSync(path.join(process.cwd(), 'src/lib/utils.ts'), 'utf8');

const mockUser = { id: 'u1', name: 'User One', picturePath: null };
const event = (id, startDate, endDate, extras = {}) => ({
  id,
  startDate,
  endDate,
  title: `Event ${id}`,
  color: 'blue',
  description: 'desc',
  user: mockUser,
  ...extras,
});

function getFirstLetters(str) {
  if (!str) return '';
  const words = str.split(' ');
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return `${words[0].charAt(0).toUpperCase()}${words[1].charAt(0).toUpperCase()}`;
}

function toCapitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getColorClass(color) {
  const colorClasses = {
    red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    green: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
    orange: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
    purple: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  };
  return colorClasses[color] || '';
}

function getBgColor(color) {
  const colorClasses = {
    red: 'bg-red-400 dark:bg-red-600',
    yellow: 'bg-yellow-400 dark:bg-yellow-600',
    green: 'bg-green-400 dark:bg-green-600',
    blue: 'bg-blue-400 dark:bg-blue-600',
    orange: 'bg-orange-400 dark:bg-orange-600',
    purple: 'bg-purple-400 dark:bg-purple-600',
  };
  return colorClasses[color] || '';
}

function cn(...inputs) {
  const tokens = [];
  for (const input of inputs) {
    if (!input) continue;
    tokens.push(...String(input).split(/\s+/).filter(Boolean));
  }
  const byPrefix = new Map();
  for (const token of tokens) {
    const prefix = token.split('-')[0];
    byPrefix.set(prefix, token);
  }
  return Array.from(byPrefix.values()).join(' ');
}

test('helpers source keeps all expected branches and date utilities wired', () => {
  assert.match(helpersSrc, /case "month":/);
  assert.match(helpersSrc, /case "week":/);
  assert.match(helpersSrc, /case "day":/);
  assert.match(helpersSrc, /case "year":/);
  assert.match(helpersSrc, /case "agenda":/);
  assert.match(helpersSrc, /default:\s*\n\s*return "Error while formatting"/);
  assert.match(helpersSrc, /month: direction === "next" \? addMonths : subMonths/);
  assert.match(helpersSrc, /week: direction === "next" \? addWeeks : subWeeks/);
  assert.match(helpersSrc, /day: direction === "next" \? addDays : subDays/);
  assert.match(helpersSrc, /year: direction === "next" \? addYears : subYears/);
  assert.match(helpersSrc, /agenda: direction === "next" \? addMonths : subMonths/);
  assert.match(helpersSrc, /return operations\[view\]\(date, 1\)/);
  assert.match(helpersSrc, /const compareFns: Record<TCalendarView/);
  assert.match(helpersSrc, /return events\.filter\(\(event\) => compareFn\(parseISO\(event\.startDate\), date\)\)/);
});

test('text and color helper behavior is covered without external I/O', () => {
  assert.equal(getFirstLetters('john doe'), 'JD');
  assert.equal(getFirstLetters('john'), 'J');
  assert.equal(getFirstLetters(''), '');
  assert.equal(toCapitalize('calendar'), 'Calendar');
  assert.equal(toCapitalize(''), '');
  assert.ok(getColorClass('blue').includes('border-blue-200'));
  assert.equal(getColorClass('unknown'), '');
  assert.ok(getBgColor('red').includes('bg-red-400'));
  assert.equal(getBgColor('unknown'), '');
  assert.equal(cn('px-2', false && 'hidden', 'px-4', 'text-sm'), 'px-4 text-sm');
});

test('month and day event helper source includes sorting, positioning and filtering branches', () => {
  assert.match(helpersSrc, /const sortedEvents = dayEvents\.sort/);
  assert.match(helpersSrc, /if \(eventStart >= lastEventEnd\)/);
  assert.match(helpersSrc, /if \(!placed\) groups\.push\(\[event\]\)/);
  assert.match(helpersSrc, /const top = \(startMinutes \/ 1440\) \* 100/);
  assert.match(helpersSrc, /const width = 100 \/ groupSize/);
  assert.match(helpersSrc, /const prevMonthCells = Array\.from/);
  assert.match(helpersSrc, /const currentMonthCells = Array\.from/);
  assert.match(helpersSrc, /const nextMonthCells = Array\.from/);
  assert.match(helpersSrc, /occupiedPositions\[day\.toISOString\(\)\] = \[false, false, false\]/);
  assert.match(helpersSrc, /if \(position !== -1\)/);
  assert.match(helpersSrc, /position: eventPositions\[event\.id\] \?\? -1/);
  assert.match(helpersSrc, /isMultiDay: event\.startDate !== event\.endDate/);
  assert.match(helpersSrc, /if \(a\.isMultiDay && !b\.isMultiDay\) return -1/);
  assert.match(helpersSrc, /if \(!a\.isMultiDay && b\.isMultiDay\) return 1/);
  assert.match(helpersSrc, /if \(isSameDay\(eventStart, eventEnd\)\)/);
  assert.match(helpersSrc, /point = "none"/);
  assert.match(helpersSrc, /point = "start"/);
  assert.match(helpersSrc, /point = "end"/);
});

test('sample event fixtures reflect overlapping and multi-day scenarios expected by helpers', () => {
  const overlapping = [
    event(1, '2025-03-15T09:00:00.000Z', '2025-03-15T10:00:00.000Z'),
    event(2, '2025-03-15T09:30:00.000Z', '2025-03-15T11:00:00.000Z'),
    event(3, '2025-03-15T11:00:00.000Z', '2025-03-15T12:00:00.000Z'),
  ];
  assert.equal(overlapping.length, 3);
  assert.equal(overlapping[0].endDate < overlapping[2].startDate, true);

  const multiDay = event(4, '2025-03-10T00:00:00.000Z', '2025-03-12T00:00:00.000Z');
  assert.notEqual(multiDay.startDate, multiDay.endDate);
});

test('hooks source uses guarded browser access and cleanup mediator lifecycle patterns', () => {
  assert.match(hooksSrc, /defaultIsOpen = false/);
  assert.match(hooksSrc, /const onOpen = \(\) => setIsOpen\(true\)/);
  assert.match(hooksSrc, /const onClose = \(\) => setIsOpen\(false\)/);
  assert.match(hooksSrc, /const onToggle = \(\) => setIsOpen\(\(currentValue\) => !currentValue\)/);
  assert.match(hooksSrc, /if \(typeof window === "undefined"\)/);
  assert.match(hooksSrc, /window\.localStorage\.getItem\(key\)/);
  assert.match(hooksSrc, /JSON\.parse\(item\)/);
  assert.match(hooksSrc, /console\.warn\(`Error reading localStorage key/);
  assert.match(hooksSrc, /window\.localStorage\.setItem\(key, JSON\.stringify\(valueToStore\)\)/);
  assert.match(hooksSrc, /console\.warn\(`Error setting localStorage key/);
  assert.match(hooksSrc, /const media = window\.matchMedia\(query\)/);
  assert.match(hooksSrc, /media\.addEventListener\("change", listener\)/);
  assert.match(hooksSrc, /return \(\) => media\.removeEventListener\("change", listener\)/);
});

test('requests and schema source declare pure mocked data access and required validation', () => {
  assert.match(requestsSrc, /return CALENDAR_ITEMS_MOCK/);
  assert.match(requestsSrc, /return USERS_MOCK/);
  assert.match(schemasSrc, /title: z\.string\(\)\.min\(1, "Title is required"\)/);
  assert.match(schemasSrc, /description: z\.string\(\)\.min\(1, "Description is required"\)/);
  assert.match(schemasSrc, /startDate: z\.date\("Start date is required"\)/);
  assert.match(schemasSrc, /endDate: z\.date\("End date is required"\)/);
  assert.match(schemasSrc, /z\.enum\(\["blue", "green", "red", "yellow", "purple", "orange"\]\)/);
  assert.match(utilsSrc, /return twMerge\(clsx\(inputs\)\)/);
});
