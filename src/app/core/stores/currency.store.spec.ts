import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Currency } from '@shared/interfaces';

import { CurrencyStore } from './currency.store';

describe('CurrencyStore', () => {
  const currencies: Currency[] = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  ];

  const loadStore = async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const store = TestBed.inject(CurrencyStore);
    const httpMock = TestBed.inject(HttpTestingController);

    TestBed.tick();
    httpMock.expectOne('data/currencies.json').flush(currencies);
    TestBed.tick();

    return store;
  };

  it('reads the lookup file from the data folder', async () => {
    const store = await loadStore();

    expect(store.currencies()).toEqual(currencies);
    expect(store.isLoading()).toBe(false);
  });

  it('builds the dropdown label from the code, name and symbol', async () => {
    const store = await loadStore();

    expect(store.options()).toEqual([
      { label: 'INR - Indian Rupee (₹)', value: 'INR' },
      { label: 'JPY - Japanese Yen (¥)', value: 'JPY' },
    ]);
  });

  it('indexes the symbols by ISO code', async () => {
    const store = await loadStore();

    expect(store.symbols()).toEqual({ INR: '₹', JPY: '¥' });
  });
});
