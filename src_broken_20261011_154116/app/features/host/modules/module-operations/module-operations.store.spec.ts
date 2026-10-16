import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ModuleOperationApi, ModuleTreeReader } from '@core/services';
import { ModuleOperationRow } from '@shared/interfaces';

import { ModuleOperationsStore } from './module-operations.store';

function createModuleOperation(overrides: Partial<ModuleOperationRow> = {}): ModuleOperationRow {
  return {
    id: 1,
    moduleOperationMappingId: null,
    moduleId: 10,
    moduleName: 'Assets',
    operationId: 2,
    operationName: 'Add',
    dataViewStructureId: null,
    pageTypeId: null,
    pageURL: '/app/assets',
    iconURL: null,
    isCommonItem: false,
    isOperational: true,
    priority: 1,
    remark: null,
    isActive: true,
    ...overrides,
  };
}

describe('ModuleOperationsStore', () => {
  const moduleOperationApiMock = {
    getModuleOperations: vi.fn(),
    deleteModuleOperation: vi.fn(),
  };
  const moduleTreeReaderMock = { readScope: vi.fn() };

  const envelope = (data: unknown) => ({ isSucceeded: true, message: '', errors: [], data });

  /** Awaiting the store lets its own list resource overwrite anything patched in by hand. */
  const listReturns = (rows: ModuleOperationRow[]) =>
    moduleOperationApiMock.getModuleOperations.mockReturnValue(of(envelope(rows)));

  /** The grid only shows mappings whose module is in the selected scope. */
  const scopeHolds = (...ids: number[]) =>
    moduleTreeReaderMock.readScope.mockReturnValue(
      of({
        headers: ids.map((id) => ({ id, displayName: `M${id}`, isLeafNode: true })),
        leaves: [],
        unreadHeaderIds: [],
      }),
    );

  const createStore = (moduleOperations: ModuleOperationRow[]) => {
    const store = TestBed.inject(ModuleOperationsStore);
    patchState(store as never, { moduleOperations });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    moduleOperationApiMock.getModuleOperations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    moduleOperationApiMock.deleteModuleOperation.mockReturnValue(
      of({ isSucceeded: true, message: 'Mapping deleted.', errors: [], data: null }),
    );
    moduleTreeReaderMock.readScope.mockReturnValue(
      of({ headers: [], leaves: [], unreadHeaderIds: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        ModuleOperationsStore,
        { provide: ModuleOperationApi, useValue: moduleOperationApiMock },
        { provide: ModuleTreeReader, useValue: moduleTreeReaderMock },
      ],
    });
  });

  it('clears the grid when the list call throws', async () => {
    const store = createStore([createModuleOperation()]);
    moduleOperationApiMock.getModuleOperations.mockReturnValue(throwError(() => new Error('boom')));

    store.reloadModuleOperations();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.moduleOperations()).toEqual([]);
  });

  it('opens on the institution scope', async () => {
    const store = TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.moduleScopeKey()).toBe('institution');
    expect(moduleTreeReaderMock.readScope).toHaveBeenLastCalledWith(1);
  });

  it('re-queries the module lookup and clears the module filter on a scope change', async () => {
    const store = TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();
    store.setModuleId(10);

    store.setModuleScopeKey('host');
    await TestBed.inject(ApplicationRef).whenStable();

    // The chosen module may not exist in the new scope.
    expect(store.moduleId()).toBeNull();
    expect(moduleTreeReaderMock.readScope).toHaveBeenLastCalledWith(2);
  });

  it('lists the modules in scope, mapped or not', async () => {
    moduleTreeReaderMock.readScope.mockReturnValue(
      of({
        headers: [{ id: 10, displayName: 'Assets', isLeafNode: false, isCommonMenu: false }],
        leaves: [
          {
            id: 11,
            displayName: 'Categories',
            isLeafNode: true,
            isCommonMenu: false,
            parentModule: { displayName: 'Assets' },
          },
        ],
        unreadHeaderIds: [],
      }),
    );
    const store = createStore([]);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.moduleOptions()).toEqual([
      { label: 'Assets', value: 10 },
      { label: 'Assets › Categories', value: 11 },
    ]);
  });

  it('derives the operation dropdown from the loaded rows', () => {
    const store = createStore([
      createModuleOperation({ id: 1, operationId: 2, operationName: 'Add' }),
      createModuleOperation({ id: 2, operationId: 3, operationName: 'Delete' }),
      createModuleOperation({ id: 3, operationId: 4, operationName: null }),
    ]);

    expect(store.operationOptions()).toEqual([
      { label: '#4', value: 4 },
      { label: 'Add', value: 2 },
      { label: 'Delete', value: 3 },
    ]);
  });

  it('drops rows whose module is outside the selected scope', async () => {
    scopeHolds(10);
    listReturns([
      createModuleOperation({ id: 1, moduleId: 10 }),
      createModuleOperation({ id: 2, moduleId: 99 }),
    ]);
    const store = TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.filteredModuleOperations().map((row) => row.id)).toEqual([1]);
  });

  it('filters by module, operation and status', async () => {
    scopeHolds(10, 11);
    listReturns([
      createModuleOperation({ id: 1, moduleId: 10, operationId: 2, isActive: true }),
      createModuleOperation({ id: 2, moduleId: 10, operationId: 3, isActive: true }),
      createModuleOperation({ id: 3, moduleId: 11, operationId: 2, isActive: true }),
      createModuleOperation({ id: 4, moduleId: 10, operationId: 2, isActive: false }),
    ]);
    const store = TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setModuleId(10);
    store.setOperationId(2);
    store.setIsActive(true);

    expect(store.filteredModuleOperations().map((row) => row.id)).toEqual([1]);
  });

  it('keeps rendering when the module lookup fails', async () => {
    // `handleError` rethrows; an errored resource makes `value()` throw, which would abort change
    // detection for the whole grid.
    moduleTreeReaderMock.readScope.mockReturnValue(throwError(() => new Error('boom')));
    listReturns([createModuleOperation({ id: 1, moduleId: 10 })]);
    const store = TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.moduleOptions()).toEqual([]);
    expect(store.filteredModuleOperations()).toEqual([]);
    expect(store.isLoadingScopedModules()).toBe(false);
  });

  it('reports a failed scope read, then clears it once a read succeeds', async () => {
    moduleTreeReaderMock.readScope.mockReturnValue(throwError(() => new Error('boom')));
    const store = TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.scopeReadFailed()).toBe(true);

    scopeHolds(10);
    store.setModuleScopeKey('host');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.scopeReadFailed()).toBe(false);
  });

  it('reports a partially read tree', async () => {
    moduleTreeReaderMock.readScope.mockReturnValue(
      of({ headers: [], leaves: [], unreadHeaderIds: [7] }),
    );
    TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(TestBed.inject(ModuleOperationsStore).hasUnreadModules()).toBe(true);
  });

  it('counts the rows the scope gate alone removed', async () => {
    scopeHolds(99);
    listReturns([
      createModuleOperation({ id: 1, moduleId: 10 }),
      createModuleOperation({ id: 2, moduleId: 11 }),
    ]);
    const store = TestBed.inject(ModuleOperationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.filteredModuleOperations()).toEqual([]);
    expect(store.hiddenByScopeCount()).toBe(2);
  });

  describe('deleteModuleOperation', () => {
    it('drops the row once the API confirms', () => {
      const store = createStore([
        createModuleOperation({ id: 1 }),
        createModuleOperation({ id: 2 }),
      ]);

      store.deleteModuleOperation(store.moduleOperations()[0]);

      expect(moduleOperationApiMock.deleteModuleOperation).toHaveBeenCalledWith(1);
      expect(store.moduleOperations().map((row) => row.id)).toEqual([2]);
    });

    it('keeps the row when the API refuses', () => {
      moduleOperationApiMock.deleteModuleOperation.mockReturnValue(
        of({ isSucceeded: false, message: 'in use', errors: [], data: null }),
      );
      const store = createStore([createModuleOperation({ id: 1 })]);

      store.deleteModuleOperation(store.moduleOperations()[0]);

      expect(store.moduleOperations()).toHaveLength(1);
    });
  });
});
