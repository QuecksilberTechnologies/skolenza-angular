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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { MessageModule } from '@openng/optimus-ui/message';
import { PasswordModule } from '@openng/optimus-ui/password';
import { CheckCircle2, LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { AuthApi, Common } from '@core/services';
import AuthSplitCard from '@shared/components/auth-split-card/auth-split-card';
import { UpdateLoginPasswordReq } from '@shared/interfaces';

@Component({
  selector: 'app-registration-password',
  imports: [
    PasswordModule,
    ButtonModule,
    RouterModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    LucideAngularModule,
    AuthSplitCard,
  ],
  templateUrl: './registration-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RegistrationPassword implements OnInit {
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #fb = inject(FormBuilder);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  protected registrationPassForm!: FormGroup;
  protected isSaving = signal(false);
  protected CheckCircle2 = CheckCircle2;
  protected staffMemberId = '';
  protected userId = '';

  ngOnInit() {
    this.#authApi.isAuthenticatedUser();
    this.getQueryStrings();
  }

  getQueryStrings() {
    this.#router.routerState.root.queryParams
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params) => {
        this.staffMemberId = params['staffMemberId'];
        this.userId = params['userId'];
        this.iniForm();
      });
  }

  iniForm() {
    this.registrationPassForm = this.#fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20)]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password?.pristine || confirmPassword?.pristine) {
      return null;
    }

    return password && confirmPassword && password.value !== confirmPassword.value
      ? { passwordMismatch: true }
      : null;
  }

  onSubmit() {
    if (this.registrationPassForm.valid) {
      const form = this.registrationPassForm.value;

      const obj: UpdateLoginPasswordReq = {
        loginId: this.userId,
        userStaffMemberId: this.staffMemberId,
        staffMemberId: this.staffMemberId,
        newPassword: form.password?.trim(),
        oldPassword: form.password?.trim(),
      };

      this.isSaving.set(true);
      this.#authApi
        .updateLoginPassword(obj)
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: () => {
            this.#commonService.showMessage('Password has been successfully changed.', 'success');
            this.#router.navigate(['/auth/login']);
          },
          error: (error: Error) => {
            this.#commonService.showMessage(error.message, 'error');
          },
        });
    }
  }
}
