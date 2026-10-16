import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationError } from '@angular/router';
import { vi } from 'vitest';

import { Common } from '@core/services';

import { clearChunkReloadFlag, navigationErrorHandler } from './navigation-error-handler';

const CHUNK_ERROR = new TypeError(
  'Failed to fetch dynamically imported module: http://localhost:4200/chunk-WYQAFE64.js',
);

function createEvent(error: unknown, url = '/app/admin-dashboard'): NavigationError {
  return new NavigationError(1, url, error);
}

describe('navigationErrorHandler', () => {
  const commonMock = { showMessage: vi.fn() };
  const assign = vi.fn();

  let store: Map<string, string>;
  let sessionStorage: Storage;
  let windowStub: Window;

  function configure(defaultView: Window | null): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: commonMock },
        { provide: DOCUMENT, useValue: { defaultView } },
      ],
    });
  }

  function run(event: NavigationError): void {
    TestBed.runInInjectionContext(() => navigationErrorHandler(event));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();

    store = new Map<string, string>();
    sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    } as unknown as Storage;

    windowStub = { sessionStorage, location: { assign } } as unknown as Window;
  });

  it('should reload once to the failed url on a chunk load error', () => {
    configure(windowStub);

    run(createEvent(CHUNK_ERROR));

    expect(assign).toHaveBeenCalledWith('/app/admin-dashboard');
    expect(commonMock.showMessage).not.toHaveBeenCalled();
    expect(store.get('skolenza/chunk-reload')).toBe('/app/admin-dashboard');
  });

  it('should show an error instead of reloading again for the same url', () => {
    configure(windowStub);
    store.set('skolenza/chunk-reload', '/app/admin-dashboard');

    run(createEvent(CHUNK_ERROR));

    expect(assign).not.toHaveBeenCalled();
    expect(commonMock.showMessage).toHaveBeenCalledWith(expect.any(String), 'error');
    expect(store.has('skolenza/chunk-reload')).toBe(false);
  });

  it('should still reload when a different url failed before', () => {
    configure(windowStub);
    store.set('skolenza/chunk-reload', '/app/dashboard');

    run(createEvent(CHUNK_ERROR));

    expect(assign).toHaveBeenCalledWith('/app/admin-dashboard');
  });

  it('should show an error and never reload for a non chunk error', () => {
    configure(windowStub);

    run(createEvent(new Error('resolver blew up')));

    expect(assign).not.toHaveBeenCalled();
    expect(commonMock.showMessage).toHaveBeenCalledWith(
      'Navigation failed. Please try again.',
      'error',
    );
  });

  it('should reload without the guard when session storage throws', () => {
    const blocked = {
      sessionStorage: {
        getItem: () => {
          throw new DOMException('blocked', 'SecurityError');
        },
        setItem: () => {
          throw new DOMException('blocked', 'SecurityError');
        },
        removeItem: () => {
          throw new DOMException('blocked', 'SecurityError');
        },
      },
      location: { assign },
    } as unknown as Window;
    configure(blocked);

    expect(() => run(createEvent(CHUNK_ERROR))).not.toThrow();
    expect(assign).toHaveBeenCalledWith('/app/admin-dashboard');
  });

  it('should show an error when there is no window', () => {
    configure(null);

    run(createEvent(CHUNK_ERROR));

    expect(assign).not.toHaveBeenCalled();
    expect(commonMock.showMessage).toHaveBeenCalledWith(
      'Navigation failed. Please try again.',
      'error',
    );
  });
});

describe('clearChunkReloadFlag', () => {
  it('should remove the guard', () => {
    const store = new Map<string, string>([['skolenza/chunk-reload', '/app/dashboard']]);
    const win = {
      sessionStorage: { removeItem: (key: string) => void store.delete(key) },
    } as unknown as Window;

    clearChunkReloadFlag(win);

    expect(store.size).toBe(0);
  });

  it('should do nothing without a window', () => {
    expect(() => clearChunkReloadFlag(null)).not.toThrow();
  });
});
