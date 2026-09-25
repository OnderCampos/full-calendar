import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GET } from './route';

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  delete process.env.TEST_API_KEY;
});

describe('health route', () => {
  it('responds with HTTP 200', async () => {
    process.env.TEST_API_KEY = 'test-mock-key';
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      throw new Error('network should not be called');
    }) as never;

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });
});
