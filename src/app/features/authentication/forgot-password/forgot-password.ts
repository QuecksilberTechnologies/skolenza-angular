import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { finalize } from 'rxjs';

import { AuthApi, Common } from '@core/services';
import AuthSplitCard from '@shared/components/auth-split-card/auth-split-card';
import { TrimInput } from '@shared/directives';
import { ForgotForm, ForgotPasswordRequest, ForgotPasswordResponse } from '@shared/interfaces';
import { EMAIL_PATTERN } from '@shared/utilities/validation-regex';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    MessageModule,
    RouterModule,
    TrimInput,
    AuthSplitCard,
  ],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ForgotPassword implements OnInit {
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly #fb = inject(NonNullableFormBuilder);

  readonly isSaving = signal<boolean>(false);
  protected forgotForm!: FormGroup<ForgotForm>;

  constructor() {
    this.#initForm();
  }

  #initForm(): void {
    this.forgotForm = this.#fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(EMAIL_PATTERN)]],
    });
  }

  ngOnInit(): void {
    this.#authApi.isAuthenticatedUser();
  }

  isInvalid(controlName: string): boolean {
    const control = this.forgotForm.get(controlName);
    return !!control?.invalid && control.touched;
  }

  sendResetCode(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const body = this.#buildForgotPasswordRequest();

    this.isSaving.set(true);
    this.#authApi
      .forgotPassword(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => this.#handleForgotPasswordResponse(res, body.loginId),
        error: (err: Error) => this.#showError(err.message),
      });
  }

  #buildForgotPasswordRequest(): ForgotPasswordRequest {
    const { email } = this.forgotForm.getRawValue();

    return { loginId: email.trim() };
  }

  #handleForgotPasswordResponse(res: ForgotPasswordResponse, loginId: string): void {
    if (!res.isSucceeded) {
      this.#showError(res.message);
      return;
    }

    this.#commonService.showMessage(res.message, 'success');
    this.#router.navigate(['/auth/verify-otp'], { queryParams: { loginId } });
  }

  #showError(message: string): void {
    this.#commonService.showMessage(message, 'error');
  }
}
