import { expect, type Page, test } from '@playwright/test';

import { buildPlansResponse, defaultPlans, mockPlans } from './fixtures/plan-mocks';

const periodButton = (page: Page, name: 'Monthly' | 'Yearly') =>
  page.getByRole('group', { name: 'Billing period' }).getByRole('button', { name });

test.describe('Plan / pricing page', () => {
  test.beforeEach(async ({ page }) => {
    await mockPlans(page);
    await page.goto('/auth/plan');
  });

  test('renders the page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Powerful Features' })).toBeVisible();
    await expect(page.getByText('Find the perfect plan for your needs')).toBeVisible();
  });

  test('lists the available plans', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Basic' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise' })).toBeVisible();
  });

  test('defaults to yearly billing', async ({ page }) => {
    await expect(periodButton(page, 'Yearly')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('billed annually').first()).toBeVisible();
  });

  test('switches to monthly billing when toggled', async ({ page }) => {
    await periodButton(page, 'Monthly').click();
    await expect(periodButton(page, 'Monthly')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('billed monthly').first()).toBeVisible();
  });

  test('marks the most popular plan with a badge', async ({ page }) => {
    await expect(page.getByText('MOST POPULAR')).toBeVisible();
  });

  test('shows a Talk to sales CTA for the custom plan', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Talk to sales about the Enterprise plan/ }),
    ).toBeVisible();
  });

  test('navigates to register-institution when a standard plan is selected', async ({ page }) => {
    await page.getByRole('button', { name: /Get started with Basic/ }).click();
    await expect(page).toHaveURL(/\/auth\/register-institution\?planId=1/);
  });

  // The custom plan opens a sales mailto (href covered by salesEnquiryMailto's unit spec);
  // here we only pin that it never takes the self-serve route.
  test('keeps the custom plan off the self-serve route when selected', async ({ page }) => {
    await page.getByRole('button', { name: /Talk to sales about the Enterprise plan/ }).click();
    await expect(page).toHaveURL(/\/auth\/plan$/);
  });

  test('shows the empty state when no plans are returned', async ({ page }) => {
    await mockPlans(page, { responses: [buildPlansResponse([])] });
    await page.goto('/auth/plan');
    await expect(page.getByRole('heading', { name: 'No plans available yet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('refetches plans when Retry is clicked', async ({ page }) => {
    await mockPlans(page, {
      responses: [buildPlansResponse([]), buildPlansResponse(defaultPlans())],
    });
    await page.goto('/auth/plan');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('heading', { name: 'Basic' })).toBeVisible();
  });

  test('shows the failure state with the reason when the plan request fails', async ({ page }) => {
    await mockPlans(page, { status: 500, errorMessage: 'Plan catalog is offline' });
    await page.goto('/auth/plan');
    await expect(page.getByRole('heading', { name: "Couldn't load plans" })).toBeVisible();
    await expect(page.getByText('Plan catalog is offline').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Contact support at/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
  });

  test('hides the backend wording when the plan request is rejected as unauthorized', async ({
    page,
  }) => {
    await mockPlans(page, { status: 401, errorMessage: 'A valid Host user token is required.' });
    await page.goto('/auth/plan');
    const card = page.getByRole('alert');
    await expect(card.getByText(/our team has been notified/)).toBeVisible();
    await expect(card.getByText('A valid Host user token is required.')).toHaveCount(0);
  });
});
