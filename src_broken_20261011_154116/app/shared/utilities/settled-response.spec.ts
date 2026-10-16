import { firstValueFrom, of, throwError } from 'rxjs';

import { responseApplier, settle } from './settled-response';

describe('settle', () => {
  it('passes an answered call through untouched', async () => {
    const envelope = { isSucceeded: true, message: 'ok', data: 42 };

    expect(await firstValueFrom(settle(of(envelope)))).toBe(envelope);
  });

  it('answers with the error rather than failing, so a sibling call still lands', async () => {
    const failure = new Error('network down');

    expect(await firstValueFrom(settle(throwError(() => failure)))).toBe(failure);
  });
});

describe('responseApplier', () => {
  it('applies the data of a succeeded envelope', () => {
    const onError = vi.fn();
    const apply = vi.fn();

    responseApplier(onError)({ isSucceeded: true, message: 'ok', data: [1, 2] }, apply);

    expect(apply).toHaveBeenCalledWith([1, 2]);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a rejected envelope by its message and applies nothing', () => {
    const onError = vi.fn();
    const apply = vi.fn();

    responseApplier(onError)({ isSucceeded: false, message: 'not allowed', data: null }, apply);

    expect(onError).toHaveBeenCalledWith('not allowed');
    expect(apply).not.toHaveBeenCalled();
  });

  it('reports a transport error the same way', () => {
    const onError = vi.fn();
    const apply = vi.fn();

    responseApplier(onError)(new Error('network down'), apply);

    expect(onError).toHaveBeenCalledWith('network down');
    expect(apply).not.toHaveBeenCalled();
  });
});
