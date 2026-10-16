import { IInstitution, InstitutionSubscriptionPlan } from '@shared/interfaces';

import { resolveStatus } from '../subscriptions.model';
import { toPlanCompanies } from './subscription-plan-detail.model';

const NOW = Date.parse('2026-08-16T00:00:00Z');
const PLAN_ID = 2;
const FUTURE = '2027-01-01T00:00:00Z';
const PAST = '2026-01-01T00:00:00Z';

function createRow(overrides: Partial<InstitutionSubscriptionPlan> = {}): InstitutionSubscriptionPlan {
  return {
    id: 1,
    institutionId: 54,
    subscriptionPlanId: 2,
    subscriptionStartDate: '2026-03-19T00:00:00Z',
    subscriptionEndDate: FUTURE,
    isActive: true,
    paymentTxnId: null,
    paymentMode: null,
    isTrial: false,
    ...overrides,
  };
}

function createInstitution(overrides: Partial<IInstitution> = {}): IInstitution {
  return {
    // `/Institution` reports an opaque token; `/Subscription` still reports the number the join matches.
    id: '54',
    companyName: 'TechNova Solutions',
    institutionCode: 'TEC',
    companyEmailDomain: 'technova.io',
    institutionEmail: 'admin@technova.io',
    contactPersonName: 'Sujeet Kumar',
    contactNumber: '98765 43210',
    countryId: 1,
    isVerified: true,
    isActive: true,
    ...overrides,
  };
}

describe('resolveStatus', () => {
  it('returns Active for a live subscription with a future end date', () => {
    expect(resolveStatus(createRow(), NOW)).toBe('Active');
  });

  it('returns Active when the subscription has no end date', () => {
    expect(resolveStatus(createRow({ subscriptionEndDate: null }), NOW)).toBe('Active');
  });

  it('returns Trial for a live trial', () => {
    expect(resolveStatus(createRow({ isTrial: true }), NOW)).toBe('Trial');
  });

  it('returns Expired for a lapsed trial — expiry outranks the trial flag', () => {
    expect(resolveStatus(createRow({ isTrial: true, subscriptionEndDate: PAST }), NOW)).toBe(
      'Expired',
    );
  });

  it('returns Expired when the end date has passed', () => {
    expect(resolveStatus(createRow({ subscriptionEndDate: PAST }), NOW)).toBe('Expired');
  });

  it('returns Expired when the row is inactive despite a future end date', () => {
    expect(resolveStatus(createRow({ isActive: false }), NOW)).toBe('Expired');
  });

  it('falls back to the isActive flag when the end date is unparseable', () => {
    expect(resolveStatus(createRow({ subscriptionEndDate: 'not-a-date' }), NOW)).toBe('Active');
  });
});

describe('toPlanCompanies', () => {
  it('joins subscription rows to institutions by institutionId', () => {
    const companies = toPlanCompanies([createRow()], [createInstitution()], PLAN_ID, NOW);

    expect(companies).toEqual([
      {
        id: 1,
        institutionId: 54,
        companyName: 'TechNova Solutions',
        status: 'Active',
        renewsOn: FUTURE,
      },
    ]);
  });

  it('labels a row whose institution is missing from the institution list', () => {
    const companies = toPlanCompanies(
      [createRow({ institutionId: 999 })],
      [createInstitution()],
      PLAN_ID,
      NOW,
    );

    expect(companies[0].companyName).toBe('Unknown company');
  });

  it('labels a row with a null institutionId', () => {
    const companies = toPlanCompanies(
      [createRow({ institutionId: null })],
      [createInstitution()],
      PLAN_ID,
      NOW,
    );

    expect(companies[0].companyName).toBe('Unknown company');
  });

  it('keeps both rows when one institution holds two subscriptions', () => {
    const companies = toPlanCompanies(
      [createRow({ id: 1 }), createRow({ id: 2, subscriptionEndDate: PAST })],
      [createInstitution()],
      PLAN_ID,
      NOW,
    );

    expect(companies.map((company) => company.id)).toEqual([1, 2]);
    expect(companies.map((company) => company.status)).toEqual(['Active', 'Expired']);
  });

  it('drops rows belonging to another plan even if the server sent them', () => {
    const companies = toPlanCompanies(
      [createRow({ id: 1 }), createRow({ id: 2, subscriptionPlanId: 99 })],
      [createInstitution()],
      PLAN_ID,
      NOW,
    );

    expect(companies.map((company) => company.id)).toEqual([1]);
  });

  it('returns an empty list for empty input', () => {
    expect(toPlanCompanies([], [], PLAN_ID, NOW)).toEqual([]);
  });
});
