import { catchError, Observable, of } from 'rxjs';

import { ApiEnvelope } from '@shared/interfaces';

/** An answered call, or the error it failed with - `BaseService` throws `ApiError extends Error`. */
export type SettledResponse<T> = ApiEnvelope<T> | Error;

/**
 * Turns a failing call into a value, so a sibling call in the same `forkJoin` still lands rather
 * than being cancelled by its neighbour.
 */
export function settle<T>(source: Observable<ApiEnvelope<T>>): Observable<SettledResponse<T>> {
  return source.pipe(catchError((err: Error) => of(err)));
}

/**
 * Binds one error reporter, and answers with the function that applies a settled call: the data
 * on success, the reporter on a transport error or a rejected envelope alike.
 */
export function responseApplier(onError: (message: string) => void) {
  return <T>(result: SettledResponse<T>, apply: (data: T) => void): void => {
    if (result instanceof Error) {
      onError(result.message);
      return;
    }

    if (!result.isSucceeded) {
      onError(result.message);
      return;
    }

    apply(result.data);
  };
}
