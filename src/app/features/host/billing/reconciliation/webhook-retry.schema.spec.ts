import { webhookRetrySchema } from './webhook-retry.schema';

const messages = (eventId: number | null) =>
  webhookRetrySchema.safeParse({ eventId }).error?.issues.map((issue) => issue.message) ?? [];

describe('webhookRetrySchema', () => {
  it('accepts a positive whole id', () => {
    expect(messages(42)).toEqual([]);
  });

  it('requires an id', () => {
    expect(messages(null)).toEqual(['Event ID is required']);
  });

  it('rejects zero and fractions', () => {
    expect(messages(0)).toEqual(['Event ID must be at least 1']);
    expect(messages(1.5)).toEqual(['Event ID must be a whole number']);
  });
});
