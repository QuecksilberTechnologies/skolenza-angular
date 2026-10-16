import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, ReportTypeApi } from '@core/services';
import { ReportType } from '@shared/interfaces';

import ReportTypeManageDialog from './report-type-manage-dialog';

/** The form and the submit handlers are `protected`; the spec drives them directly. */
interface DialogInternals {
  form: FormGroup;
  onSubmit(): void;
}

describe('ReportTypeManageDialog', () => {
  const reportTypeApiMock = {
    addReportType: vi.fn(),
    updateReportType: vi.fn(),
  };

  const commonMock = {
    getLoginInfo: vi.fn(),
    showMessage: vi.fn(),
  };

  const dialogRefMock = { close: vi.fn(), destroy: vi.fn() };

  const setup = async (reportType?: ReportType) => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ReportTypeManageDialog],
      providers: [
        { provide: ReportTypeApi, useValue: reportTypeApiMock },
        { provide: Common, useValue: commonMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data: { reportType } } },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<ReportTypeManageDialog> =
      TestBed.createComponent(ReportTypeManageDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    return {
      fixture,
      internals: fixture.componentInstance as unknown as DialogInternals,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    commonMock.getLoginInfo.mockResolvedValue({
      user: { staffMemberId: 'emp-guid-1', primaryRole: { roleId: 4 } },
    });
    reportTypeApiMock.addReportType.mockReturnValue(
      of({ isSucceeded: true, message: 'Added.', errors: [], data: [] }),
    );
    reportTypeApiMock.updateReportType.mockReturnValue(
      of({ isSucceeded: true, message: 'Updated.', errors: [], data: [] }),
    );
  });

  it('creates a report type with the chosen status', async () => {
    const { internals } = await setup();
    internals.form.setValue({
      typeName: 'Attendance Summary',
      description: 'Daily rollup',
      isActive: false,
    });

    internals.onSubmit();

    expect(reportTypeApiMock.addReportType).toHaveBeenCalledWith({
      typeName: 'Attendance Summary',
      description: 'Daily rollup',
      isActive: false,
    });
  });

  it('omits a blank description from the create body', async () => {
    const { internals } = await setup();
    internals.form.setValue({ typeName: 'Attendance Summary', description: '  ', isActive: true });

    internals.onSubmit();

    expect(reportTypeApiMock.addReportType).toHaveBeenCalledWith({
      typeName: 'Attendance Summary',
      description: undefined,
      isActive: true,
    });
  });

  /** Editing used to send `isActive: true`, silently reactivating a deactivated row. */
  it('seeds the status control from the row being edited', async () => {
    const { internals } = await setup({
      id: 7,
      typeName: 'Attendance Summary',
      description: 'Daily rollup',
      isActive: false,
    });

    expect(internals.form.get('isActive')?.value).toBe(false);

    internals.form.patchValue({ description: 'Updated rollup' });
    internals.onSubmit();

    expect(reportTypeApiMock.updateReportType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, isActive: false, description: 'Updated rollup' }),
    );
  });

  it('sends the status picked in the dialog when editing', async () => {
    const { internals } = await setup({
      id: 7,
      typeName: 'Attendance Summary',
      description: 'Daily rollup',
      isActive: false,
    });
    internals.form.patchValue({ isActive: true });

    internals.onSubmit();

    expect(reportTypeApiMock.updateReportType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, isActive: true }),
    );
  });

  it('does not call the API for an invalid form', async () => {
    const { internals } = await setup();
    internals.form.setValue({ typeName: '', description: '', isActive: true });

    internals.onSubmit();

    expect(reportTypeApiMock.addReportType).not.toHaveBeenCalled();
    expect(internals.form.get('typeName')?.touched).toBe(true);
  });

  it('closes the dialog once the backend confirms', async () => {
    const { internals } = await setup();
    internals.form.setValue({
      typeName: 'Attendance Summary',
      description: '',
      isActive: true,
    });

    internals.onSubmit();

    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('keeps the dialog open when the backend rejects the save', async () => {
    reportTypeApiMock.addReportType.mockReturnValue(
      of({ isSucceeded: false, message: 'Name already exists.', errors: [], data: [] }),
    );
    const { internals } = await setup();
    internals.form.setValue({
      typeName: 'Attendance Summary',
      description: '',
      isActive: true,
    });

    internals.onSubmit();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(commonMock.showMessage).toHaveBeenCalledWith('Name already exists.', 'error');
  });
});
