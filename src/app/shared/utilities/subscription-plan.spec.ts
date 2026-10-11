import { IModule, SubscriptionPlan } from '@shared/interfaces';

import {
  maxYearlySavingPercent,
  normalizePlanModules,
  orderPlans,
  salesEnquiryMailto,
  toDisplayPlan,
  toPlanFeatures,
  yearlySavingPercent,
} from './subscription-plan';

function module(partial: Partial<IModule> & Pick<IModule, 'id' | 'moduleName'>): IModule {
  return {
    displayName: '',
    parentModuleId: 0,
    childModules: [],
    operations: [],
    ...partial,
  };
}

function plan(partial: Partial<SubscriptionPlan> & Pick<SubscriptionPlan, 'id'>): SubscriptionPlan {
  return {
    planName: 'Plan',
    maxUsers: 10,
    perDayPrice: 0,
    isFree: false,
    monthlyPrice: 0,
    yearlyPrice: 0,
    isMostPopular: false,
    isCustom: false,
    currencyKey: 'INR',
    modules: [],
    ...partial,
  };
}

describe('normalizePlanModules', () => {
  it('returns an empty list for a plan with no modules', () => {
    expect(normalizePlanModules([])).toEqual([]);
    expect(normalizePlanModules(null)).toEqual([]);
    expect(normalizePlanModules(undefined)).toEqual([]);
  });

  it('collapses a nested tree into one top-level group with a descendant count', () => {
    // Plan 2's shape: a true root carrying `childModules` two levels deep.
    const groups = normalizePlanModules([
      module({
        id: 1,
        moduleName: 'HR-Management',
        displayName: 'HR management',
        parentModuleId: 0,
        childModules: [
          module({
            id: 39,
            moduleName: 'Attendande-Management',
            displayName: 'Attendance management',
            parentModuleId: 1,
            childModules: [
              module({
                id: 40,
                moduleName: 'Attendande',
                displayName: 'Mark Attendance',
                parentModuleId: 39,
              }),
            ],
          }),
        ],
      }),
    ]);

    expect(groups).toEqual([
      { key: 'hr management', ids: [1], label: 'HR management', descendantCount: 2 },
    ]);
  });

  it('nests an orphan leaf under its parent when the parent is present', () => {
    // Plan 17's shape: bare leaves with `parentModuleId: 2` arriving alongside the branch.
    const groups = normalizePlanModules([
      module({
        id: 2,
        moduleName: 'StaffMember-Management',
        displayName: 'StaffMember management',
        parentModuleId: 1,
      }),
      module({ id: 3, moduleName: 'StaffMember', displayName: 'StaffMember onboard', parentModuleId: 2 }),
      module({
        id: 4,
        moduleName: 'StaffMember-Type',
        displayName: 'StaffMember type',
        parentModuleId: 2,
      }),
    ]);

    expect(groups).toEqual([
      { key: 'staffmember management', ids: [2], label: 'StaffMember management', descendantCount: 2 },
    ]);
  });

  it('promotes a branch whose parent is absent to top level', () => {
    // Plan 18's shape: `parentModuleId: 1`, but module 1 is not on the plan.
    const groups = normalizePlanModules([
      module({
        id: 39,
        moduleName: 'Attendande-Management',
        displayName: 'Attendance management',
        parentModuleId: 1,
      }),
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Attendance management']);
  });

  it('merges two top-level groups that share a display name', () => {
    const groups = normalizePlanModules([
      module({ id: 6, moduleName: 'Profile', displayName: 'Profile', parentModuleId: 5 }),
      module({ id: 8, moduleName: 'My-Profile', displayName: 'Profile', parentModuleId: 5 }),
    ]);

    expect(groups).toEqual([{ key: 'profile', ids: [6, 8], label: 'Profile', descendantCount: 0 }]);
  });

  it('counts a repeated descendant label once', () => {
    // "Mark Attendance" is the display name of both module 40 and module 42.
    const groups = normalizePlanModules([
      module({
        id: 39,
        moduleName: 'Attendande-Management',
        displayName: 'Attendance management',
        parentModuleId: 1,
        childModules: [
          module({
            id: 40,
            moduleName: 'Attendande',
            displayName: 'Mark Attendance',
            parentModuleId: 39,
          }),
          module({
            id: 42,
            moduleName: 'Mob-Mark',
            displayName: 'Mark Attendance',
            parentModuleId: 39,
          }),
        ],
      }),
    ]);

    expect(groups[0].descendantCount).toBe(1);
  });

  it('humanizes the module slug when the display name is blank', () => {
    const groups = normalizePlanModules([
      module({ id: 27, moduleName: 'Asset-Management', displayName: '   ' }),
    ]);

    expect(groups[0].label).toBe('Asset management');
  });

  it('sorts groups alphabetically regardless of API order', () => {
    const groups = normalizePlanModules([
      module({ id: 27, moduleName: 'Asset-Management', displayName: 'Zebra' }),
      module({ id: 5, moduleName: 'Common', displayName: 'apple' }),
    ]);

    expect(groups.map((group) => group.label)).toEqual(['apple', 'Zebra']);
  });

  it('terminates on a cyclic parent chain', () => {
    const groups = normalizePlanModules([
      module({ id: 1, moduleName: 'A', displayName: 'A', parentModuleId: 0 }),
      module({ id: 2, moduleName: 'B', displayName: 'B', parentModuleId: 1 }),
      module({ id: 3, moduleName: 'C', displayName: 'C', parentModuleId: 2 }),
    ]);

    expect(groups).toEqual([{ key: 'a', ids: [1], label: 'A', descendantCount: 2 }]);
  });

  it('ignores a module that claims itself as its parent', () => {
    const groups = normalizePlanModules([
      module({ id: 1, moduleName: 'Self', displayName: 'Self', parentModuleId: 1 }),
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Self']);
  });
});

describe('toPlanFeatures', () => {
  it('leads with seats and support, and never lists the day rate', () => {
    const features = toPlanFeatures(plan({ id: 1, maxUsers: 21, perDayPrice: 12 }));

    expect(features.slice(0, 2)).toEqual([
      { key: 'seats', label: 'Up to 21 users' },
      { key: 'support', label: 'Premium support' },
    ]);
    expect(features.some((feature) => feature.label.includes('12'))).toBe(false);
  });

  it('pluralises the seat count and omits the bullet when there are no seats', () => {
    expect(toPlanFeatures(plan({ id: 1, maxUsers: 1 }))[0].label).toBe('Up to 1 user');
    // "Up to 0 users" reads as a broken plan; say nothing instead.
    expect(toPlanFeatures(plan({ id: 1, maxUsers: 0 })).map((f) => f.key)).not.toContain('seats');
  });

  it('labels a free plan as free', () => {
    expect(toPlanFeatures(plan({ id: 1, isFree: true }))[1].label).toBe('Free plan');
  });

  it('uses displayName rather than the kebab moduleName', () => {
    const features = toPlanFeatures(
      plan({
        id: 1,
        modules: [module({ id: 37, moduleName: 'Recuritment', displayName: 'Recruit' })],
      }),
    );

    expect(features.at(-1)).toEqual({ key: 'module-recruit', label: 'Recruit', count: undefined });
  });
});

describe('toDisplayPlan', () => {
  it('keeps the plan name when the plan has no modules', () => {
    // Business Plan ships with `modules: []`; blanking its name was the old bug.
    const display = toDisplayPlan(
      plan({ id: 19, planName: 'Business Plan', modules: [] }),
      'yearly',
    );

    expect(display.planName).toBe('Business Plan');
  });

  it('resolves the price and label for the selected period', () => {
    const source = plan({ id: 17, monthlyPrice: 399, yearlyPrice: 3999 });

    expect(toDisplayPlan(source, 'monthly')).toMatchObject({ price: 399, period: '/ month' });
    expect(toDisplayPlan(source, 'yearly')).toMatchObject({ price: 3999, period: '/ year' });
  });

  it('emits no legacy name or currency fields', () => {
    const display = toDisplayPlan(plan({ id: 1 }), 'yearly');

    expect(Object.keys(display)).not.toContain('name');
    expect(Object.keys(display)).not.toContain('currency');
  });
});

describe('orderPlans', () => {
  const plans = [
    plan({
      id: 20,
      planName: 'Enterprise',
      monthlyPrice: 2499,
      yearlyPrice: 24999,
      isCustom: true,
    }),
    plan({ id: 2, planName: 'Pro-Adv', monthlyPrice: 300, yearlyPrice: 30000 }),
    plan({ id: 18, planName: 'Growth', monthlyPrice: 699, yearlyPrice: 6999 }),
    plan({ id: 99, planName: 'Free', monthlyPrice: 0, yearlyPrice: 0, isFree: true }),
  ];

  it('puts free first, custom last, and the rest ascending', () => {
    expect(orderPlans(plans).map((p) => p.planName)).toEqual([
      'Free',
      'Pro-Adv',
      'Growth',
      'Enterprise',
    ]);
  });

  it('orders identically for both periods', () => {
    const monthly = orderPlans(plans.map((p) => toDisplayPlan(p, 'monthly'))).map((p) => p.id);
    const yearly = orderPlans(plans.map((p) => toDisplayPlan(p, 'yearly'))).map((p) => p.id);

    expect(yearly).toEqual(monthly);
  });
});

describe('yearlySavingPercent', () => {
  it('returns null when paying yearly costs more', () => {
    // Pro-Adv: 300 x 12 = 3,600 against a 30,000 yearly price.
    expect(yearlySavingPercent(plan({ id: 2, monthlyPrice: 300, yearlyPrice: 30000 }))).toBeNull();
  });

  it('returns the rounded saving when yearly is cheaper', () => {
    // Starter: 399 x 12 = 4,788 against a 3,999 yearly price.
    expect(yearlySavingPercent(plan({ id: 17, monthlyPrice: 399, yearlyPrice: 3999 }))).toBe(16);
  });

  it('returns null when either price is missing', () => {
    expect(yearlySavingPercent(plan({ id: 1, monthlyPrice: 0, yearlyPrice: 3999 }))).toBeNull();
    expect(yearlySavingPercent(plan({ id: 1, monthlyPrice: 399, yearlyPrice: 0 }))).toBeNull();
  });
});

describe('maxYearlySavingPercent', () => {
  it('reports the best real saving across the set', () => {
    expect(
      maxYearlySavingPercent([
        plan({ id: 2, monthlyPrice: 300, yearlyPrice: 30000 }),
        plan({ id: 17, monthlyPrice: 399, yearlyPrice: 3999 }),
        plan({ id: 18, monthlyPrice: 699, yearlyPrice: 6999 }),
      ]),
    ).toBe(17);
  });

  it('returns null when no plan is cheaper yearly', () => {
    expect(
      maxYearlySavingPercent([plan({ id: 2, monthlyPrice: 300, yearlyPrice: 30000 })]),
    ).toBeNull();
    expect(maxYearlySavingPercent([])).toBeNull();
  });
});

describe('salesEnquiryMailto', () => {
  it('pre-fills a subject naming the plan', () => {
    expect(salesEnquiryMailto('Enterprise Plan')).toBe(
      'mailto:support@skolenza.in?subject=Enquiry%20about%20the%20Enterprise%20Plan%20plan',
    );
  });
});
