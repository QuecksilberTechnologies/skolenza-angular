import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DividerModule } from '@openng/optimus-ui/divider';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { MessageModule } from '@openng/optimus-ui/message';
import { PasswordModule } from '@openng/optimus-ui/password';
import { finalize, map, Observable } from 'rxjs';

import { AuthApi, Common, HostApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { LoginInfo, UpdatePasswordForm } from '@shared/interfaces';

@Component({
  selector: 'app-update-password',
  imports: [
    ReactiveFormsModule,
    IconFieldModule,
    InputIconModule,
    PasswordModule,
    DividerModule,
    ButtonModule,
    MessageModule,
    CardModule,
  ],
  templateUrl: './update-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UpdatePassword implements OnInit {
  readonly #authApi = inject(AuthApi);
  readonly #hostApi = inject(HostApi);
  readonly #authStore = inject(AuthStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly minPasswordLength = signal(8);
  readonly maxPasswordLength = signal(20);
  readonly isSaving = signal(false);
  protected updatePasswordForm!: FormGroup<UpdatePasswordForm>;
  protected loginInfo!: LoginInfo;

  constructor() {
    // Page Header Info
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Change Password',
      pageDescription: 'Update your account password',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: false,
    });

    this.iniForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  iniForm() {
    this.updatePasswordForm = this.#fb.group(
      {
        oldPassword: ['', Validators.required],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(this.minPasswordLength()),
            Validators.maxLength(this.maxPasswordLength()),
          ],
        ],
        confirmNewPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmNewPassword = control.get('confirmNewPassword');

    if (newPassword?.pristine || confirmNewPassword?.pristine) {
      return null;
    }

    return newPassword && confirmNewPassword && newPassword.value !== confirmNewPassword.value
      ? { passwordMismatch: true }
      : null;
  }

  isInvalid(controlName: string) {
    const control = this.updatePasswordForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async onSubmit() {
    const form = this.updatePasswordForm.value;
    const oldPassword = form.oldPassword?.trim() ?? '';
    const newPassword = form.newPassword?.trim() ?? '';

    if (this.#authStore.isHost()) {
      // The full host record hydrates asynchronously — the login payload's identity
      // is available immediately and carries the same id.
      const hostUserId =
        this.#authStore.hostUser()?.id ?? this.#authStore.sessionHost()?.hostUserId;

      if (!hostUserId) {
        this.#commonService.showMessage('Your host account is still loading. Try again.', 'error');
        return;
      }

      this.#submit(
        this.#hostApi
          .changeHostUserPassword({
            hostUserId,
            oldPassword,
            newPassword,
            confirmPassword: form.confirmNewPassword?.trim() ?? '',
          })
          .pipe(
            // The Host endpoint reports failure with HTTP 200 + isSucceeded: false.
            map((res) => {
              if (!res.isSucceeded) {
                throw new Error(res.message || 'Password could not be changed.');
              }

              return res;
            }),
          ),
      );

      return;
    }

    const sessionUser = this.loginInfo?.user;

    if (!sessionUser) {
      return;
    }

    this.#submit(
      this.#authApi.updateLoginPassword({
        loginId: sessionUser.officialEmail,
        userStaffMemberId: sessionUser.staffMemberId,
        staffMemberId: sessionUser.staffMemberId,
        oldPassword,
        newPassword,
      }),
    );
  }

  #submit(request$: Observable<unknown>) {
    this.isSaving.set(true);
    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async () => {
          this.#commonService.showMessage('Password has been successfully changed.', 'success');
          await this.#authApi.logout();
        },
        error: (error: Error) => {
          this.#commonService.showMessage(error.message, 'error');
        },
      });
  }
}
