import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, StaffMembersApi } from '@core/services';
import { IStaffMember } from '@shared/interfaces';

import { StaffMemberResetPasswordDialog } from './staff-member-reset-password-dialog';

const staffMember = {
  staffMemberId: 'emp-2',
  firstName: 'Asha',
  middleName: '',
  lastName: 'Rao',
  officialEmail: 'asha@skolenza.test',
} as IStaffMember;

describe('StaffMemberResetPasswordDialog', () => {
  const staffMembersApiMock = { resetStaffMemberPassword: vi.fn() };
  const commonMock = { showMessage: vi.fn() };
  const dialogRefMock = { close: vi.fn() };

  async function createFixture(): Promise<ComponentFixture<StaffMemberResetPasswordDialog>> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StaffMembersApi, useValue: staffMembersApiMock },
        { provide: Common, useValue: commonMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data: { staffMember } } },
      ],
    });

    const fixture = TestBed.createComponent(StaffMemberResetPasswordDialog);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    staffMembersApiMock.resetStaffMemberPassword.mockReturnValue(
      of({ isSucceeded: true, message: 'Password reset', errors: [], data: null }),
    );
  });

  it('renders both password fields and the two footer buttons', async () => {
    const fixture = await createFixture();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('#newPassword')).toBeTruthy();
    expect(host.querySelector('#confirmPassword')).toBeTruthy();
    expect(host.querySelectorAll('p-button')).toHaveLength(2);
  });

  it('does not call the API while the password is too short', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component['model'].set({ newPassword: 'Sh0rt', confirmPassword: 'Sh0rt' });

    component.onSubmit();

    expect(staffMembersApiMock.resetStaffMemberPassword).not.toHaveBeenCalled();
  });

  it('does not call the API while the confirmation differs', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component['model'].set({ newPassword: 'Str0ngPass1', confirmPassword: 'Str0ngPass2' });

    component.onSubmit();

    expect(staffMembersApiMock.resetStaffMemberPassword).not.toHaveBeenCalled();
  });

  /** `moduleId` / `operationId` are the interceptor's job, not this component's. */
  it('posts only the staffMember and the two passwords, then closes', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component['model'].set({ newPassword: 'Str0ngPass1', confirmPassword: 'Str0ngPass1' });

    component.onSubmit();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(staffMembersApiMock.resetStaffMemberPassword).toHaveBeenCalledWith({
      staffMemberId: 'emp-2',
      newPassword: 'Str0ngPass1',
      confirmPassword: 'Str0ngPass1',
    });
    expect(commonMock.showMessage).toHaveBeenCalledWith('Password reset', 'success');
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('keeps the dialog open when the API reports a failure', async () => {
    staffMembersApiMock.resetStaffMemberPassword.mockReturnValue(
      of({ isSucceeded: false, message: 'Password policy not met', errors: [], data: null }),
    );
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component['model'].set({ newPassword: 'Str0ngPass1', confirmPassword: 'Str0ngPass1' });

    component.onSubmit();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(commonMock.showMessage).toHaveBeenCalledWith('Password policy not met', 'error');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('closes without a request when cancelled', async () => {
    const fixture = await createFixture();

    fixture.componentInstance.onCancel();

    expect(staffMembersApiMock.resetStaffMemberPassword).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith();
  });
});
