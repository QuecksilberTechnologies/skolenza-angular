import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { Common } from '@core/services/common';
import { SKIP_ERROR_TOAST } from '@shared/utilities/skip-error-toast.token';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const common = inject(Common);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let message: string;

      switch (err.status) {
        case 0:
          message = 'Client error';
          break;

        case HttpStatusCode.InternalServerError:
          message = 'Server error';
          break;

        case HttpStatusCode.BadRequest:
          message = 'Request error';
          break;

        case HttpStatusCode.Unauthorized:
          message = 'Unauthorized';
          break;

        case HttpStatusCode.Forbidden:
          message = 'Forbidden';
          // A 403 is the server's final answer — no refresh recovers it, and the route guards can't
          // see it. Tell the user here, but stay on the page: a forbidden `GET /staffMembers` means
          // the table is off limits, not that the whole screen is. Callers that recover from a
          // denial on their own opt out, or the user is told about a failure that never surfaced.
          if (!req.context.get(SKIP_ERROR_TOAST)) {
            common.showMessage('You do not have permission to perform this action.', 'error');
          }
          break;

        default:
          message = 'Unknown error';
      }

      console.error(`🐞 ${message}`, err.error);

      // Preserve the original HttpErrorResponse so downstream handlers
      // (BaseService.handleError, GlobalErrorHandler) keep status + body.
      return throwError(() => err);
    }),
  );
};
