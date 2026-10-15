import { Subject, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { pendingCounter } from './pending-counter';

describe('pendingCounter', () => {
  it('stays active until every tracked request has completed', () => {
    const counter = pendingCounter();
    const first = new Subject<number>();
    const second = new Subject<number>();

    counter.track(first).subscribe();
    counter.track(second).subscribe();
    expect(counter.active()).toBe(true);

    first.complete();
    expect(counter.active()).toBe(true);

    second.complete();
    expect(counter.active()).toBe(false);
  });

  it('clears on error and on unsubscribe', () => {
    const counter = pendingCounter();

    counter.track(throwError(() => new Error('failed'))).subscribe({ error: () => undefined });
    expect(counter.active()).toBe(false);

    const subscription = counter.track(new Subject<number>()).subscribe();
    expect(counter.active()).toBe(true);
    subscription.unsubscribe();
    expect(counter.active()).toBe(false);
  });

  it('does not count until subscribed', () => {
    const counter = pendingCounter();

    counter.track(new Subject<number>());

    expect(counter.active()).toBe(false);
  });
});
