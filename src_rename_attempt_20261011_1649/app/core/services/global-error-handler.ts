import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error) {
    const err = (error as { rejection?: unknown })?.rejection ?? error;
    let message: string;

    if (err instanceof HttpErrorResponse) {
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

        case HttpStatusCode.Forbidden:
          message = 'Forbidden';
          break;

        default:
          message = 'Unknown error';
      }
    } else {
      message = 'Application error';
    }

    console.error(message, err);

    // Client-side (0) and server (5xx) failures are real incidents; 4xx is already surfaced to
    // the user by errorInterceptor and would just be Sentry noise.
    const isNoisyHttp = err instanceof HttpErrorResponse && err.status !== 0 && err.status < 500;
    if (!isNoisyHttp) {
      import('@sentry/angular').then(({ captureException }) => captureException(err));
    }
  }
}
