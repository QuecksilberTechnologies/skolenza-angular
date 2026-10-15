import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Common, StaffCategoriesAPI } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { HostStaffCategory } from '@shared/interfaces';

import StaffCategoryCatalogue from './staff-category-catalogue';
import { StaffCategoryForm } from './staff-category-form/staff-category-form';

const allowedOperations = new Set<string>();
const category: HostStaffCategory = {
  id: 11,
  code: 'TEACHING',
  name: 'Teaching',
  description: 'Teaching and learning roles.',
  displayOrder: 10,
  isActive: true,
  isSystemDefined: true,
};

describe('StaffCategoryCatalogue', () => {
  let fixture: ComponentFixture<StaffCategoryCatalogue>;
  let dialogClose: Subject<boolean | undefined>;
  let apiMock: {
    getHostCatalogue: ReturnType<typeof vi.fn>;
    saveHostCategory: ReturnType<typeof vi.fn>;
  };
  let dialogMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    allowedOperations.clear();
    allowedOperations.add('View');
    allowedOperations.add('Add');
    allowedOperations.add('Update');

    apiMock = {
      getHostCatalogue: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'Loaded', data: [category] })),
      saveHostCategory: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'Saved', data: category })),
    };
    dialogMock = {
      open: vi.fn().mockImplementation(() => {
        dialogClose = new Subject();
        return { onClose: dialogClose, close: vi.fn() };
      }),
    };

    await TestBed.configureTestingModule({
      imports: [StaffCategoryCatalogue],
      providers: [
        provideRouter([]),
        ConfirmationService,
        { provide: DialogService, useValue: dialogMock },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        {
          provide: StaffCategoriesAPI,
          useValue: apiMock,
        },
        {
          provide: CurrentUserPermissionsStore,
          useValue: {
            canPerform: (_moduleCode: string, operation: string) =>
              allowedOperations.has(operation),
          },
        },
        {
          provide: FeaturePageStore,
          useValue: { displayNameOf: (moduleCode: string) => moduleCode },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffCategoryCatalogue);
    fixture.detectChanges();
  });

  it('loads catalogue rows and exposes Add and Update actions only with their grants', () => {
    expect(apiMock.getHostCatalogue).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Teaching');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Add Staff Category');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Edit');
  });

  it('hides the Add button and row actions when the user has View only', () => {
    allowedOperations.delete('Add');
    allowedOperations.delete('Update');

    const viewer = TestBed.createComponent(StaffCategoryCatalogue);
    viewer.detectChanges();
    const text = (viewer.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Add Staff Category');
    expect(text).not.toContain('Edit');
    expect(text).not.toContain('Deactivate');
  });

  it('keeps the rows in place while reloading after a save', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('p-skeleton')).toBeNull();
    expect(element.querySelectorAll('article').length).toBe(1);
  });

  it('shows shimmer rows with a status announcement while the catalogue first loads', () => {
    fixture.componentInstance.categories.set([]);
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="status"][aria-busy="true"]')?.textContent).toContain(
      'Loading Staff Categories...',
    );
    expect(element.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(element.querySelector('article')).toBeNull();
  });

  it('replaces the breadcrumb left behind by the previous page', () => {
    expect(TestBed.inject(Common).setBreadcrumbItems).toHaveBeenCalledWith([
      { label: 'Institution Master Data' },
      { label: 'Host-Staff-Category-Catalogue' },
    ]);
  });

  it('opens the form dialog for add and edit, and reloads only after a save', () => {
    fixture.componentInstance.openForm();
    expect(dialogMock.open).toHaveBeenLastCalledWith(
      StaffCategoryForm,
      expect.objectContaining({ header: 'Add Staff Category', data: { category: undefined } }),
    );

    dialogClose.next(undefined);
    expect(apiMock.getHostCatalogue).toHaveBeenCalledOnce();

    fixture.componentInstance.openForm(category);
    expect(dialogMock.open).toHaveBeenLastCalledWith(
      StaffCategoryForm,
      expect.objectContaining({ header: 'Edit Staff Category', data: { category } }),
    );

    dialogClose.next(true);
    expect(apiMock.getHostCatalogue).toHaveBeenCalledTimes(2);
  });

  it('asks for confirmation before deactivating and saves only on accept', () => {
    const confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    fixture.componentInstance.toggle(category);

    expect(apiMock.saveHostCategory).not.toHaveBeenCalled();
    confirmSpy.mock.calls[0][0].accept?.();
    expect(apiMock.saveHostCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 11, isActive: false }),
    );
    expect(apiMock.getHostCatalogue).toHaveBeenCalledTimes(2);
  });

  it('activates an inactive category without confirmation', () => {
    const confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    fixture.componentInstance.toggle({ ...category, isActive: false });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(apiMock.saveHostCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 11, isActive: true }),
    );
  });
});
