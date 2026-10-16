import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthApi } from '@core/services/auth-api';
import { TokenRefreshService } from '@core/services/token-refresh-service';
import { isJwtExpired } from '@shared/utilities/jwt';
import { SKIP_AUTH } from '@shared/utilities/skip-auth.token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authApi = inject(AuthApi);
  const tokenRefresh = inject(TokenRefreshService);

  // Skip auth for public APIs
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const token = authApi.getToken();

  // Refresh up front on a known-stale token. A cold load fans out several requests at once, and
  // letting each of them 401 first costs a full round-trip per request.
  if (token && isJwtExpired(token)) {
    return sendWithRefreshedToken(req, next, authApi, tokenRefresh);
  }

  const authReq = token ? withToken(req, token) : req;

  // A 401 can still land here — clock skew, or a token revoked server-side. The public pages under
  // /auth call the API with no session at all, so their 401 must surface to the caller rather than
  // log a non-existent session out. A session that holds a token recovers through a refresh, or —
  // with no refresh token to recover with — is dead and has to be logged out, otherwise the user
  // sits inside the shell with every request 401-ing and nothing sending them back to login.
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !token) {
        return throwError(() => error);
      }

      if (!authApi.getRefreshToken()) {
        void authApi.logout();
        return throwError(() => error);
      }

      return sendWithRefreshedToken(req, next, authApi, tokenRefresh);
    }),
  );
};

/**
 * One refresh (shared with every other waiting request), one retry. Nothing re-enters this path,
 * so a request can never trigger more than a single refresh. A 401 on the retry means the freshly
 * issued token is already rejected — log out rather than spin.
 */
function sendWithRefreshedToken(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authApi: AuthApi,
  tokenRefresh: TokenRefreshService,
) {
  let retried = false;

  return tokenRefresh.refresh().pipe(
    switchMap((token) => {
      retried = true;
      return next(withToken(req, token));
    }),
    catchError((error: unknown) => {
      // Only a 401 on the retry logs out here. A failed refresh decides for itself (see
      // TokenRefreshService) — the error reaches the caller either way.
      if (retried && error instanceof HttpErrorResponse && error.status === 401) {
        void authApi.logout();
      }
      return throwError(() => error);
    }),
  );
}

function withToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
