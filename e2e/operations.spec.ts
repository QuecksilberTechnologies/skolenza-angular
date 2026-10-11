import { expect, test, type Page } from '@playwright/test';

import { hostSuccessResponse, mockAuth } from './fixtures/auth-mocks';
import { mockModules } from './fixtures/module-mocks';
import { mockOperations, type OperationCalls } from './fixtures/operation-mocks';

const EMAIL = '#txtEmail';
const PASSWORD = '#txtPassword';

/** Host login runs through the real form; the module routes are host-only. */
async function loginAsHost(page: Page) {
  await page.goto('/auth/login');
  await page.locator(EMAIL).fill('sujeet@skolenza.in');
  await page.locator(PASSWORD).fill('secret1');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/app\/host-dashboard/);
}

/**
 * Optimus selects put `inputId` on a hidden a11y input, so `getByLabel` inside a dialog is
 * ambiguous. Pick them by order instead — the module-operation form renders Scope, Module,
 * Operation in that order.
 */
function dialogSelect(page: Page, index: number) {
  return page.locator('.p-dialog p-select').nth(index);
}

async function setup(page: Page, options = {}): Promise<OperationCalls> {
  await mockAuth(page, { loginResponse: hostSuccessResponse() });
  // The module-operation form fills its Module dropdown from the two module list endpoints.
  await mockModules(page);
  const calls = await mockOperations(page, options);
  await loginAsHost(page);
  return calls;
}

test.describe('Operations', () => {
  test('lists every operation returned by get-all-operations', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/operations');

    await expect(page.getByRole('cell', { name: 'Add', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Approve', exact: true })).toBeVisible();
    // Inactive rows still load — the endpoint takes no filter params.
    await expect(page.getByRole('cell', { name: 'Retire', exact: true })).toBeVisible();
  });

  test('renders the type and status of each row', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/operations');

    const addRow = page.getByRole('row', { name: /Add/ });
    await expect(addRow.getByText('CRUD')).toBeVisible();
    await expect(addRow.getByText('Active')).toBeVisible();

    const retireRow = page.getByRole('row', { name: /Retire/ });
    await expect(retireRow.getByText('Actions')).toBeVisible();
    await expect(retireRow.getByText('Inactive')).toBeVisible();
  });

  test('filters by type without re-querying the API', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/operations');
    await expect(page.getByRole('cell', { name: 'Add', exact: true })).toBeVisible();
    const callsBefore = calls.operationList;

    await page.getByLabel('Filter by operation type').click();
    await page.getByRole('option', { name: 'Workflow' }).click();

    await expect(page.getByRole('cell', { name: 'Approve', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Add', exact: true })).toBeHidden();
    // `get-all-operations` accepts no params, so filtering must stay client-side.
    expect(calls.operationList).toBe(callsBefore);
  });

  test('filters by status', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/operations');
    await expect(page.getByRole('cell', { name: 'Add', exact: true })).toBeVisible();

    await page.getByLabel('Filter by status').click();
    await page.getByRole('option', { name: 'Inactive' }).click();

    await expect(page.getByRole('cell', { name: 'Retire', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Add', exact: true })).toBeHidden();
  });

  test('filters the grid from the search box', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/operations');
    await expect(page.getByRole('cell', { name: 'Add', exact: true })).toBeVisible();

    await page.getByPlaceholder('Search...').fill('Approve');

    await expect(page.getByRole('cell', { name: 'Approve', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Add', exact: true })).toBeHidden();
  });

  test('blocks the save until name, type and remark are filled', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/operations');

    await page.getByRole('button', { name: 'Add Operation' }).click();

    await expect(page.locator('.p-dialog-title', { hasText: 'Create operation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create operation' })).toBeDisabled();
  });

  test('POSTs the new operation to create-operation', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/operations');

    await page.getByRole('button', { name: 'Add Operation' }).click();
    await page.locator('#operationName').fill('Publish');
    await dialogSelect(page, 0).click();
    await page.getByRole('option', { name: 'Workflow' }).click();
    await page.locator('#remark').fill('Publishes a draft');
    await page.getByRole('button', { name: 'Create operation' }).click();

    await expect(page.getByText('Saved successfully.')).toBeVisible();
    expect(calls.writes.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/OperationsMaster/create-operation',
      body: {
        operationName: 'Publish',
        operationType: 2,
        remark: 'Publishes a draft',
        isActive: true,
      },
    });
  });

  test('prefills the edit dialog from the get-operation response', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/operations');

    await page.getByRole('button', { name: 'Edit Approve' }).click();

    await expect(page.locator('.p-dialog-title', { hasText: 'Edit operation' })).toBeVisible();
    await expect(page.locator('#operationName')).toHaveValue('Approve');
    await expect(page.locator('#remark')).toHaveValue('Approve submitted requests');
  });

  test('POSTs the edited operation with its id to update-operation', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/operations');

    await page.getByRole('button', { name: 'Edit Approve' }).click();
    await expect(page.locator('#operationName')).toHaveValue('Approve');
    await page.locator('#operationName').fill('Authorise');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Saved successfully.')).toBeVisible();
    expect(calls.writes.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/OperationsMaster/update-operation',
      body: { id: 2, operationName: 'Authorise' },
    });
  });

  test('DELETEs the operation after confirming', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/operations');

    await page.getByRole('button', { name: 'Delete Approve' }).click();
    await expect(page.locator('.p-dialog-title', { hasText: 'Delete Operation' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Deleted successfully.')).toBeVisible();
    expect(calls.deletes).toEqual(['/api/OperationsMaster/delete-operation/2']);
    await expect(page.getByRole('cell', { name: 'Approve', exact: true })).toBeHidden();
  });

  test('keeps the row when the delete is refused', async ({ page }) => {
    await setup(page, { deleteSucceeds: false });
    await page.goto('/app/modules/operations');

    await page.getByRole('button', { name: 'Delete Approve' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Could not delete.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Approve', exact: true })).toBeVisible();
  });

  test('navigates to module operations from the cog dropdown', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/operations');

    await page.locator('.p-splitbutton-dropdown').click();
    await page.getByRole('menuitem', { name: 'Module Operations' }).click();

    await expect(page).toHaveURL(/\/app\/modules\/module-operations/);
  });
});

test.describe('Module operations', () => {
  test('lists the mappings with their module and operation', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/module-operations');

    const assetRow = page.getByRole('row', { name: /Asset management/ });
    await expect(assetRow.getByRole('cell', { name: 'Add', exact: true })).toBeVisible();
    await expect(assetRow.getByRole('cell', { name: '/app/assets' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Profile', exact: true })).toBeVisible();
  });

  test('filters by module', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/module-operations');
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();

    await page.getByLabel('Filter by module').click();
    await page.getByRole('option', { name: 'Profile' }).click();

    await expect(page.getByRole('cell', { name: 'Profile', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeHidden();
  });

  test('builds the filter dropdowns from the loaded rows', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/module-operations');
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();

    await page.getByLabel('Filter by operation').click();

    // Only the operations actually mapped — not the whole OperationsMaster catalog.
    await expect(page.getByRole('option', { name: 'Add', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Approve', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Retire', exact: true })).toBeHidden();
  });

  test('requires a module and an operation on the create dialog', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/module-operations');

    await page.getByRole('button', { name: 'Add Module Operation' }).click();

    await expect(
      page.locator('.p-dialog-title', { hasText: 'Create module operation' }),
    ).toBeVisible();
    // Scope, Module, Operation.
    await expect(page.locator('.p-dialog p-select')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Create mapping' })).toBeDisabled();
  });

  test('POSTs the new mapping to create', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/module-operations');

    await page.getByRole('button', { name: 'Add Module Operation' }).click();
    await dialogSelect(page, 1).click();
    await page.getByRole('option', { name: 'Asset management' }).click();
    await dialogSelect(page, 2).click();
    await page.getByRole('option', { name: 'Approve' }).click();
    await page.locator('#pageURL').fill('/app/assets');
    await page.getByRole('button', { name: 'Create mapping' }).click();

    await expect(page.getByText('Saved successfully.')).toBeVisible();
    expect(calls.writes.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/ModuleOperation/create',
      body: { moduleId: 27, operationId: 2, pageURL: '/app/assets', isActive: true },
    });
  });

  test('prefills the edit dialog from the get-by-id response', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/module-operations');

    await page.getByRole('button', { name: 'Edit mapping Asset management' }).click();

    await expect(
      page.locator('.p-dialog-title', { hasText: 'Edit module operation' }),
    ).toBeVisible();
    await expect(page.locator('#pageURL')).toHaveValue('/app/assets');
    await expect(page.locator('#remark')).toHaveValue('Add button on the asset list');
  });

  test('POSTs the edited mapping with its id and mapping id', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/module-operations');

    await page.getByRole('button', { name: 'Edit mapping Asset management' }).click();
    await expect(page.locator('#pageURL')).toHaveValue('/app/assets');
    await page.locator('#pageURL').fill('/app/assets/list');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Saved successfully.')).toBeVisible();
    expect(calls.writes.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/ModuleOperation/update',
      body: {
        id: 101,
        moduleOperationMappingId: 501,
        moduleId: 27,
        operationId: 1,
        pageURL: '/app/assets/list',
      },
    });
  });

  test('DELETEs the mapping after confirming', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/module-operations');

    await page.getByRole('button', { name: 'Delete mapping Asset management' }).click();
    await expect(
      page.locator('.p-dialog-title', { hasText: 'Delete Module Operation' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Deleted successfully.')).toBeVisible();
    expect(calls.deletes).toEqual(['/api/ModuleOperation/delete/101']);
  });

  test('navigates back to parent modules from the cog dropdown', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/module-operations');

    await page.locator('.p-splitbutton-dropdown').click();
    await page.getByRole('menuitem', { name: 'Parent Modules' }).click();

    await expect(page).toHaveURL(/\/app\/modules$/);
  });
});
