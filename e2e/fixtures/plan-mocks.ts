import type { Page, Route } from '@playwright/test';

/**
 * Network mocks for the /auth/plan (pricing) page. Shapes mirror
 * SubscriptionPlan / GetAllSubscriptionPlanRes and pricing-card.spec.ts.
 * Routes match by glob so the real API host is irrelevant.
 */

export interface PlanModule {
  moduleId: number;
  parentModuleId: number | null;
  moduleName: string;
}

export interface Plan {
  id: number;
  planName: string;
  maxUsers: number;
  perDayPrice: number;
  isFree: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  isMostPopular: boolean;
  isCustom: boolean;
  currencyKey: string;
  modules: PlanModule[];
}

export function buildPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 1,
    planName: 'Basic',
    maxUsers: 10,
    perDayPrice: 5,
    isFree: false,
    monthlyPrice: 100,
    yearlyPrice: 900,
    isActive: true,
    isMostPopular: false,
    isCustom: false,
    currencyKey: 'INR',
    modules: [{ moduleId: 1, parentModuleId: null, moduleName: 'Attendance' }],
    ...overrides,
  };
}

export function buildPlansResponse(plans: Plan[]) {
  return {
    isSucceeded: true,
    message: 'ok',
    errors: [],
    data: plans,
    pageNumber: 1,
    pageSize: plans.length,
    totalRecords: plans.length,
    totalPages: 1,
  };
}

/** Default fixture: Basic (1), Pro (2, most popular), Enterprise (3, custom). */
export function defaultPlans(): Plan[] {
  return [
    buildPlan({ id: 1, planName: 'Basic', monthlyPrice: 100, yearlyPrice: 900 }),
    buildPlan({
      id: 2,
      planName: 'Pro',
      isMostPopular: true,
      monthlyPrice: 200,
      yearlyPrice: 1800,
    }),
    buildPlan({
      id: 3,
      planName: 'Enterprise',
      isCustom: true,
      monthlyPrice: 500,
      yearlyPrice: 4500,
    }),
  ];
}

interface MockOptions {
  /** Queue of responses; each POST shifts the next entry, the last repeats. */
  responses?: unknown[];
  /** Delay (ms) before each plan response resolves. */
  delayMs?: number;
  /** When set, the plan endpoint fails with this HTTP status (error path). */
  status?: number;
  /** Envelope message returned with the failing status; surfaced in-page by BaseService. */
  errorMessage?: string;
}

/**
 * Installs route handlers for the plan page. Call before goto().
 * The catch-all fallback (registered first) stops any other backend call —
 * e.g. register-institution XHRs after a plan-select redirect — from hitting the real API.
 */
export async function mockPlans(page: Page, options: MockOptions = {}): Promise<void> {
  const {
    responses = [buildPlansResponse(defaultPlans())],
    delayMs = 0,
    status,
    errorMessage = 'error',
  } = options;
  const queue = [...responses];

  await page.route('**/skolenza-api.onrender.com/**', (route: Route) =>
    route.fulfill({ json: { isSucceeded: true, message: '', errors: [], data: [] } }),
  );

  await page.route('**/Subscription/get-all-subscription-plan*', async (route: Route) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    if (status) {
      await route.fulfill({
        status,
        json: { isSucceeded: false, message: errorMessage, errors: [] },
      });
      return;
    }
    const body = queue.length > 1 ? queue.shift() : queue[0];
    await route.fulfill({ json: body });
  });
}
