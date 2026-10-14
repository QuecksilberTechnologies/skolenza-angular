import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, StaffCategoriesAPI } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { HostStaffCategory } from '@shared/interfaces';

import StaffCategoryCatalogue from './staff-category-catalogue';

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
  let apiMock: {
    getHostCatalogue: ReturnType<typeof vi.fn>;
    saveHostCategory: ReturnType<typeof vi.fn>;
  };

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

    await TestBed.configureTestingModule({
      imports: [StaffCategoryCatalogue],
      providers: [
        provideRouter([]),
        {
          provide: Common,
          useValue: { setPageHeaderInfo: vi.fn(), showMessage: vi.fn() },
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

  it('hides the create form and row actions when the user has View only', () => {
    allowedOperations.delete('Add');
    allowedOperations.delete('Update');

    const viewer = TestBed.createComponent(StaffCategoryCatalogue);
    viewer.detectChanges();
    const text = (viewer.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Add Staff Category');
    expect(text).not.toContain('Edit');
    expect(text).not.toContain('Deactivate');
  });

  it('validates required fields before sending a create request', () => {
    const component = fixture.componentInstance;
    component.model.set({
      id: null,
      code: ' ',
      name: '',
      description: '',
      displayOrder: 10,
      isActive: true,
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(apiMock.saveHostCategory).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Code is required');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Name is required');
  });

  it('normalizes the category code and reloads after a successful create', () => {
    const component = fixture.componentInstance;
    component.model.set({
      id: null,
      code: '  student_services ',
      name: 'Student Services',
      description: 'Counselling and learner support.',
      displayOrder: 60,
      isActive: true,
    });

    component.onSubmit();

    expect(apiMock.saveHostCategory).toHaveBeenCalledWith({
      code: 'STUDENT_SERVICES',
      name: 'Student Services',
      description: 'Counselling and learner support.',
      displayOrder: 60,
      isActive: true,
    });
    expect(apiMock.getHostCatalogue).toHaveBeenCalledTimes(2);
  });
});
