import { expect, test, type Page } from '@playwright/test';

import { hostSuccessResponse, mockAuth } from './fixtures/auth-mocks';
import { mockSubscriptions, type SubscriptionCalls } from './fixtures/subscription-mocks';

const EMAIL = '#txtEmail';
const PASSWORD = '#txtPassword';

/** Host login runs through the real form; Subscriptions is host-only. */
async function loginAsHost(page: Page) {
  await page.goto('/auth/login');
  await page.locator(EMAIL).fill('sujeet@skolenza.in');
  await page.locator(PASSWORD).fill('secret1');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/app\/host-dashboard/);
}

async function setup(
  page: Page,
  options: { deleteDelayMs?: number } = {},
): Promise<SubscriptionCalls> {
  await mockAuth(page, { loginResponse: hostSuccessResponse() });
  const calls = await mockSubscriptions(page, options);
  await loginAsHost(page);
  return calls;
}

/** Opens the Module Map dialog for the fixture plan. */
async function openModuleMap(page: Page) {
  await page.goto('/app/subscriptions');
  // The label leads with the mapped count, so the name is matched on its stable tail.
  const openMap = page.getByRole('button', { name: /modules for Pro Free Plan/ });
  await expect(openMap).toBeVisible();
  await openMap.click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

const dialog = (page: Page) => page.getByRole('dialog');
const treeItem = (page: Page, name: string) =>
  dialog(page).getByRole('treeitem', { name, exact: true });

/** A treeitem nests its descendants' checkboxes, so the node's own row has to be scoped first. */
const nodeCheckbox = (page: Page, name: string) =>
  treeItem(page, name).locator('.p-tree-node-content').first().getByRole('checkbox');

test.describe('Module Map', () => {
  test('opens from the grid with the plan in the header', async ({ page }) => {
    await setup(page);
    await openModuleMap(page);

    // Matched on the accessible name so the em dash in the header is not part of the assertion.
    await expect(page.getByRole('dialog', { name: /Pro Free Plan/ })).toBeVisible();
  });

  test('renders the whole tree expanded, at every depth', async ({ page }) => {
    await setup(page);
    await openModuleMap(page);

    // Depth 0, 1 and 2 are all visible without expanding anything.
    await expect(treeItem(page, 'Asset management')).toBeVisible();
    await expect(treeItem(page, 'Asset creation')).toBeVisible();
    await expect(treeItem(page, 'Message')).toBeVisible();
    await expect(treeItem(page, 'Notification')).toBeVisible();
  });

  /** A mapped parent whose children are not mapped is indeterminate, never checked. */
  test('pre-selects the mapped modules and keeps Save disabled', async ({ page }) => {
    await setup(page);
    await openModuleMap(page);

    await expect(dialog(page).getByText('2 of 9 selected')).toBeVisible();
    await expect(treeItem(page, 'Asset management')).toHaveAttribute('aria-checked', 'false');
    await expect(dialog(page).getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(dialog(page).getByText('Unsaved changes')).toBeHidden();
  });

  test('cascades a parent tick down to every descendant', async ({ page }) => {
    await setup(page);
    await openModuleMap(page);

    await nodeCheckbox(page, 'Basic menu').click();

    await expect(treeItem(page, 'Notifications')).toHaveAttribute('aria-checked', 'true');
    await expect(treeItem(page, 'Message')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog(page).getByText('Unsaved changes')).toBeVisible();
  });

  test('selects and clears every module from the toolbar', async ({ page }) => {
    await setup(page);
    await openModuleMap(page);

    await dialog(page).getByRole('button', { name: 'Select all' }).click();
    await expect(dialog(page).getByText('9 of 9 selected')).toBeVisible();

    await dialog(page).getByRole('button', { name: 'Clear' }).click();
    await expect(dialog(page).getByText('0 of 9 selected')).toBeVisible();
  });

  test('collapses and re-expands every branch', async ({ page }) => {
    await setup(page);
    await openModuleMap(page);

    await dialog(page).getByRole('button', { name: 'Collapse all' }).click();
    await expect(treeItem(page, 'Asset management')).toBeVisible();
    await expect(treeItem(page, 'Asset creation')).toBeHidden();

    await dialog(page).getByRole('button', { name: 'Expand all' }).click();
    await expect(treeItem(page, 'Asset creation')).toBeVisible();
  });

  test('narrows the tree with the search box', async ({ page }) => {
    await setup(page);
    await openModuleMap(page);

    await dialog(page).getByPlaceholder('Search modules').fill('Message');

    await expect(treeItem(page, 'Message')).toBeVisible();
    await expect(treeItem(page, 'Asset creation')).toBeHidden();
  });

  /** The partial parent (27) must survive the round trip even though the tree drops it. */
  test('posts the checked ids plus the partial ancestors, then closes', async ({ page }) => {
    const calls = await setup(page);
    await openModuleMap(page);

    await nodeCheckbox(page, 'Asset creation').click();
    await dialog(page).getByRole('button', { name: 'Save' }).click();

    await expect(dialog(page)).toBeHidden();
    expect(calls.saved).toEqual([{ subscriptionPlanId: 2, moduleIds: [27, 28, 37], remark: null }]);
  });

  test('leaves the mapping untouched on cancel', async ({ page }) => {
    const calls = await setup(page);
    await openModuleMap(page);

    await nodeCheckbox(page, 'Asset creation').click();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog(page)).toBeHidden();
    expect(calls.saved).toEqual([]);
  });
});

test.describe('Subscriptions grid', () => {
  test('asks the server for the first page of every plan', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/subscriptions');

    await expect(
      page.getByRole('button', { name: /View details for Pro Free Plan/ }),
    ).toBeVisible();
    expect(calls.listed).toEqual([{ search: '', pageNumber: 1, pageSize: 10 }]);
  });

  test('narrows the list on the server when the status filter changes', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/subscriptions');
    await expect(
      page.getByRole('button', { name: /View details for Pro Free Plan/ }),
    ).toBeVisible();

    await page.getByLabel('Filter by status').click();
    await page.getByRole('option', { name: 'Inactive' }).click();

    await expect
      .poll(() => calls.listed.at(-1))
      .toEqual({ search: '', isActive: false, pageNumber: 1, pageSize: 10 });
  });

  test('deletes a plan after confirmation and refetches the page', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/subscriptions');

    await page.getByRole('button', { name: 'Actions for Pro Free Plan' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete Plan' }).click();

    expect(calls.deleted).toEqual([{ id: 2 }]);
    await expect(page.getByText('No subscription plans found')).toBeVisible();
  });

  test('holds the dialog open with a busy button until the delete responds', async ({ page }) => {
    await setup(page, { deleteDelayMs: 800 });
    await page.goto('/app/subscriptions');

    await page.getByRole('button', { name: 'Actions for Pro Free Plan' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // `p-confirmDialog` renders role="alertdialog", and the page holds two of them.
    const dialog = page.getByRole('alertdialog', { name: 'Delete this plan' });
    const deleteButton = dialog.getByRole('button', { name: 'Delete Plan' });
    await deleteButton.click();

    // Still on screen and busy while the call is in flight.
    await expect(deleteButton).toHaveClass(/p-button-loading/);
    await expect(dialog).toBeVisible();

    await expect(dialog).toBeHidden({ timeout: 5000 });
  });

  test('keeps the plan when the confirmation is dismissed', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/subscriptions');

    await page.getByRole('button', { name: 'Actions for Pro Free Plan' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Keep Plan' }).click();

    expect(calls.deleted).toEqual([]);
    await expect(
      page.getByRole('button', { name: /View details for Pro Free Plan/ }),
    ).toBeVisible();
  });
});
