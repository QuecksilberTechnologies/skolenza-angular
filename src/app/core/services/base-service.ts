import { HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { SKIP_AUTH } from '@shared/utilities/skip-auth.token';

/** Error thrown by every API wrapper; keeps the HTTP status alongside the unwrapped message. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorCode?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

@Injectable({
  providedIn: 'root',
})
export abstract class BaseService {
  protected handleError<T>(operation = 'operation') {
    return (error: HttpErrorResponse): Observable<T> => {
      // Network/client-side failures (status 0) surface as ErrorEvent/ProgressEvent.
      const isClientError =
        error.error instanceof ErrorEvent || error.error instanceof ProgressEvent;

      // Server responses carry the API envelope on `error.error`; prefer its message.
      const body = !isClientError ? this.readErrorBody(error.error) : undefined;
      const apiMessage = body ? this.readApiMessage(body) : undefined;
      const errorCode = body ? this.readString(body, 'errorCode', 'ErrorCode') : undefined;
      const message = apiMessage || this.statusMessage(error.status);
      console.error(`${operation} failed:`, message);

      return throwError(() => new ApiError(message, error.status, errorCode));
    };
  }

  private readErrorBody(errorBody: unknown): Record<string, unknown> | undefined {
    if (errorBody && typeof errorBody === 'object') {
      return errorBody as Record<string, unknown>;
    }

    // A non-JSON string body is only worth showing when it is plain text, not an HTML error page.
    if (typeof errorBody !== 'string' || !errorBody.trim() || /^\s*</.test(errorBody)) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(errorBody) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : { message: errorBody };
    } catch {
      return { message: errorBody };
    }
  }

  private readApiMessage(body: Record<string, unknown>): string | undefined {
    const message = this.readString(body, 'message', 'Message');
    const details = this.readErrorDetails(body);

    if (message && details && !message.includes(details)) {
      return `${message} ${details}`;
    }

    return message ?? details;
  }

  private readString(body: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
      const value = body[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }

    return undefined;
  }

  private statusMessage(status: number): string {
    switch (status) {
      case 0:
        return 'Unable to reach the server. Check your internet connection and try again.';
      case 400:
        return 'The submitted information is invalid. Review the values and try again.';
      case 401:
        return 'Your session has expired. Sign in again and retry the request.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested record was not found or is no longer available.';
      case 409:
        return 'This request conflicts with existing data. Refresh the page and review the values.';
      default:
        return `The server could not complete this request (HTTP ${status}). Please try again.`;
    }
  }

  /**
   * Model-validation failures carry no `message`: the API envelope uses `errors: string[]`,
   * while ASP.NET ProblemDetails uses `errors: { field: string[] }` plus a `title`.
   */
  private readErrorDetails(body: Record<string, unknown>): string | undefined {
    const errors = body['errors'] ?? body['Errors'];
    const title = body['title'] ?? body['Title'];

    if (Array.isArray(errors)) {
      const messages = errors.filter((item): item is string => typeof item === 'string');
      if (messages.length) return messages.join('. ');
    }

    if (errors && typeof errors === 'object') {
      const messages = Object.values(errors)
        .flat()
        .filter((item): item is string => typeof item === 'string');
      if (messages.length) return messages.join('. ');
    }

    return typeof title === 'string' ? title : undefined;
  }

  /**
   * Returns an HttpContext indicating whether to skip authentication.
   * By default, this method returns a context requiring authentication (SKIP_AUTH: false).
   * To skip auth, call with `skipAuth = true`.
   */
  protected handleHttpContext(skipAuth = false) {
    return new HttpContext().set(SKIP_AUTH, skipAuth);
  }

  protected makeHttpParams(obj: unknown) {
    let params = new HttpParams();

    if (!obj) {
      return;
    }

    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value);
      }
    });

    return params;
  }
}
