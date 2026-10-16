import {
  RefundRequestModel,
  refundRequestSchema,
  RefundTransactionOption,
} from './refund-request-dialog.schema';

const transaction = (amount: number | null = 999): RefundTransactionOption => ({
  id: 1,
  amount,
  currencyCode: 'INR',
  label: '#1',
});

const validModel = (overrides: Partial<RefundRequestModel> = {}): RefundRequestModel => ({
  transaction: transaction(),
  amount: 250,
  reason: 'Approved partial service refund',
  ...overrides,
});

const messages = (model: unknown) => {
  const result = refundRequestSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('refundRequestSchema', () => {
  it('accepts a complete request', () => {
    expect(messages(validModel())).toEqual([]);
  });

  it('requires the transaction, amount and reason', () => {
    expect(messages(validModel({ transaction: null }))).toEqual([
      'Select a transaction from the list',
    ]);
    expect(messages(validModel({ amount: null }))).toEqual(['Amount is required']);
    expect(messages(validModel({ reason: '   ' }))).toEqual(['Reason is required']);
  });

  it('rejects text typed into the picker without choosing an option', () => {
    expect(messages({ ...validModel(), transaction: 'acme' })).toEqual([
      'Select a transaction from the list',
    ]);
  });

  it('rejects a sub-cent amount', () => {
    expect(messages(validModel({ amount: 0 }))).toEqual(['Amount must be at least 0.01']);
  });

  it('caps the amount at the selected payment total when it is known', () => {
    expect(messages(validModel({ amount: 1000 }))).toEqual(['Amount cannot exceed 999']);
    expect(messages(validModel({ amount: 999 }))).toEqual([]);
    expect(messages(validModel({ transaction: transaction(null), amount: 1000 }))).toEqual([]);
  });

  it('caps the reason at 500 characters', () => {
    expect(messages(validModel({ reason: 'x'.repeat(501) }))).toEqual([
      'Reason must be 500 characters or fewer',
    ]);
  });
});
