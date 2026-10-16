import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField, submit, validateStandardSchema } from '@angular/forms/signals';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { PasswordModule } from '@openng/optimus-ui/password';
import { finalize } from 'rxjs';

import { AuthApi, Common } from '@core/services';
import { AuthStore, CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import AuthCard from '@shared/components/auth-card/auth-card';
import { TrimInput } from '@shared/directives';
import { DetectDevice, LoginInfo, LoginRequest, LoginResponse } from '@shared/interfaces';
import { resolveRoleTypeId } from '@shared/utilities/login-info';

import { LoginModel, loginSchema } from './login.schema';

@Component({
  selector: 'app-login',
  imports: [
    RouterModule,
    FormField,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    TrimInput,
    AuthCard,
  ],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Login implements OnInit {
  readonly #authApi = inject(AuthApi);
  readonly #authStore = inject(AuthStore);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);

  readonly isSaving = signal<boolean>(false);
  protected deviceInfo?: DetectDevice;

  protected readonly model = signal<LoginModel>({ email: '', password: '' });

  protected readonly f = form(this.model, (p) => validateStandardSchema(p, loginSchema));

  ngOnInit(): void {
    this.#authApi.isAuthenticatedUser();
    this.#loadDeviceInfo();
  }

  #loadDeviceInfo(): void {
    this.#authApi
      .getDeviceInfo()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.deviceInfo = res;
        },
        error: (err: Error) => this.#showError(err.message),
      });
  }

  async login(): Promise<void> {
    // Enter submits natively, bypassing the disabled Login button.
    if (this.isSaving()) {
      return;
    }

    // `submit()` marks every field touched and skips the action when the form is invalid.
    await submit(this.f, async () => {
      this.isSaving.set(true);
      this.#authApi
        .login(this.#buildLoginRequest())
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => this.#handleLoginResponse(res),
          error: (err: Error) => this.#showError(err.message),
        });
    });
  }

  #buildLoginRequest(): LoginRequest {
    const { email, password } = this.model();

    return {
      loginId: email.trim(),
      password: password.trim(),
      macAddress: '',
      ipAddressPublic: this.deviceInfo?.publicIp || '',
      ipAddressLocal: this.deviceInfo?.localIp || '',
      latitude: 0,
      longitude: 0,
      loginDevice: this.deviceInfo?.deviceType,
    };
  }

  #handleLoginResponse(res: LoginResponse): void {
    const data = res.data;

    if (!res.isSucceeded || !data) {
      this.#showError(res.message);
      return;
    }

    if (data.user?.isPasswordChangeRequired) {
      this.#router.navigate(['/auth/set-password'], {
        queryParams: { token: data.accessToken },
      });
      return;
    }

    const roleTypeId = resolveRoleTypeId(data);

    // Neither an staffMember nor a host session — nothing to persist. `res.message` is the
    // success text on this branch, so it would surface as a nonsense error toast.
    if (roleTypeId == null) {
      this.#showError('Your account has no role assigned. Contact your administrator.');
      return;
    }

    void this.#startSession(data, roleTypeId);
  }

  async #startSession(loginInfo: LoginInfo, roleTypeId: number): Promise<void> {
    this.#authApi.setLoginInfo(loginInfo);
    this.#authApi.setTokens(loginInfo.accessToken, loginInfo.refreshToken);
    this.#authApi.setClientIp(this.deviceInfo?.publicIp);
    this.#authApi.setAuthRoleType(roleTypeId);
    this.#authStore.setLoginData(loginInfo);

    // Re-reads the session just stored: sets isSuperAdmin and loads the role
    // matrix when there is one (a host has no institution permission matrix).
    this.#permissionsStore.loadFromStorage();

    // Cleared before loading, not just refetched: `onInit` may already have hydrated the previous
    // account's cached tree, and a failed load deliberately keeps whatever is in `nodes` — so
    // without this a new account on a shared browser can render the previous one's menu.
    this.#featurePageStore.clear();

    // Warms the sidebar while the dashboard chunk loads.
    void this.#featurePageStore.load();

    // A cancelled navigation or a lazy chunk that fails to load would otherwise leave the user
    // on the login page with no feedback at all.
    const navigated = await this.#authApi.redirectToDashboard(roleTypeId);

    if (!navigated) {
      this.#showError('Could not open your dashboard. Please try again.');
    }
  }

  #showError(message: string): void {
    this.#commonService.showMessage(message, 'error');
  }
}
