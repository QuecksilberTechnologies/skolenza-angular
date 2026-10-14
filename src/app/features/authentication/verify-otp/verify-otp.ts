import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputOtpModule } from '@openng/optimus-ui/inputotp';
import { MessageModule } from '@openng/optimus-ui/message';
import { LucideAngularModule, Mail } from 'lucide-angular';
import { finalize } from 'rxjs';

import { AuthApi, Common } from '@core/services';
import AuthSplitCard from '@shared/components/auth-split-card/auth-split-card';
import { ForgotPasswordRequest, ValidateForgotPassOtpReq } from '@shared/interfaces';

@Component({
  selector: 'app-verify-otp',
  imports: [
    ButtonModule,
    ReactiveFormsModule,
    AuthSplitCard,
    InputOtpModule,
    LucideAngularModule,
    MessageModule,
    RouterModule,
  ],
  templateUrl: './verify-otp.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class VerifyOtp implements OnInit {
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly #fb = inject(FormBuilder);
  protected Mail = Mail;
  protected isSaving = signal(false);
  protected isResending = signal(false);
  protected verifyOtpForm!: FormGroup;
  protected loginId!: string;

  ngOnInit() {
    this.#authApi.isAuthenticatedUser();
    this.getQueryStrings();
  }

  getQueryStrings() {
    this.#router.routerState.root.queryParams
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params) => {
        this.loginId = params['loginId'];
        this.iniForm();
      });
  }

  iniForm() {
    this.verifyOtpForm = this.#fb.group({
      otp: ['', Validators.required],
    });
  }

  isInvalid(controlName: string) {
    const control = this.verifyOtpForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onResend() {
    const body: ForgotPasswordRequest = {
      loginId: this.loginId,
    };

    this.isResending.set(true);
    this.#authApi
      .forgotPassword(body)
      .pipe(
        finalize(() => this.isResending.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
        },
        error: (error: Error) => {
          this.#commonService.showMessage(error.message, 'error');
        },
      });
  }

  onSubmit() {
    const form = this.verifyOtpForm.value;
    const body: ValidateForgotPassOtpReq = {
      loginId: this.loginId,
      otp: form.otp?.trim(),
    };

    this.isSaving.set(true);
    this.#authApi
      .validateForgotPassOtp(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#router.navigate(['/auth/reset-password'], {
              queryParams: {
                otp: body.otp,
                loginId: this.loginId,
              },
            });
          }
        },
        error: (error: Error) => {
          this.#commonService.showMessage(error.message, 'error');
        },
      });
  }
}
