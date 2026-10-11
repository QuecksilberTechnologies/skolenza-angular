import type { Page, Route } from '@playwright/test';

/**
 * Network mocks for the host Subscriptions grid and its Module Map dialog. Shapes mirror
 * GetHostSubscriptionPlansRes, GetAllSubscriptionPlanRes and the
 * `GET /PlanModuleMapping/options/{id}` payload the API really returns. Routes match by glob so
 * the real API host is irrelevant.
 */

interface PlanModuleOptionFixture {
  moduleId: number;
  moduleName: string;
  displayName: string;
  isMapped: boolean;
  isActive: boolean;
  children: PlanModuleOptionFixture[];
}

const optionNode = (
  moduleId: number,
  moduleName: string,
  displayName: string,
  overrides: Partial<PlanModuleOptionFixture> = {},
): PlanModuleOptionFixture => ({
  moduleId,
  moduleName,
  displayName,
  isMapped: false,
  isActive: true,
  children: [],
  ...overrides,
});

/** Three levels deep, with a mapped parent whose children are unmapped — the real plan-2 shape. */
export function moduleOptions(): PlanModuleOptionFixture[] {
  return [
    optionNode(27, 'Asset-Management', 'Asset management', {
      isMapped: true,
      children: [
        optionNode(28, 'Asset-Create', 'Asset creation'),
        optionNode(30, 'Asset-Type-Master', 'Asset type creation'),
      ],
    }),
    optionNode(5, 'Common', 'Basic menu', {
      children: [
        optionNode(7, 'Notifications', 'Notifications', {
          children: [
            optionNode(12, 'Message', 'Message'),
            optionNode(13, 'Notification', 'Notification'),
          ],
        }),
      ],
    }),
    optionNode(37, 'Recuritment', 'Recruit', {
      isMapped: true,
      children: [optionNode(38, 'Interview', 'INREC', { isActive: false })],
    }),
  ];
}

export function subscriptionPlans() {
  return [
    {
      id: 2,
      planName: 'Pro Free Plan',
      maxUsers: 5,
      perDayPrice: 0,
      isFree: true,
      monthlyPrice: 0,
      yearlyPrice: 0,
      isMostPopular: false,
      isCustom: false,
      currencyKey: 'INR',
      modules: [],
      // The host list is the only plan endpoint that reports status.
      isActive: true,
    },
  ];
}

export interface SubscriptionCalls {
  /** Bodies posted to `/PlanModuleMapping/save`, in order. */
  saved: unknown[];
  /** Bodies posted to `POST /Subscription/get-all-host-subscription-plans`, in order. An omitted
   *  filter is absent rather than present-and-null. */
  listed: unknown[];
  /** Bodies posted to `/Subscription/delete-subscription-plan`, in order. */
  deleted: unknown[];
}

/**
 * Installs the routes the Subscriptions page and Module Map dialog need. Call before goto().
 * `deleteDelayMs` holds the delete response back so the busy dialog can be observed.
 */
export async function mockSubscriptions(
  page: Page,
  { deleteDelayMs = 0 }: { deleteDelayMs?: number } = {},
): Promise<SubscriptionCalls> {
  const calls: SubscriptionCalls = { saved: [], listed: [], deleted: [] };
  let plans = subscriptionPlans();

  // The trailing `*` is load-bearing: without it the glob stops matching and the grid never loads.
  await page.route('**/Subscription/get-all-host-subscription-plans*', async (route: Route) => {
    calls.listed.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        isSucceeded: true,
        message: 'ok',
        errors: [],
        data: plans,
        pageNumber: 1,
        pageSize: 10,
        totalRecords: plans.length,
        totalPages: 1,
      },
    });
  });

  await page.route('**/Subscription/delete-subscription-plan', async (route: Route) => {
    const body = route.request().postDataJSON() as { id: number };
    calls.deleted.push(body);
    plans = plans.filter((plan) => plan.id !== body.id);
    if (deleteDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, deleteDelayMs));
    }
    await route.fulfill({
      json: { isSucceeded: true, message: 'Plan deleted successfully.', errors: [], data: null },
    });
  });

  // The host dashboard still reads the legacy list on the way in.
  await page.route('**/Subscription/get-all-subscription-plan*', (route: Route) =>
    route.fulfill({
      json: { isSucceeded: true, message: 'ok', errors: [], data: subscriptionPlans() },
    }),
  );

  await page.route('**/PlanModuleMapping/options/**', (route: Route) =>
    route.fulfill({
      json: {
        isSucceeded: true,
        message: 'Subscription plan module options retrieved successfully.',
        errors: [],
        data: { subscriptionPlanId: 2, modules: moduleOptions() },
      },
    }),
  );

  await page.route('**/PlanModuleMapping/save', async (route: Route) => {
    calls.saved.push(route.request().postDataJSON());
    await route.fulfill({
      json: { isSucceeded: true, message: 'Modules mapped successfully.', errors: [], data: null },
    });
  });

  return calls;
}
