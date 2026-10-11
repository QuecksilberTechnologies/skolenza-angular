import {
  billingConfigurationSchema,
  BillingConfigurationModel,
} from './billing-configuration.schema';

const valid: BillingConfigurationModel = {
  sellerLegalName: 'Example Private Limited',
  sellerBillingEmail: 'billing@example.com',
  sellerBillingPhone: '',
  countryCode: 'IN',
  stateCode: 'MP',
  postalCode: '482001',
  addressLine1: 'Example registered address',
  addressLine2: '',
  taxRegistrationNumber: '23ABCDE1234F1Z5',
  invoicePrefix: 'AXP',
  paymentRetryCount: 3,
  gracePeriodDays: 1,
  paymentTimeoutMinutes: 30,
  reconciliationLookbackDays: 7,
  isActive: true,
};

const issuesFor = (over: Partial<BillingConfigurationModel>) =>
  billingConfigurationSchema.safeParse({ ...valid, ...over }).error?.issues ?? [];

describe('billingConfigurationSchema', () => {
  it('accepts a complete India configuration with the optional fields blank', () => {
    expect(billingConfigurationSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a lower-case GSTIN, which the page upper-cases on save', () => {
    expect(issuesFor({ taxRegistrationNumber: '23abcde1234f1z5' })).toEqual([]);
  });

  it.each([
    ['sellerLegalName', ''],
    ['sellerBillingEmail', 'not-an-email'],
    ['sellerBillingPhone', 'abc'],
    ['stateCode', ''],
    ['postalCode', '48200'],
    ['addressLine1', '   '],
    ['taxRegistrationNumber', '23ABCDE1234F1Z'],
    ['invoicePrefix', 'AXP 1'],
  ] as const)('rejects %s = %j', (field, value) => {
    expect(issuesFor({ [field]: value }).map((issue) => issue.path[0])).toEqual([field]);
  });

  it.each([
    ['paymentRetryCount', 0, 11],
    ['gracePeriodDays', -1, 31],
    ['paymentTimeoutMinutes', 4, 1441],
    ['reconciliationLookbackDays', 0, 91],
  ] as const)('bounds %s to the backend range', (field, below, above) => {
    expect(issuesFor({ [field]: below })).toHaveLength(1);
    expect(issuesFor({ [field]: above })).toHaveLength(1);
    expect(issuesFor({ [field]: null })[0]?.message).toMatch(/is required$/);
  });

  it('rejects a country other than India', () => {
    expect(
      issuesFor({ countryCode: 'US' as BillingConfigurationModel['countryCode'] }),
    ).toHaveLength(1);
  });
});
