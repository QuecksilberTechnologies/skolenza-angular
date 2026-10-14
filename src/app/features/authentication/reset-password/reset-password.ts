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
import { CheckCircle2, LockKeyhole, LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { AuthApi, Common } from '@core/services';
import AuthSplitCard from '@shared/components/auth-split-card/auth-split-card';
import { CreateNewPasswordReq } from '@shared/interfaces';

@Component({
  selector: 'app-reset-password',
  imports: [
    PasswordModule,
    ButtonModule,
    RouterModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputIconModule,
    AuthSplitCard,
    LucideAngularModule,
    MessageModule,
  ],
  templateUrl: './reset-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResetPassword implements OnInit {
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly #fb = inject(FormBuilder);
  protected isSaving = signal(false);
  protected LockKeyhole = LockKeyhole;
  protected CheckCircle2 = CheckCircle2;
  protected resetPasswordForm!: FormGroup;
  protected token!: string;

  ngOnInit(): void {
    // this.#authService.isAuthenticatedUser();
    this.getQueryStrings();
  }

  getQueryStrings() {
    this.#router.routerState.root.queryParams
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params) => {
        this.token = params['token'];
        this.iniForm();
      });
  }

  iniForm() {
    this.resetPasswordForm = this.#fb.group(
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
    const form = this.resetPasswordForm.value;

    const body: CreateNewPasswordReq = {
      token: this.token,
      newPassword: form.password?.trim() ?? '',
      confirmPassword: form.confirmPassword?.trim() ?? '',
    };

    this.isSaving.set(true);
    this.#authApi
      .createNewLoginPassword(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (response.isSucceeded) {
            this.#commonService.showMessage(response.message, 'success');
            this.#router.navigate(['/auth/reset-success']);
          } else {
            this.#commonService.showMessage(response.message, 'error');
          }
        },
        error: (error: Error) => {
          this.#commonService.showMessage(error.message, 'error');
        },
      });
  }
}
