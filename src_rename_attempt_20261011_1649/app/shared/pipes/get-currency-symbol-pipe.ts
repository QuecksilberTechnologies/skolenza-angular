import { Pipe, PipeTransform } from '@angular/core';
import { OpenngIcons } from '@openng/optimus-ui/api';

import { normalizeCurrencyCode } from '@shared/utilities/currency';

@Pipe({
  name: 'getCurrencySymbol',
})
export class GetCurrencySymbolPipe implements PipeTransform {
  /** Returns an empty string for unrecognised keys — callers render the raw key instead,
   *  rather than mislabelling a foreign currency as rupees. */
  transform(currencyKey: string): string {
    const currencyIconMap: Record<string, string> = {
      INR: OpenngIcons.INDIAN_RUPEE,
      USD: OpenngIcons.DOLLAR,
      EUR: OpenngIcons.EURO,
      GBP: OpenngIcons.POUND,
    };
    const code = normalizeCurrencyCode(currencyKey);
    return code ? (currencyIconMap[code] ?? '') : '';
  }
}
