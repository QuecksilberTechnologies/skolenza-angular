import * as z from 'zod';

/** A payment the refund can be raised against, as the picker lists it or the opener passes it. */
export interface RefundTransactionOption {
  id: number;
  /** The payment's captured amount — the upper bound before earlier refunds are subtracted. Null when
   *  the opener does not know it; the server still enforces the balance. */
  amount: number | null;
  currencyCode: string;
  /** What the picker shows for the option. */
  label: string;
}

const isTransaction = (value: unknown): value is RefundTransactionOption =>
  typeof value === 'object' && value !== null && 'id' in value;

/**
 * The cap comes from the selected transaction, so it moves with the picker. The server still checks
 * the remaining refundable balance — earlier refunds are not visible here.
 */
export const refundRequestSchema = z
  .object({
    // The autocomplete writes the typed text into the field until an option is picked.
    transaction: z
      .custom<RefundTransactionOption | null>()
      .refine(isTransaction, 'Select a transaction from the list'),
    amount: z
      .number()
      .min(0.01, 'Amount must be at least 0.01')
      // The DTO caps at 9999999999999999, which a JS number cannot hold exactly; below 1e16 can.
      .lt(1e16, 'Amount is too large')
      .nullable()
      .refine((value) => value !== null, 'Amount is required'),
    reason: z
      .string()
      .trim()
      .min(1, 'Reason is required')
      .max(500, 'Reason must be 500 characters or fewer'),
  })
  .superRefine((value, ctx) => {
    const { transaction, amount } = value;
    if (
      isTransaction(transaction) &&
      transaction.amount !== null &&
      amount !== null &&
      amount > transaction.amount
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `Amount cannot exceed ${transaction.amount}`,
        path: ['amount'],
      });
    }
  });

/** `z.input`, not `z.infer` — the `.refine` narrows null out of the output type. */
export type RefundRequestModel = z.input<typeof refundRequestSchema>;
