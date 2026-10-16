import {
  InstitutionCardInventoryFormModel,
  institutionCardInventorySchema,
} from './institution-card-inventory-form.schema';

const validModel = (
  overrides: Partial<InstitutionCardInventoryFormModel> = {},
): InstitutionCardInventoryFormModel => ({
  institutionId: 'TEN00005',

  cardNumber: '1234567890123456',
  cardReference: '',

  purchaseCurrencyCode: 'INR',
  unitPurchasePriceExcludingTax: 250,
  purchaseInvoiceNumber: '',
  purchaseInvoiceDate: null,

  supplierName: '',
  supplierTaxRegistrationNumber: '',
  supplierCountryId: null,
  supplierStateId: null,
  placeOfSupplyCountryId: null,
  placeOfSupplyStateId: null,

  taxTreatment: '1',
  cgstRate: null,
  cgstAmount: null,
  sgstRate: null,
  sgstAmount: null,
  igstRate: null,
  igstAmount: null,
  foreignTaxLabel: '',
  foreignTaxRate: null,
  foreignTaxAmount: null,

  customsDutyAmount: null,
  freightAmount: null,

  isActive: true,
  ...overrides,
});

const messagesFor = (model: InstitutionCardInventoryFormModel, field: string): string[] => {
  const result = institutionCardInventorySchema.safeParse(model);
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
};

describe('institutionCardInventorySchema', () => {
  it('accepts a model with only the required fields filled', () => {
    expect(institutionCardInventorySchema.safeParse(validModel()).success).toBe(true);
  });

  it.each([
    ['institutionId', { institutionId: null }, 'Institution is required'],
    ['cardNumber', { cardNumber: '   ' }, 'Card number is required'],
    [
      'unitPurchasePriceExcludingTax',
      { unitPurchasePriceExcludingTax: null },
      'Unit price is required',
    ],
    ['taxTreatment', { taxTreatment: '' }, 'Tax treatment is required'],
    ['purchaseCurrencyCode', { purchaseCurrencyCode: '   ' }, 'Currency is required'],
  ])('requires %s', (field, overrides, message) => {
    expect(
      messagesFor(validModel(overrides as Partial<InstitutionCardInventoryFormModel>), field),
    ).toContain(message);
  });

  it('requires cardNumber to be up to 19 digits', () => {
    expect(messagesFor(validModel({ cardNumber: 'RFID-000123' }), 'cardNumber')).toContain(
      'Card number must contain up to 19 digits',
    );
    expect(messagesFor(validModel({ cardNumber: '1'.repeat(20) }), 'cardNumber')).toContain(
      'Card number must contain up to 19 digits',
    );
  });

  it('keeps monetary fields non-negative while allowing blanks', () => {
    expect(messagesFor(validModel({ cgstRate: null }), 'cgstRate')).toEqual([]);
    expect(messagesFor(validModel({ cgstRate: 0 }), 'cgstRate')).toEqual([]);
    expect(messagesFor(validModel({ cgstRate: -1 }), 'cgstRate')).toHaveLength(1);
    expect(
      messagesFor(
        validModel({ unitPurchasePriceExcludingTax: -5 }),
        'unitPurchasePriceExcludingTax',
      ),
    ).toHaveLength(1);
  });

  it('caps free-text lengths', () => {
    expect(messagesFor(validModel({ cardReference: 'x'.repeat(101) }), 'cardReference')).toEqual([
      'Card reference must be at most 100 characters',
    ]);
  });
});
