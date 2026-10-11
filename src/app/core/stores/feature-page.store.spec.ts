import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, vi } from 'vitest';

import { FeaturePageApi } from '@core/services';
import { FeaturePageNode, GetMyMenuRes } from '@shared/interfaces';

import { FeaturePageStore } from './feature-page.store';

const CACHE_KEY = 'skolenza/feature-pages';

/** Trimmed from the live `/Navigation/my-menu` payload. */
function makeNode(over: Partial<FeaturePageNode> = {}): FeaturePageNode {
  return {
    id: 2,
    moduleCode: 'STAFF_MGMT',
    moduleName: 'StaffMember Management',
    pageName: 'staffMember-management',
    displayName: 'StaffMember Management',
    urlPath: null,
    iconKey: null,
    parentModuleId: null,
    isLeafNode: false,
    moduleScope: 1,
    children: [],
    operations: [],
    ...over,
  };
}

/** One leaf page, with the operations the live payload publishes for it. */
const BANK_PAGE: FeaturePageNode = makeNode({
  id: 10,
  moduleCode: 'STAFF_BANK_DETAILS',
  moduleName: 'StaffMember-Bank-Details',
  isLeafNode: true,
  operations: [{ id: 4, name: 'View', iconKey: 'eye' }],
});

function envelope(items: FeaturePageNode[]): GetMyMenuRes {
  return {
    isSucceeded: true,
    message: 'ok',
    errors: [],
    data: { userType: 'InstitutionStaffMember', items },
  };
}

function writeCache(data: FeaturePageNode[], fetchedAt: number, version = 4): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ version, fetchedAt, data }));
}

describe('FeaturePageStore', () => {
  const apiMock = { getFeaturePages: vi.fn() };

  function loadStore() {
    TestBed.configureTestingModule({
      providers: [{ provide: FeaturePageApi, useValue: apiMock }],
    });
    return TestBed.inject(FeaturePageStore);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiMock.getFeaturePages.mockReturnValue(of(envelope([makeNode()])));
  });

  it('hydrates from a valid cache without calling the API', () => {
    writeCache([makeNode({ moduleCode: 'CACHED' })], Date.now());

    const store = loadStore();

    expect(store.nodes().map((n) => n.moduleCode)).toEqual(['CACHED']);
    expect(store.isLoaded()).toBe(true);
    expect(apiMock.getFeaturePages).not.toHaveBeenCalled();
  });

  it('discards a cache written by a different version', () => {
    writeCache([makeNode()], Date.now(), 0);

    const store = loadStore();

    expect(store.isLoaded()).toBe(false);
    expect(store.nodes()).toEqual([]);
  });

  it('ignores malformed persisted state', () => {
    localStorage.setItem(CACHE_KEY, '{ not json');

    const store = loadStore();

    expect(store.isLoaded()).toBe(false);
  });

  it('ensureLoaded revalidates a cache however fresh, keeping the tree on screen', async () => {
    writeCache([makeNode({ moduleCode: 'CACHED' })], Date.now());
    const store = loadStore();

    // The cached tree is what the sidebar paints while the refresh is in flight.
    expect(store.nodes().map((n) => n.moduleCode)).toEqual(['CACHED']);
    expect(store.showSkeleton()).toBe(false);

    await store.ensureLoaded();

    expect(apiMock.getFeaturePages).toHaveBeenCalledTimes(1);
    expect(store.nodes().map((n) => n.moduleCode)).toEqual(['STAFF_MGMT']);
  });

  it('whenLoaded resolves against a tree in hand without refetching it', async () => {
    writeCache([makeNode({ moduleCode: 'CACHED' })], Date.now());
    const store = loadStore();

    // A list query per search keystroke must not drag `my-menu` along with it.
    await Promise.all([store.whenLoaded(), store.whenLoaded(), store.whenLoaded()]);

    expect(apiMock.getFeaturePages).not.toHaveBeenCalled();
  });

  it('whenLoaded fetches once on a cold start', async () => {
    const store = loadStore();

    await Promise.all([store.whenLoaded(), store.whenLoaded()]);
    await store.whenLoaded();

    expect(apiMock.getFeaturePages).toHaveBeenCalledTimes(1);
    expect(store.isLoaded()).toBe(true);
  });

  it('does not cache a successful but empty payload', async () => {
    const store = loadStore();
    apiMock.getFeaturePages.mockReturnValue(of(envelope([])));

    await store.load();

    expect(store.isLoaded()).toBe(true);
    expect(store.hasError()).toBe(false);
    // Nothing persisted, so the next boot asks again instead of hydrating an empty tree.
    expect(localStorage.getItem(CACHE_KEY)).toBe(null);
  });

  it('drops an existing cache when the payload comes back empty', async () => {
    writeCache([makeNode({ moduleCode: 'REVOKED' })], Date.now());
    const store = loadStore();
    apiMock.getFeaturePages.mockReturnValue(of(envelope([])));

    await store.load();

    // Otherwise a user whose modules were revoked hydrates the tree they just lost.
    expect(store.nodes()).toEqual([]);
    expect(localStorage.getItem(CACHE_KEY)).toBe(null);
  });

  it('caches a successful fetch', async () => {
    const store = loadStore();

    await store.load();

    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)!);
    expect(cache.version).toBe(4);
    expect(cache.data).toHaveLength(1);
    expect(cache.fetchedAt).toBeGreaterThan(0);
    expect(store.isLoaded()).toBe(true);
    expect(store.isLoading()).toBe(false);
  });

  it('de-dupes concurrent loads into one request', async () => {
    const store = loadStore();

    await Promise.all([store.load(), store.load(), store.ensureLoaded()]);

    expect(apiMock.getFeaturePages).toHaveBeenCalledTimes(1);
  });

  it('keeps a warm cache rendering when a refresh fails', async () => {
    writeCache([makeNode({ moduleCode: 'WARM' })], Date.now());
    const store = loadStore();
    apiMock.getFeaturePages.mockReturnValue(throwError(() => new Error('offline')));

    await store.ensureLoaded();

    expect(store.nodes().map((n) => n.moduleCode)).toEqual(['WARM']);
    expect(store.hasLoadFailed()).toBe(true);
    expect(store.hasError()).toBe(false);
  });

  it('reports a cold failure', async () => {
    const store = loadStore();
    apiMock.getFeaturePages.mockReturnValue(throwError(() => new Error('offline')));

    await store.load();

    expect(store.hasError()).toBe(true);
    expect(store.showSkeleton()).toBe(false);
    expect(store.errorMessage()).toBe('offline');
  });

  it('treats an unsuccessful envelope as a failure carrying its message', async () => {
    const store = loadStore();
    apiMock.getFeaturePages.mockReturnValue(
      of({ isSucceeded: false, message: 'Catalog unavailable', errors: [], data: null }),
    );

    await store.load();

    expect(store.hasError()).toBe(true);
    expect(store.errorMessage()).toBe('Catalog unavailable');
  });

  it('retries after a failure', async () => {
    const store = loadStore();
    apiMock.getFeaturePages.mockReturnValueOnce(throwError(() => new Error('offline')));

    await store.load();
    await store.refresh();

    expect(apiMock.getFeaturePages).toHaveBeenCalledTimes(2);
    expect(store.hasLoadFailed()).toBe(false);
    expect(store.nodes()).toHaveLength(1);
  });

  it('clear empties the store and removes the cache', async () => {
    const store = loadStore();
    await store.load();

    store.clear();

    expect(store.nodes()).toEqual([]);
    expect(store.isLoaded()).toBe(false);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('resolves module and operation ids off a hydrated cache, with no request', () => {
    writeCache([makeNode({ children: [BANK_PAGE] })], Date.now());

    const store = loadStore();

    expect(store.moduleOperationIds('STAFF_BANK_DETAILS', 'View')).toEqual({
      ModuleId: 10,
      OperationId: 4,
    });
    expect(apiMock.getFeaturePages).not.toHaveBeenCalled();
  });

  it('clear empties the id index, so one session cannot inherit the previous institution ids', () => {
    writeCache([makeNode({ children: [BANK_PAGE] })], Date.now());
    const store = loadStore();

    store.clear();

    expect(store.moduleOperationIds('STAFF_BANK_DETAILS', 'View')).toEqual({
      ModuleId: undefined,
      OperationId: undefined,
    });
  });

  it("resolves a page's display name off a hydrated cache, matching the sidebar label", () => {
    writeCache([makeNode({ children: [BANK_PAGE] })], Date.now());

    const store = loadStore();

    expect(store.displayNameOf('STAFF_BANK_DETAILS')).toBe(BANK_PAGE.displayName);
  });

  it('returns undefined for a module the tree does not publish, so callers fall back', () => {
    const store = loadStore();

    expect(store.displayNameOf('EMP_NOWHERE')).toBeUndefined();
  });
});

