import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { AuthApi, CommonMenuApi, HostApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { HostUser, LoginInfo } from '@shared/interfaces';

import UpdatePassword from './update-password';

describe('UpdatePassword', () => {
  let component: UpdatePassword;
  let fixture: ComponentFixture<UpdatePassword>;
  let authApi: { updateLoginPassword: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let hostApi: {
    changeHostUserPassword: ReturnType<typeof vi.fn>;
    getHostUserById: ReturnType<typeof vi.fn>;
  };

  const asHost = async () => {
    TestBed.inject(AuthStore).setLoginData({
      userType: 'Host',
      user: null,
      hostUser: {
        hostUserId: 7,
        name: 'Riya Kapoor',
        loginId: 'riya.kapoor+host02@demo-corp.dev',
        email: 'riya.kapoor+host02@demo-corp.dev',
      },
      hostRole: { hostRoleId: 2, name: 'Support' },
    } as unknown as LoginInfo);
    // The host record is hydrated from HostApi, so let that resolve before asserting.
    await TestBed.inject(ApplicationRef).whenStable();
  };

  const fillForm = () => {
    component['updatePasswordForm'].setValue({
      oldPassword: ' old-secret ',
      newPassword: ' new-secret ',
      confirmNewPassword: ' new-secret ',
    });
  };

  beforeEach(async () => {
    authApi = {
      updateLoginPassword: vi.fn().mockReturnValue(of({})),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    hostApi = {
      changeHostUserPassword: vi.fn().mockReturnValue(of({ isSucceeded: true })),
      getHostUserById: vi.fn().mockReturnValue(
        of({
          isSucceeded: true,
          message: '',
          errors: [],
          data: {
            id: 7,
            hostRoleId: 2,
            hostRoleName: 'Support',
            name: 'Riya Kapoor',
            loginId: 'riya.kapoor+host02@demo-corp.dev',
            email: 'riya.kapoor+host02@demo-corp.dev',
            mobileNumber: '9000000000',
            isActive: true,
            addedDateTime: '',
            updatedDateTime: null,
          } as HostUser,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [UpdatePassword],
      providers: [
        MessageService,
        DatePipe,
        { provide: AuthApi, useValue: authApi },
        { provide: HostApi, useValue: hostApi },
        {
          provide: CommonMenuApi,
          useValue: {
            getCommonMenu: vi
              .fn()
              .mockReturnValue(of({ isSucceeded: true, message: '', errors: [], data: [] })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdatePassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('posts to the Host endpoint for a host login', async () => {
    await asHost();
    fillForm();

    await component.onSubmit();

    expect(hostApi.changeHostUserPassword).toHaveBeenCalledWith({
      hostUserId: 7,
      oldPassword: 'old-secret',
      newPassword: 'new-secret',
      confirmPassword: 'new-secret',
    });
    expect(authApi.updateLoginPassword).not.toHaveBeenCalled();
  });

  it('does not log the host out when the Host endpoint reports failure', async () => {
    hostApi.changeHostUserPassword.mockReturnValue(
      of({ isSucceeded: false, message: 'Old password is incorrect' }),
    );
    await asHost();
    fillForm();

    await component.onSubmit();

    expect(authApi.logout).not.toHaveBeenCalled();
  });

  it('posts to the Auth endpoint for an staffMember login', async () => {
    component['loginInfo'] = {
      user: { staffMemberId: 'emp-1', officialEmail: 'jane@demo-corp.dev' },
    } as never;
    fillForm();

    await component.onSubmit();

    expect(authApi.updateLoginPassword).toHaveBeenCalledWith({
      loginId: 'jane@demo-corp.dev',
      userStaffMemberId: 'emp-1',
      staffMemberId: 'emp-1',
      oldPassword: 'old-secret',
      newPassword: 'new-secret',
    });
    expect(hostApi.changeHostUserPassword).not.toHaveBeenCalled();
  });
});
