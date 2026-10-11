import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { throwError } from 'rxjs';

import { isUnavailableRoute, UNAVAILABLE_ROUTE_MESSAGE } from './unavailable-routes';

/**
 * Fails a request the API does not serve without sending it.
 *
 * The round trip only ever returns a 404 that `errorInterceptor` reports as `Unknown error`, so the
 * user learns nothing and the network carries a request that cannot succeed. Failing here turns it
 * into one sentence they can act on.
 *
 * The status stays the `404` the server would have sent, rather than a truer `501`: the message
 * body already says the route is undeployed, and `GlobalErrorHandler` files anything outside
 * `0 < status < 500` as a Sentry incident. A 5xx here would report every click on a gated screen.
 * `BaseService.handleError` reads `error.message` off the body, so every API wrapper surfaces the
 * same sentence as an `ApiError`.
 */
export const unavailableRouteInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isUnavailableRoute(req.method, req.url)) return next(req);

  if (isDevMode()) {
    console.warn(`🚧 ${req.method} ${req.url} is not deployed - request not sent`);
  }

  return throwError(
    () =>
      new HttpErrorResponse({
        status: HttpStatusCode.NotFound,
        statusText: 'Not Found',
        url: req.urlWithParams,
        error: { message: UNAVAILABLE_ROUTE_MESSAGE },
      }),
  );
};
