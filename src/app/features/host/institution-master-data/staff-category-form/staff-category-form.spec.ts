import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, StaffCategoriesAPI } from '@core/services';
import { HostStaffCategory } from '@shared/interfaces';

import { StaffCategoryForm } from './staff-category-form';

const category: HostStaffCategory = {
  id: 11,
  code: 'TEACHING',
  name: 'Teaching',
  description: 'Teaching and learning roles.',
  displayOrder: 10,
  isActive: true,
  isSystemDefined: true,
};

describe('StaffCategoryForm', () => {
  let apiMock: { saveHostCategory: ReturnType<typeof vi.fn> };
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  async function create(data: { category?: HostStaffCategory }) {
    apiMock = {
      saveHostCategory: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'Saved', data: category })),
    };
    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [StaffCategoryForm],
      providers: [
        { provide: StaffCategoriesAPI, useValue: apiMock },
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: DynamicDialogRef, useValue: dialogRef },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<StaffCategoryForm> = TestBed.createComponent(StaffCategoryForm);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps Save enabled on a blank form so submitting shows the required errors', async () => {
    const fixture = await create({});
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(apiMock.saveHostCategory).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Code is required');
    expect(element.textContent).toContain('Name is required');
  });

  it('normalizes the code on create and closes with true after a successful save', async () => {
    const fixture = await create({});
    fixture.componentInstance.model.set({
      id: null,
      code: '  student_services ',
      name: 'Student Services',
      description: 'Counselling and learner support.',
      displayOrder: 60,
      isActive: true,
    });

    fixture.componentInstance.onSubmit();

    expect(apiMock.saveHostCategory).toHaveBeenCalledWith({
      code: 'STUDENT_SERVICES',
      name: 'Student Services',
      description: 'Counselling and learner support.',
      displayOrder: 60,
      isActive: true,
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('prefills an edit and sends the category id', async () => {
    const fixture = await create({ category });

    expect(fixture.componentInstance.isEditMode).toBe(true);
    fixture.componentInstance.onSubmit();

    expect(apiMock.saveHostCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 11, code: 'TEACHING', name: 'Teaching' }),
    );
  });

  it('closes without a result on Cancel', async () => {
    const fixture = await create({});

    fixture.componentInstance.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
