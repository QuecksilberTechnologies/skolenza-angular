import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  MenuStructureApi,
  ModuleOperationApi,
  OperationsMasterApi,
  ParentModuleApi,
  SubModuleApi,
} from '@core/services';

import ModuleOperationForm, { ModuleOperationFormData } from './module-operation-form';

describe('ModuleOperationForm', () => {
  const moduleOperationApiMock = {
    getModuleOperation: vi.fn(),
    addModuleOperation: vi.fn(),
    updateModuleOperation: vi.fn(),
  };
  const operationsApiMock = { getOperations: vi.fn() };
  const menuStructureApiMock = { getMenuStructures: vi.fn() };
  const parentModuleApiMock = { getModuleHeaders: vi.fn() };
  const subModuleApiMock = { getSubModules: vi.fn() };
  const dialogRefMock = { close: vi.fn() };

  const emptyList = { isSucceeded: true, message: '', errors: [], data: [] };

  async function createFixture(
    data: ModuleOperationFormData,
  ): Promise<ComponentFixture<ModuleOperationForm>> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        { provide: ModuleOperationApi, useValue: moduleOperationApiMock },
        { provide: MenuStructureApi, useValue: menuStructureApiMock },
        { provide: OperationsMasterApi, useValue: operationsApiMock },
        { provide: ParentModuleApi, useValue: parentModuleApiMock },
        { provide: SubModuleApi, useValue: subModuleApiMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    });

    const fixture = TestBed.createComponent(ModuleOperationForm);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    operationsApiMock.getOperations.mockReturnValue(of(emptyList));
    menuStructureApiMock.getMenuStructures.mockReturnValue(of(emptyList));
    parentModuleApiMock.getModuleHeaders.mockReturnValue(of(emptyList));
    subModuleApiMock.getSubModules.mockReturnValue(of(emptyList));
  });

  it('loads both module lists for the default institution scope', async () => {
    await createFixture({});

    expect(parentModuleApiMock.getModuleHeaders).toHaveBeenCalledWith({
      ModuleScope: 1,
      IsActive: true,
    });
    expect(subModuleApiMock.getSubModules).toHaveBeenCalledWith({
      moduleScope: 1,
      isActive: true,
    });
  });

  it('opens on the scope the grid is filtered to', async () => {
    await createFixture({ moduleScopeKey: 'host' });

    // Defaulting to Institution would map the operation to a module the caller's grid is not showing.
    expect(parentModuleApiMock.getModuleHeaders).toHaveBeenCalledWith({
      ModuleScope: 2,
      IsActive: true,
    });
    expect(subModuleApiMock.getSubModules).toHaveBeenCalledWith({
      moduleScope: 2,
      isActive: true,
    });
  });

  it('merges headers and subs into one module dropdown', async () => {
    parentModuleApiMock.getModuleHeaders.mockReturnValue(
      of({ ...emptyList, data: [{ id: 10, displayName: 'Assets', children: null }] }),
    );
    subModuleApiMock.getSubModules.mockReturnValue(
      of({
        ...emptyList,
        data: [{ id: 11, displayName: 'Categories', parentModule: { displayName: 'Assets' } }],
      }),
    );

    const fixture = await createFixture({});

    expect(fixture.componentInstance['moduleOptions']()).toEqual([
      { label: 'Assets', value: 10 },
      { label: 'Assets › Categories', value: 11 },
    ]);
  });

  it('keeps the dropdown usable when one module list fails', async () => {
    subModuleApiMock.getSubModules.mockReturnValue(throwError(() => new Error('boom')));
    parentModuleApiMock.getModuleHeaders.mockReturnValue(
      of({ ...emptyList, data: [{ id: 10, displayName: 'Assets', children: null }] }),
    );

    const fixture = await createFixture({});

    expect(fixture.componentInstance['moduleOptions']()).toHaveLength(1);
  });

  it('lists a sub-header once, under the label that names its parent', async () => {
    parentModuleApiMock.getModuleHeaders.mockReturnValue(
      of({
        ...emptyList,
        data: [
          {
            id: 10,
            displayName: 'Assets',
            children: [{ id: 11, displayName: 'Categories', children: null }],
          },
        ],
      }),
    );
    subModuleApiMock.getSubModules.mockReturnValue(
      of({
        ...emptyList,
        data: [{ id: 11, displayName: 'Categories', parentModule: { displayName: 'Assets' } }],
      }),
    );

    const fixture = await createFixture({});

    expect(fixture.componentInstance['moduleOptions']()).toEqual([
      { label: 'Assets', value: 10 },
      { label: 'Assets › Categories', value: 11 },
    ]);
  });

  it('lists only active operations', async () => {
    operationsApiMock.getOperations.mockReturnValue(
      of({
        ...emptyList,
        data: [
          { id: 1, operationName: 'Add', isActive: true },
          { id: 2, operationName: 'Retire', isActive: false },
        ],
      }),
    );

    const fixture = await createFixture({});

    expect(fixture.componentInstance['operationOptions']()).toEqual([{ label: 'Add', value: 1 }]);
  });

  it('maps menu structures to display-on options', async () => {
    menuStructureApiMock.getMenuStructures.mockReturnValue(
      of({
        ...emptyList,
        data: [
          { id: 1, displayOn: 'Left-Menu' },
          { id: 2, displayOn: 'Top-Bar' },
        ],
      }),
    );

    const fixture = await createFixture({});

    expect(fixture.componentInstance['menuStructureOptions']()).toEqual([
      { label: 'Left-Menu', value: 1 },
      { label: 'Top-Bar', value: 2 },
    ]);
  });

  it('keeps the form usable when menu structures fail to load', async () => {
    menuStructureApiMock.getMenuStructures.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = await createFixture({});

    expect(fixture.componentInstance['menuStructureOptions']()).toEqual([]);
  });

  it('reloads the module list and clears the selection when the scope changes', async () => {
    const fixture = await createFixture({});
    fixture.componentInstance['model'].update((m) => ({ ...m, moduleId: 10 }));

    fixture.componentInstance.onScopeChange('host');

    expect(fixture.componentInstance['model']().moduleId).toBeNull();
    expect(parentModuleApiMock.getModuleHeaders).toHaveBeenLastCalledWith({
      ModuleScope: 2,
      IsActive: true,
    });
  });

  it('blocks the save until a module and an operation are chosen', async () => {
    const fixture = await createFixture({});
    const form = fixture.componentInstance['f'];

    expect(form.moduleId().errors().length).toBeGreaterThan(0);
    expect(form.operationId().errors().length).toBeGreaterThan(0);
    expect(form().invalid()).toBe(true);
  });

  it('hydrates an edit from the get-by-id response', async () => {
    moduleOperationApiMock.getModuleOperation.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          id: 5,
          moduleOperationMappingId: 55,
          moduleId: 10,
          operationId: 2,
          dataViewStructureId: null,
          pageTypeId: null,
          pageURL: '/app/assets',
          iconURL: null,
          isCommonItem: false,
          isOperational: true,
          priority: 3,
          remark: 'Assets add button',
          isActive: true,
        },
      }),
    );

    const fixture = await createFixture({ moduleOperation: { id: 5 } as never });

    const pageURL = fixture.nativeElement.querySelector('#pageURL') as HTMLInputElement;
    expect(pageURL.value).toBe('/app/assets');
    expect(moduleOperationApiMock.getModuleOperation).toHaveBeenCalledWith(5);
  });
});
