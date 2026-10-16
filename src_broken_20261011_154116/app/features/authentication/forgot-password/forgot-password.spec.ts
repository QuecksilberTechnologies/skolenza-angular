import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthApi, Common } from '@core/services';

import ForgotPassword from './forgot-password';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;

  const authApiMock = { isAuthenticatedUser: vi.fn(), forgotPassword: vi.fn() };
  const commonMock = { showMessage: vi.fn() };
  const routerMock = { navigate: vi.fn() };

  function fillValidForm(): void {
    component['forgotForm'].setValue({ email: 'user@example.com' });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    authApiMock.isAuthenticatedUser.mockResolvedValue(undefined);
    authApiMock.forgotPassword.mockReturnValue(of({ isSucceeded: true, message: 'sent' }));
    routerMock.navigate.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        { provide: AuthApi, useValue: authApiMock },
        { provide: Common, useValue: commonMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit when the form is invalid', () => {
    component.sendResetCode();

    expect(component['forgotForm'].touched).toBe(true);
    expect(authApiMock.forgotPassword).not.toHaveBeenCalled();
  });

  it('should call forgotPassword with the email as the login id', () => {
    fillValidForm();

    component.sendResetCode();

    expect(authApiMock.forgotPassword).toHaveBeenCalledWith({ loginId: 'user@example.com' });
  });

  it('should show a success message and redirect to verify-otp when the code is sent', () => {
    fillValidForm();

    component.sendResetCode();

    expect(commonMock.showMessage).toHaveBeenCalledWith('sent', 'success');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/verify-otp'], {
      queryParams: { loginId: 'user@example.com' },
    });
  });

  it('should show an error and not redirect when the response is not succeeded', () => {
    authApiMock.forgotPassword.mockReturnValue(of({ isSucceeded: false, message: 'no such user' }));
    fillValidForm();

    component.sendResetCode();

    expect(commonMock.showMessage).toHaveBeenCalledWith('no such user', 'error');
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should show an error and reset saving state when the request fails', () => {
    authApiMock.forgotPassword.mockReturnValue(throwError(() => new Error('boom')));
    fillValidForm();

    component.sendResetCode();

    expect(commonMock.showMessage).toHaveBeenCalledWith('boom', 'error');
    expect(component.isSaving()).toBe(false);
  });

  it('should reset saving state after the code is sent', () => {
    fillValidForm();

    component.sendResetCode();

    expect(component.isSaving()).toBe(false);
  });
});
