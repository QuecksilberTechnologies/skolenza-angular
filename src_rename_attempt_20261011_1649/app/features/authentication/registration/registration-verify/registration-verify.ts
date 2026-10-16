import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import { CircleCheckBig, CircleX, LucideAngularModule, Mail } from 'lucide-angular';
import { finalize } from 'rxjs';

import { Common, InstitutionsApi } from '@core/services';
import AuthCard from '@shared/components/auth-card/auth-card';

@Component({
  selector: 'app-registration-verify',
  imports: [AuthCard, ButtonModule, ProgressSpinnerModule, LucideAngularModule],
  templateUrl: './registration-verify.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RegistrationVerify implements OnInit {
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #commonService = inject(Common);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  protected isLoading = signal(false);
  protected isError = signal(false);
  protected errorMessages = signal<string[]>([]);
  protected token!: string;
  protected Mail = Mail;
  protected CircleX = CircleX;
  protected CircleCheckBig = CircleCheckBig;

  ngOnInit() {
    this.getQueryStrings();
  }

  getQueryStrings() {
    this.#router.routerState.root.queryParams
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((params) => {
        this.token = params['token'];
        this.verifyEmail(this.token);
      });
  }

  navigateToLogin(): void {
    this.#router.navigate(['/auth/login']);
  }

  verifyEmail(token: string) {
    this.isLoading.set(true);
    this.#institutionsApi
      .verifyEmail(token)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          // A consumed or expired token comes back 200 with `isSucceeded: false`. Nothing
          // navigates in that case, so the page has to say so rather than show the success mark.
          if (!res.isSucceeded) {
            this.isError.set(true);
            this.errorMessages.set(res.message ? [res.message] : []);
          }
          if (res.isSucceeded) {
            setTimeout(() => {
              // TODO: Verify api response data
              this.#router.navigate(['/auth/registration-password'], {
                queryParams: {
                  staffMemberId: res.data.staffMemberId,
                  institutionId: res.data.institutionId,
                  userId: res.data.userId,
                },
              });
            }, 1000);
          }
        },
        error: (error: unknown) => {
          this.isError.set(true);

          // TODO: Remove this after backend fix
          // Normalize error extraction for Token errors
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tokenErrors = (error as any)?.errors?.Token;
          if (Array.isArray(tokenErrors) && tokenErrors.every((e) => typeof e === 'string')) {
            this.errorMessages.set(tokenErrors);
          }
        },
      });
  }
}
