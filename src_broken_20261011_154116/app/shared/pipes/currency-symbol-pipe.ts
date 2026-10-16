import { inject, Pipe, PipeTransform } from '@angular/core';

import { CurrencyStore } from '@core/stores';
import { normalizeCurrencyCode } from '@shared/utilities/currency';

@Pipe({
  name: 'currencySymbol',
  pure: false,
})
export class CurrencySymbolPipe implements PipeTransform {
  readonly #currencyStore = inject(CurrencyStore);

  /** Feeds Angular's `currency` pipe with a symbol, not a code — its `CURRENCIES_EN` table has no
   *  entry for AED/QAR/SAR and no wide symbol for many others, so `display: 'symbol'` would print
   *  the bare ISO code. Impure because the symbol map arrives asynchronously. */
  transform(currencyKey: string | null | undefined): string {
    const code = normalizeCurrencyCode(currencyKey);
    if (!code) return currencyKey ?? '';
    return this.#currencyStore.symbols()[code] ?? code;
  }
}
