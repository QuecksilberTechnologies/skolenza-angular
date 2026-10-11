/** One row of `public/data/currencies.json` — the currency lookup behind the plan form. */
export interface Currency {
  /** ISO 4217 code, e.g. `INR`. */
  code: string;
  name: string;
  symbol: string;
}

/**
 * One row of `GET /api/Enum/get-all-currencies` — the id-keyed lookup the institution DTOs reference
 * through `defaultCurrency`. Distinct from {@link Currency}, which is the code-keyed static list
 * behind subscription-plan pricing.
 */
export interface CurrencyOption extends Currency {
  id: number;
  isActive: boolean;
}
