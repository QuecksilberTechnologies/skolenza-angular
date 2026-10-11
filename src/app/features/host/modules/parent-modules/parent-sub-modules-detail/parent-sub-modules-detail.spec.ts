import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { SubModuleApi } from '@core/services';
import { ModuleRow, SubModuleRow } from '@shared/interfaces';

import { ParentSubModulesDetail } from './parent-sub-modules-detail';

function createModule(overrides: Partial<SubModuleRow> = {}): SubModuleRow {
  return {
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
    remark: null,
    addedById: 1,
    addedDateTime: '2025-06-16T21:56:55.473Z',
    updatedById: null,
    updatedDateTime: null,
    parentModule: null,
    ...overrides,
  };
}

const ok = (data: SubModuleRow[]) => of({ isSucceeded: true, message: '', errors: [], data });

describe('ParentSubModulesDetail', () => {
  const subModuleApiMock = { getSubModules: vi.fn() };

  async function createFixture(
    parentModule: ModuleRow,
  ): Promise<ComponentFixture<ParentSubModulesDetail>> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SubModuleApi, useValue: subModuleApiMock },
      ],
    });

    const fixture = TestBed.createComponent(ParentSubModulesDetail);
    fixture.componentRef.setInput('parentModule', parentModule);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: ComponentFixture<ParentSubModulesDetail>) =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    vi.clearAllMocks();
    subModuleApiMock.getSubModules.mockReturnValue(ok([]));
  });

  it('asks for the children of the parent it was given', async () => {
    await createFixture(createModule());

    expect(subModuleApiMock.getSubModules).toHaveBeenCalledWith({
      moduleScope: 1,
      parentModuleId: 27,
    });
  });

  it('lists the children it gets back', async () => {
    subModuleApiMock.getSubModules.mockReturnValue(
      ok([createModule({ id: 28, displayName: 'Asset creation', urlPath: 'asset-creation' })]),
    );

    const fixture = await createFixture(createModule());

    expect(text(fixture)).toContain('Asset creation');
    expect(text(fixture)).toContain('asset-creation');
  });

  it('reports a rejected envelope as an error instead of an empty parent', async () => {
    subModuleApiMock.getSubModules.mockReturnValue(
      of({ isSucceeded: false, message: 'Parent module not found.', errors: [], data: [] }),
    );

    const fixture = await createFixture(createModule());

    expect(text(fixture)).toContain('Parent module not found.');
    expect(text(fixture)).not.toContain('No child modules under');
  });

  it('shows the empty state only when the parent genuinely has no children', async () => {
    const fixture = await createFixture(createModule());

    expect(text(fixture)).toContain('No child options under Asset management yet.');
  });

  it('renders direct child options without a third-level drill-down control', async () => {
    subModuleApiMock.getSubModules.mockReturnValue(
      ok([createModule({ id: 28, displayName: 'Departments', isLeafNode: true })]),
    );

    const fixture = await createFixture(createModule());

    expect(text(fixture)).toContain('Direct child options');
    expect(text(fixture)).toContain('Departments');
    expect((fixture.nativeElement as HTMLElement).querySelector('.pi-chevron-right')).toBeNull();
  });

  it('falls back when imageIconWeb holds junk instead of an icon class', async () => {
    const fixture = await createFixture(createModule());

    expect(fixture.componentInstance.iconOf(createModule({ imageIconWeb: 'string' }))).toBe(
      'pi pi-folder',
    );
    expect(
      fixture.componentInstance.iconOf(createModule({ imageIconWeb: null, isLeafNode: true })),
    ).toBe('pi pi-file');
    expect(fixture.componentInstance.iconOf(createModule({ imageIconWeb: 'pi pi-users' }))).toBe(
      'pi pi-users',
    );
  });
});
