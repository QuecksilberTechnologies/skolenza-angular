import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Common, ModuleTreeReader, ParentModuleApi } from '@core/services';
import { ModuleRow, UpdateModuleStatusReq } from '@shared/interfaces';

import { ParentModulesStore } from './parent-modules.store';

function createModule(overrides: Partial<ModuleRow> = {}): ModuleRow {
  return {
    id: 1,
    moduleCode: 'A-M',
    moduleName: 'Asset-Management',
    displayName: 'Asset management',
    urlPath: 'asset-management',
    parentModuleId: null,
    isLeafNode: false,
    isModuleDisplayInUI: true,
    isCommonMenu: false,
    moduleScope: 1,
    isActive: true,
    imageIconWeb: null,
    imageIconMobile: null,
    itemPriority: 0,
    remark: null,
    addedById: 1,
    addedDateTime: '2025-06-16T21:56:55.473Z',
    updatedById: null,
    updatedDateTime: null,
    ...overrides,
  };
}

describe('ParentModulesStore', () => {
  const parentModuleApiMock = { setParentModuleStatus: vi.fn() };
  const moduleTreeReaderMock = { readScope: vi.fn() };

  /** The reader already reassembles the tree; the store only filters and renders it. */
  const treeHolds = (headers: ModuleRow[]) =>
    moduleTreeReaderMock.readScope.mockReturnValue(
      of({ headers, leaves: [], unreadHeaderIds: [] }),
    );

  const createStore = (modules: ModuleRow[]) => {
    const store = TestBed.inject(ParentModulesStore);
    patchState(store as never, { modules });
    return store;
  };

  const statusPayloads = (): UpdateModuleStatusReq[] =>
    parentModuleApiMock.setParentModuleStatus.mock.calls.map((call) => call[1]);

  beforeEach(() => {
    vi.clearAllMocks();
    moduleTreeReaderMock.readScope.mockReturnValue(
      of({ headers: [], leaves: [], unreadHeaderIds: [] }),
    );
    parentModuleApiMock.setParentModuleStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        ParentModulesStore,
        { provide: ParentModuleApi, useValue: parentModuleApiMock },
        { provide: ModuleTreeReader, useValue: moduleTreeReaderMock },
      ],
    });
  });

  it('re-reads the tree for the selected scope', async () => {
    const store = TestBed.inject(ParentModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setModuleScopeKey('host');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(moduleTreeReaderMock.readScope).toHaveBeenLastCalledWith(2);
  });

  it('filters the status client-side, so inactive headers still reach the grid', async () => {
    treeHolds([
      createModule({ id: 7, isActive: true }),
      createModule({ id: 8, isActive: false }),
      createModule({ id: 9, parentModuleId: 7, isActive: false }),
    ]);
    const store = TestBed.inject(ParentModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    // `get-module-headers` never returns an inactive header, so `All` has to come from the tree.
    expect(store.visibleModules().map((module) => module.id)).toEqual([7, 8, 9]);

    store.setIsActive(false);
    expect(store.visibleModules().map((module) => module.id)).toEqual([8, 9]);

    store.setIsActive(true);
    expect(store.visibleModules().map((module) => module.id)).toEqual([7]);

    // The filter is a projection, so flipping it must not re-read the tree.
    expect(moduleTreeReaderMock.readScope).toHaveBeenCalledTimes(1);
  });

  it('requests Common modules with scope 3', async () => {
    treeHolds([
      createModule({ id: 7, isCommonMenu: false }),
      createModule({ id: 8, isCommonMenu: true }),
    ]);
    const store = TestBed.inject(ParentModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setModuleScopeKey('common');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(moduleTreeReaderMock.readScope).toHaveBeenLastCalledWith(3);
    expect(store.visibleModules().map((module) => module.id)).toEqual([7, 8]);
  });

  it('only indents a sub-header whose parent survived the filters', async () => {
    treeHolds([
      createModule({ id: 7, isActive: false }),
      createModule({ id: 8, parentModuleId: 7, isActive: true }),
    ]);
    const store = TestBed.inject(ParentModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.indentedModuleIds()).toEqual(new Set([8]));

    store.setIsActive(true);
    // The parent is filtered out, so the child must not sit indented under nothing.
    expect(store.visibleModules().map((module) => module.id)).toEqual([8]);
    expect(store.indentedModuleIds()).toEqual(new Set());
  });

  it('reports the headers the reader could not read back', async () => {
    const showMessage = vi.spyOn(TestBed.inject(Common), 'showMessage');
    moduleTreeReaderMock.readScope.mockReturnValue(
      of({ headers: [createModule({ id: 7 })], leaves: [], unreadHeaderIds: [9, 10] }),
    );
    const store = TestBed.inject(ParentModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    // Dropping them without a word is indistinguishable from those modules not existing.
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('2 modules'), 'warn');
    expect(store.modules().map((module) => module.id)).toEqual([7]);
  });

  it('clears the grid and reports when the tree read fails', async () => {
    const store = createStore([createModule({ id: 7 })]);
    moduleTreeReaderMock.readScope.mockReturnValue(throwError(() => new Error('boom')));

    store.setModuleScopeKey('host');
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.modules()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  describe('toggleActive', () => {
    it('sends the row scope with the flipped status', () => {
      const store = createStore([createModule({ id: 7, moduleScope: 2, isActive: true })]);

      store.toggleActive(store.modules()[0]);

      expect(parentModuleApiMock.setParentModuleStatus).toHaveBeenCalledWith(7, expect.anything());
      expect(statusPayloads()).toEqual([{ moduleScope: 2, isActive: false }]);
    });

    it('sends a flattened sub-header through the parent controller too', () => {
      const store = createStore([
        createModule({ id: 8, parentModuleId: 7, moduleScope: 2, isActive: true }),
      ]);

      store.toggleActive(store.modules()[0]);

      // `/ChildModule/{id}` does not know sub-headers; `/ParentModule/{id}` answers for both levels.
      expect(parentModuleApiMock.setParentModuleStatus).toHaveBeenCalledWith(8, {
        moduleScope: 2,
        isActive: false,
      });
    });

    it('flips the row in place while the grid is showing every status', () => {
      const store = createStore([createModule({ id: 7, isActive: true })]);

      store.toggleActive(store.modules()[0]);

      expect(store.modules()).toEqual([expect.objectContaining({ id: 7, isActive: false })]);
    });

    it('drops the row once it no longer matches the active filter', () => {
      const store = createStore([createModule({ id: 7, isActive: true }), createModule({ id: 8 })]);
      store.setIsActive(true);

      store.toggleActive(store.modules()[0]);

      // The row is kept in state and flipped; `visibleModules` is what drops it.
      expect(store.visibleModules().map((module) => module.id)).toEqual([8]);
      expect(store.modules().map((module) => module.id)).toEqual([7, 8]);
    });

    it('leaves the row untouched when the call fails', () => {
      parentModuleApiMock.setParentModuleStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore([createModule({ id: 7, isActive: true })]);

      store.toggleActive(store.modules()[0]);

      expect(store.modules()).toEqual([
        expect.objectContaining({ id: 7, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });
});
