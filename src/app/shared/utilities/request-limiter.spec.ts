import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { requestLimiter } from './request-limiter';

describe('requestLimiter', () => {
  it('runs at most max requests and starts the next as one finishes', () => {
    const limit = requestLimiter(2);
    const requests = [new Subject<number>(), new Subject<number>(), new Subject<number>()];
    const values: number[] = [];

    requests.forEach((request) => limit(request).subscribe((value) => values.push(value)));
    expect(requests.map((request) => request.observed)).toEqual([true, true, false]);

    requests[0].next(1);
    requests[0].complete();
    expect(requests[2].observed).toBe(true);

    requests[2].next(3);
    expect(values).toEqual([1, 3]);
  });

  it('frees the slot on error and drops a waiting request that is unsubscribed', () => {
    const limit = requestLimiter(1);
    const first = new Subject<number>();
    const second = new Subject<number>();
    const third = new Subject<number>();

    limit(first).subscribe({ error: () => undefined });
    const waiting = limit(second).subscribe();
    limit(third).subscribe();
    waiting.unsubscribe();
    first.error(new Error('failed'));

    expect(second.observed).toBe(false);
    expect(third.observed).toBe(true);
  });
});
