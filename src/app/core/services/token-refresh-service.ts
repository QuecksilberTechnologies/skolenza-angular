import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, shareReplay, throwError } from 'rxjs';

import { GetRefreshTokenReq } from '@shared/interfaces';

import { AuthApi } from './auth-api';

/**
 * Owns the single in-flight refresh. Concurrent 401s (or a cold load on an expired token) all
 * share one `POST /Auth/refresh-token` instead of racing each other, and — unlike a token-only
 * subject — a failed refresh propagates the error to every waiter rather than stranding them.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  readonly #authApi = inject(AuthApi);

  #inFlight: Observable<string> | null = null;

  /** Emits the new access token. Callers subscribing while a refresh runs join that same call. */
  refresh(): Observable<string> {
    if (this.#inFlight) {
      return this.#inFlight;
    }

    const refreshToken = this.#authApi.getRefreshToken();

    if (!refreshToken) {
      void this.#authApi.logout();
      return throwError(() => new Error('Missing refresh token'));
    }

    const body: GetRefreshTokenReq = {
      refreshToken,
      ipAddress: this.#authApi.getClientIp(),
    };

    this.#inFlight = this.#authApi.refreshToken(body).pipe(
      map((res) => {
        // A refused refresh can still arrive as a 200; saving its empty tokens would wipe the pair.
        if (!res.isSucceeded || !res.data?.token || !res.data.refreshToken) {
          throw new RefreshRefusedError(res.message || 'Token refresh failed');
        }
        this.#authApi.setTokens(res.data.token, res.data.refreshToken);
        return res.data.token;
      }),
      catchError((err: unknown) => {
        // Only a refusal proves the refresh token is dead. A network or server fault keeps the
        // session, so a blip doesn't cost the user their work.
        const refused =
          err instanceof RefreshRefusedError ||
          (err instanceof HttpErrorResponse && err.status === 401);
        if (refused) {
          void this.#authApi.logout();
        }
        return throwError(() => err);
      }),
      finalize(() => this.reset()),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.#inFlight;
  }

  /** Drops the shared refresh so the next caller starts a fresh one. */
  reset() {
    this.#inFlight = null;
  }
}

/** The API answered the refresh with a 200 envelope that refuses it. */
class RefreshRefusedError extends Error {
  override name = 'RefreshRefusedError';
}
