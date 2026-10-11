import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ParentModuleApi, SubModuleApi } from '@core/services';

import ModuleForm, { ModuleFormData } from './module-form';

describe('ModuleForm', () => {
  const parentModuleApiMock = {
    getParentModule: vi.fn(),
    getModuleHeaders: vi.fn(),
    addParentModule: vi.fn(),
    updateParentModule: vi.fn(),
  };
  const subModuleApiMock = {
    getSubModule: vi.fn(),
    addSubModule: vi.fn(),
    updateSubModule: vi.fn(),
  };
  const dialogRefMock = { close: vi.fn() };

  const emptyList = { isSucceeded: true, message: '', errors: [], data: [] };

  async function createFixture(data: ModuleFormData): Promise<ComponentFixture<ModuleForm>> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        { provide: ParentModuleApi, useValue: parentModuleApiMock },
        { provide: SubModuleApi, useValue: subModuleApiMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    });

    const fixture = TestBed.createComponent(ModuleForm);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    parentModuleApiMock.getModuleHeaders.mockReturnValue(of(emptyList));
  });

  it('renders every control the parent payload needs', async () => {
    const fixture = await createFixture({ kind: 'parent' });
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('#displayName')).toBeTruthy();
    expect(host.querySelector('#moduleName')).toBeTruthy();
    expect(host.querySelector('#moduleCode')).toBeTruthy();
    expect(host.querySelector('#urlPath')).toBeTruthy();
    expect(host.querySelector('#remark')).toBeTruthy();

    // The Optimus wrappers — these are the ones that looked blank in the browser.
    expect(host.querySelector('p-select')).toBeTruthy();
    expect(host.querySelector('p-inputnumber')).toBeTruthy();
    expect(host.querySelectorAll('p-toggleswitch')).toHaveLength(3);
    expect(host.querySelectorAll('p-button')).toHaveLength(2);
  });

  it('renders the scope select with its three options', async () => {
    const fixture = await createFixture({ kind: 'parent' });
    const select = fixture.nativeElement.querySelector('p-select');

    // A rendered Select paints its own label/trigger; an empty host means it never initialised.
    expect(select.innerHTML.trim().length).toBeGreaterThan(0);
    expect(fixture.componentInstance['scopeOptions'].map((scope) => scope.label)).toEqual([
      'Institution User',
      'Host User',
      'Common',
    ]);
  });

  it('hides the parent select on a parent header', async () => {
    const fixture = await createFixture({ kind: 'parent' });
    expect(fixture.nativeElement.querySelector('#parentModuleId')).toBeFalsy();
  });

  it('shows the parent select and loads its options on a child module', async () => {
    const fixture = await createFixture({ kind: 'sub' });

    expect(fixture.nativeElement.querySelector('#parentModuleId')).toBeTruthy();
    // The endpoint returns nothing without a scope, so the call has to carry one.
    expect(parentModuleApiMock.getModuleHeaders).toHaveBeenCalledWith({
      ModuleScope: 1,
      IsActive: true,
    });
  });

  it('flattens the nested sub-headers into the parent select', async () => {
    parentModuleApiMock.getModuleHeaders.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [
          {
            id: 6,
            displayName: 'Profile',
            children: [{ id: 7, displayName: 'Profile details', children: null }],
          },
        ],
      }),
    );

    const fixture = await createFixture({ kind: 'sub' });

    expect(fixture.componentInstance['parentOptions']()).toHaveLength(2);
  });

  it('leaves the parent select empty rather than throwing when the lookup fails', async () => {
    parentModuleApiMock.getModuleHeaders.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = await createFixture({ kind: 'sub' });

    expect(fixture.componentInstance['parentOptions']()).toEqual([]);
  });

  it('carries the seeded scope into the parent lookup', async () => {
    await createFixture({ kind: 'sub', moduleScopeKey: 'host' });
    expect(parentModuleApiMock.getModuleHeaders).toHaveBeenCalledWith({
      ModuleScope: 2,
      IsActive: true,
    });
  });

  const commonRow = {
    id: 3,
    moduleCode: 'P',
    moduleName: 'Profile',
    displayName: 'Profile',
    urlPath: 'profile',
    parentModuleId: null,
    isLeafNode: false,
    isModuleDisplayInUI: true,
    isCommonMenu: true,
    moduleScope: 3,
    isActive: true,
    imageIconWeb: null,
    imageIconMobile: null,
    itemPriority: 0,
    remark: null,
    addedById: 1,
    addedDateTime: '2025-06-16T21:56:55.473Z',
    updatedById: null,
    updatedDateTime: null,
  };

  it('reads a scope-3 row back as the Common scope', async () => {
    parentModuleApiMock.getParentModule.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: commonRow }),
    );

    const fixture = await createFixture({ kind: 'parent', module: commonRow });

    expect(fixture.componentInstance['model']().moduleScopeKey).toBe('common');
  });

  it('keeps a host row on Host User even with the common-menu flag on', async () => {
    const hostRow = { ...commonRow, moduleScope: 2 };
    parentModuleApiMock.getParentModule.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: hostRow }),
    );

    const fixture = await createFixture({ kind: 'parent', module: hostRow });

    // Scope 2 must not be demoted to scope 1 by the common flag on the way back out.
    expect(fixture.componentInstance['model']().moduleScopeKey).toBe('host');
  });

  it('blocks the save until a parent header is chosen', async () => {
    const fixture = await createFixture({ kind: 'sub' });
    const form = fixture.componentInstance['f'];

    expect(form.parentModuleId().errors().length).toBeGreaterThan(0);
    expect(form().invalid()).toBe(true);
  });

  it('does not require a parent header on a parent header', async () => {
    const fixture = await createFixture({ kind: 'parent' });
    expect(fixture.componentInstance['f'].parentModuleId().errors()).toHaveLength(0);
  });

  it('hydrates an edit from the get-by-id response', async () => {
    parentModuleApiMock.getParentModule.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: {
          id: 27,
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
          remark: 'Handles leave requests',
          addedById: 1,
          addedDateTime: '2025-06-16T21:56:55.473Z',
          updatedById: null,
          updatedDateTime: null,
        },
      }),
    );

    const fixture = await createFixture({
      kind: 'parent',
      module: { id: 27, moduleScope: 1 } as never,
    });

    const displayName = fixture.nativeElement.querySelector('#displayName') as HTMLInputElement;
    expect(displayName.value).toBe('Asset management');
    expect(parentModuleApiMock.getParentModule).toHaveBeenCalledWith(27, 1);
  });
  it('shows the shimmer instead of blank fields while the edit hydrates', async () => {
    const response$ = new Subject<unknown>();
    parentModuleApiMock.getParentModule.mockReturnValue(response$);

    const fixture = await createFixture({
      kind: 'parent',
      module: { id: 27, moduleScope: 1 } as never,
    });
    const host: HTMLElement = fixture.nativeElement;

    // The shimmer stands in for the real controls, field for field.
    expect(host.querySelectorAll('app-skeleton-field')).toHaveLength(9);
    expect(host.querySelectorAll('app-skeleton-toggle')).toHaveLength(3);
    expect(host.querySelector('#displayName')).toBeNull();

    response$.next({
      isSucceeded: true,
      message: '',
      errors: [],
      data: {
        id: 27,
        parentModuleId: null,
        moduleCode: 'A-M',
        moduleName: 'Asset-Management',
        displayName: 'Asset management',
        urlPath: 'asset-management',
        moduleScope: 1,
        itemPriority: 0,
        imageIconWeb: 'pi pi-box',
        imageIconMobile: 'box-outline',
        remark: '',
        isModuleDisplayInUI: true,
        isCommonMenu: false,
        isActive: true,
      },
    });
    response$.complete();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();

    expect(host.querySelector('app-skeleton-field')).toBeNull();
    expect((host.querySelector('#displayName') as HTMLInputElement).value).toBe('Asset management');
  });
});
