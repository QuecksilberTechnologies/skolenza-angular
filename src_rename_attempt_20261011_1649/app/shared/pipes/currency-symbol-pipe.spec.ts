import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Currency } from '@shared/interfaces';

import { CurrencySymbolPipe } from './currency-symbol-pipe';

describe('CurrencySymbolPipe', () => {
  const currencies: Currency[] = [
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
  ];

  /** The lookup arrives over HTTP, so the pipe only sees symbols once the resource has settled. */
  const createPipe = async (lookup: Currency[] = currencies) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const pipe = TestBed.runInInjectionContext(() => new CurrencySymbolPipe());

    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/currencies.json').flush(lookup);
    TestBed.tick();

    return pipe;
  };

  it('resolves a symbol Angular locale data does not carry', async () => {
    const pipe = await createPipe();

    expect(pipe.transform('AED')).toBe('د.إ');
  });

  it('normalises a bare symbol key before looking it up', async () => {
    const pipe = await createPipe();

    expect(pipe.transform('$')).toBe('$');
  });

  it('falls back to the ISO code when the lookup has no entry', async () => {
    const pipe = await createPipe([]);

    expect(pipe.transform('aed')).toBe('AED');
  });

  it('passes an unrecognised key through untouched', async () => {
    const pipe = await createPipe();

    expect(pipe.transform('rupees')).toBe('rupees');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
});
