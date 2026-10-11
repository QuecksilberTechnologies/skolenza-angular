import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ParentModuleApi, SubModuleApi } from '@core/services';
import { SubModuleRow, UpdateModuleStatusReq } from '@shared/interfaces';

import { SubModulesStore } from './sub-modules.store';

function createSubModule(overrides: Partial<SubModuleRow> = {}): SubModuleRow {
  return {
    id: 11,
    moduleCode: null,
    moduleName: 'Sign-Out',
    displayName: 'Sign out',
    urlPath: 'sign-out',
    parentModuleId: 6,
    isLeafNode: true,
    isModuleDisplayInUI: true,
    isCommonMenu: true,
    moduleScope: 1,
    isActive: true,
    imageIconWeb: null,
    imageIconMobile: null,
    itemPriority: -1,
    remark: null,
    addedById: 1,
    addedDateTime: '2025-06-16T22:16:25.11Z',
    updatedById: null,
    updatedDateTime: null,
    parentModule: {
      id: 6,
      moduleCode: null,
      moduleName: 'Profile',
      displayName: 'Profile',
      moduleScope: 1,
      isActive: true,
    },
    ...overrides,
  };
}

describe('SubModulesStore', () => {
  const subModuleApiMock = {
    getSubModules: vi.fn(),
    setSubModuleStatus: vi.fn(),
  };
  const parentModuleApiMock = { getModuleHeaders: vi.fn() };

  const createStore = (modules: SubModuleRow[]) => {
    const store = TestBed.inject(SubModulesStore);
    patchState(store as never, { modules });
    return store;
  };

  const statusPayloads = (): UpdateModuleStatusReq[] =>
    subModuleApiMock.setSubModuleStatus.mock.calls.map((call) => call[1]);

  beforeEach(() => {
    vi.clearAllMocks();
    subModuleApiMock.getSubModules.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    subModuleApiMock.setSubModuleStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );
    parentModuleApiMock.getModuleHeaders.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        SubModulesStore,
        { provide: SubModuleApi, useValue: subModuleApiMock },
        { provide: ParentModuleApi, useValue: parentModuleApiMock },
      ],
    });
  });

  it('re-queries when the parent filter changes', async () => {
    const store = TestBed.inject(SubModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setParentModuleId(6);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(subModuleApiMock.getSubModules).toHaveBeenLastCalledWith({
      moduleScope: 1,
      parentModuleId: 6,
      isActive: null,
    });
  });

  it('scopes the parent dropdown to the selected scope', async () => {
    const store = TestBed.inject(SubModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setModuleScopeKey('host');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(parentModuleApiMock.getModuleHeaders).toHaveBeenLastCalledWith({ ModuleScope: 2 });
  });

  it('requests Common modules and parent options with scope 3', async () => {
    subModuleApiMock.getSubModules.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [
          createSubModule({ id: 11, isCommonMenu: false }),
          createSubModule({ id: 12, isCommonMenu: true }),
        ],
      }),
    );
    const store = TestBed.inject(SubModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setModuleScopeKey('common');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(subModuleApiMock.getSubModules).toHaveBeenLastCalledWith({
      moduleScope: 3,
      parentModuleId: null,
      isActive: null,
    });
    expect(parentModuleApiMock.getModuleHeaders).toHaveBeenLastCalledWith({ ModuleScope: 3 });
    expect(store.visibleModules().map((module) => module.id)).toEqual([11, 12]);
  });

  it('clears the parent filter when the scope changes', async () => {
    const store = TestBed.inject(SubModulesStore);
    store.setParentModuleId(6);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setModuleScopeKey('host');
    await TestBed.inject(ApplicationRef).whenStable();

    // Parents are scope-specific; keeping id 6 would filter on an option no longer offered.
    expect(store.parentModuleId()).toBeNull();
    expect(subModuleApiMock.getSubModules).toHaveBeenLastCalledWith({
      moduleScope: 2,
      parentModuleId: null,
      isActive: null,
    });
  });

  it('clears the grid when the list call fails', async () => {
    const store = createStore([createSubModule({ id: 11 })]);
    subModuleApiMock.getSubModules.mockReturnValue(throwError(() => new Error('boom')));

    store.setModuleScopeKey('host');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.modules()).toEqual([]);
  });

  it('keeps the grid rendering when the parent dropdown call fails', async () => {
    // An errored resource makes `value()` throw, which used to abort change detection for
    // the whole grid — rows disappeared and the dropdown spinner never stopped.
    subModuleApiMock.getSubModules.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [createSubModule({ id: 11 }), createSubModule({ id: 12 })],
      }),
    );
    parentModuleApiMock.getModuleHeaders.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(SubModulesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.visibleModules().map((module) => module.id)).toEqual([11, 12]);
    expect(store.parentOptions()).toEqual([]);
    expect(store.isLoadingParentOptions()).toBe(false);
  });

  describe('toggleActive', () => {
    it('sends the row scope with the flipped status', () => {
      const store = createStore([createSubModule({ id: 11, moduleScope: 1, isActive: true })]);

      store.toggleActive(store.modules()[0]);

      expect(subModuleApiMock.setSubModuleStatus).toHaveBeenCalledWith(11, expect.anything());
      expect(statusPayloads()).toEqual([{ moduleScope: 1, isActive: false }]);
    });

    it('drops the row once it no longer matches the active filter', () => {
      const store = createStore([
        createSubModule({ id: 11, isActive: true }),
        createSubModule({ id: 12 }),
      ]);
      store.setIsActive(true);

      store.toggleActive(store.modules()[0]);

      expect(store.modules().map((module) => module.id)).toEqual([12]);
    });
  });
});
