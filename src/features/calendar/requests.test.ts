import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { getEvents, getUsers } from './requests';
import { CALENDAR_ITEMS_MOCK, USERS_MOCK } from './mocks';

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  delete process.env.TEST_API_KEY;
});

describe('calendar requests', () => {
  it('returns mocked events and users without external I/O', async () => {
    process.env.TEST_API_KEY = 'test-mock-key';

    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      throw new Error('network should not be called');
    }) as never;

    await expect(getEvents()).resolves.toBe(CALENDAR_ITEMS_MOCK);
    await expect(getUsers()).resolves.toBe(USERS_MOCK);
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });
});
