import { Observable, Subscription } from 'rxjs';

/**
 * An operator that lets at most `max` of the observables piped through it run at once; the rest
 * wait their turn and start, in order, as running ones complete, fail or are unsubscribed. One
 * limiter shared by many requests keeps a burst (a page of units each fetching its topics) from
 * flooding the API.
 */
export function requestLimiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  const startNext = (): void => {
    while (active < max && waiting.length) waiting.shift()?.();
  };

  return <T>(source: Observable<T>): Observable<T> =>
    new Observable<T>((subscriber) => {
      let subscription: Subscription | undefined;
      let running = false;
      const finish = (): void => {
        if (!running) return;
        running = false;
        active--;
        startNext();
      };
      const start = (): void => {
        running = true;
        active++;
        subscription = source.subscribe({
          next: (value) => subscriber.next(value),
          error: (error: unknown) => {
            finish();
            subscriber.error(error);
          },
          complete: () => {
            finish();
            subscriber.complete();
          },
        });
      };
      waiting.push(start);
      startNext();
      return () => {
        const index = waiting.indexOf(start);
        if (index >= 0) waiting.splice(index, 1);
        subscription?.unsubscribe();
        finish();
      };
    });
}
