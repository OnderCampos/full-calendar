import { act, renderHook } from '@testing-library/react';
import { useDisclosure, useLocalStorage, useMediaQuery } from './hooks';

describe('calendar hooks', () => {
  const originalEnv = process.env;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    process.env = { ...originalEnv, TEST_API_KEY: 'test-mock-key' };
    window.localStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    window.localStorage.clear();
  });

  it('handles disclosure lifecycle', () => {
    const { result } = renderHook(() => useDisclosure({ defaultIsOpen: true }));
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.onClose());
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.onOpen());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.onToggle());
    expect(result.current.isOpen).toBe(false);
  });

  it('reads and writes localStorage values and updater callbacks', () => {
    window.localStorage.setItem('count', JSON.stringify(2));
    const { result } = renderHook(() => useLocalStorage('count', 0));
    expect(result.current[0]).toBe(2);

    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(window.localStorage.getItem('count')).toBe('5');

    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(6);
    expect(window.localStorage.getItem('count')).toBe('6');
  });

  it('falls back when localStorage read/write throws', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write failed');
    });

    const { result } = renderHook(() => useLocalStorage('broken', 9));
    expect(result.current[0]).toBe(9);
    act(() => result.current[1](10));
    expect(warnSpy).toHaveBeenCalled();
    expect(getItemSpy).toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('responds to media query changes and cleans up listeners', () => {
    let listener: (() => void) | undefined;
    let matches = true;
    const addEventListener = jest.fn((_: string, cb: () => void) => {
      listener = cb;
    });
    const removeEventListener = jest.fn();

    window.matchMedia = jest.fn().mockImplementation(() => ({
      get matches() {
        return matches;
      },
      addEventListener,
      removeEventListener,
    })) as typeof window.matchMedia;

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);

    act(() => {
      matches = false;
      listener?.();
    });
    expect(result.current).toBe(false);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
