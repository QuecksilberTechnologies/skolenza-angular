import { expect, test, type Page } from '@playwright/test';

import { hostSuccessResponse, mockAuth } from './fixtures/auth-mocks';
import { mockModules, type ModuleCalls } from './fixtures/module-mocks';

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
 * ambiguous. Pick them by order instead: the parent form renders Scope alone, the sub-module
 * form renders Parent module first and Scope second.
 */
function dialogSelect(page: Page, index: number) {
  return page.locator('.p-dialog p-select').nth(index);
}

async function setup(page: Page, options = {}): Promise<ModuleCalls> {
  await mockAuth(page, { loginResponse: hostSuccessResponse() });
  const calls = await mockModules(page, options);
  await loginAsHost(page);
  return calls;
}

test.describe('Parent modules', () => {
  test('opens on the Institution scope', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');

    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();
    // The header endpoint returns nothing without a scope, so the grid must send one on arrival.
    expect(calls.moduleHeaders[0]).toContain('ModuleScope=1');
  });

  test('lists the parent modules in scope and leaves the rest out', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules');

    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Asset-Management', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Profile', exact: true })).toBeVisible();
    // Host-scoped, so it is out of scope for the default Institution view.
    await expect(page.getByRole('cell', { name: 'Reporting', exact: true })).toBeHidden();
  });

  test('renders the scope and status of each row', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules');

    const assetRow = page.getByRole('row', { name: /Asset management/ });
    await expect(assetRow.getByText('Institution User')).toBeVisible();
    await expect(assetRow.getByText('Active')).toBeVisible();

    await page.getByLabel('Filter by scope').click();
    await page.getByRole('option', { name: 'Host User' }).click();

    const reportingRow = page.getByRole('row', { name: /Reporting/ });
    await expect(reportingRow.getByText('Host User')).toBeVisible();
    await expect(reportingRow.getByText('Inactive')).toBeVisible();
  });

  test('sends moduleScope on the request when the scope filter is used', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();

    await page.getByLabel('Filter by scope').click();
    await page.getByRole('option', { name: 'Host User' }).click();

    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeHidden();
    await expect(page.getByRole('cell', { name: 'Reporting', exact: true })).toBeVisible();
    expect(calls.moduleHeaders.at(-1)).toContain('ModuleScope=2');
  });

  test('narrows to the common modules without changing the requested scope', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');

    // Institution User owns the whole of scope 1 — the common rows included.
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Profile', exact: true })).toBeVisible();

    await page.getByLabel('Filter by scope').click();
    await page.getByRole('option', { name: 'Common' }).click();

    // Common is the `isCommonMenu` subset of scope 1, narrowed client-side.
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeHidden();
    await expect(page.getByRole('cell', { name: 'Profile', exact: true })).toBeVisible();
    expect(calls.moduleHeaders.at(-1)).toContain('ModuleScope=1');
  });

  test('filters the status client-side without going back to the network', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();
    const before = calls.moduleHeaders.length;

    await page.getByLabel('Filter by status').click();
    await page.getByRole('option', { name: 'Inactive' }).click();

    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeHidden();
    // `get-module-headers` cannot answer for inactive rows, so the filter must not be pushed down.
    expect(calls.moduleHeaders).toHaveLength(before);
  });

  test('shows an inactive header the header endpoint refuses to list', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();

    await page.getByLabel('Filter by scope').click();
    await page.getByRole('option', { name: 'Host User' }).click();

    // `Reporting` is inactive, so it is absent from every `get-module-headers` response. It is
    // reachable only by following its leaf's `parentModuleId` and reading the header back by id.
    await expect(page.getByRole('cell', { name: 'Reporting', exact: true })).toBeVisible();
    expect(calls.headerReads).toContain(31);
  });

  test('offers no way to clear the scope filter', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules');
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();

    // Clearing it would send no scope at all, which empties the grid with no way back.
    await expect(page.getByLabel('Filter by scope').locator('.p-select-clear-icon')).toBeHidden();
  });

  test('filters the grid client-side from the search box', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules');
    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeVisible();

    await page.getByPlaceholder('Search...').fill('Profile');

    await expect(page.getByRole('cell', { name: 'Asset management', exact: true })).toBeHidden();
    await expect(page.getByRole('cell', { name: 'Profile', exact: true })).toBeVisible();
  });

  test('PATCHes the status with the row scope after confirming', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'Deactivate Asset management' }).click();
    await expect(page.locator('.p-dialog-title', { hasText: 'Change Status' })).toBeVisible();
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('Status updated successfully.')).toBeVisible();
    expect(calls.status).toEqual([
      { url: '/api/ParentModule/27/status', body: { moduleScope: 1, isActive: false } },
    ]);
  });

  test('leaves the row untouched when the status update fails', async ({ page }) => {
    await setup(page, { statusSucceeds: false });
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'Deactivate Asset management' }).click();
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('Could not update status.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Deactivate Asset management' })).toBeVisible();
  });

  test('lists a parent"s children in the sitemap popover', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'View sub modules of Profile', exact: true }).click();

    await expect(page.getByText('Sign out')).toBeVisible();
    await expect(page.getByText('My profile')).toBeVisible();
    expect(calls.subList.at(-1)).toContain('parentModuleId=6');
  });

  test('drills into a sub header and walks back out', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'View sub modules of Profile', exact: true }).click();
    // The grid lists sub-headers as rows of their own now, so the drill-down button inside the
    // popover has a namesake in the table — scope to the popover or the trail resets.
    // `appendTo="body"` moves the panel out of the component, so match the rendered class.
    const popover = page.locator('.p-popover');
    // Leaves offer no drill-down, so only the sub-header carries a chevron.
    await popover.getByRole('button', { name: 'View sub modules of Profile settings' }).click();

    // `exact` — the urlPath line below the name would match the same text.
    await expect(page.getByText('Theme', { exact: true })).toBeVisible();
    await expect.poll(() => calls.subList.at(-1)).toContain('parentModuleId=13');

    await page.getByRole('button', { name: 'Back to Profile' }).click();

    await expect(page.getByText('Sign out', { exact: true })).toBeVisible();
    await expect.poll(() => calls.subList.at(-1)).toContain('parentModuleId=6');
  });

  test('opens the create dialog from the split button', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'Add Parent Module' }).click();

    await expect(
      page.locator('.p-dialog-title', { hasText: 'Create parent module' }),
    ).toBeVisible();
    // Scope only — a parent module has no parent select.
    await expect(page.locator('.p-dialog p-select')).toHaveCount(1);
  });

  test('POSTs the new module from the create dialog', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'Add Parent Module' }).click();
    await page.locator('#displayName').fill('Recruitment');
    await page.locator('#moduleName').fill('Recruitment');
    await page.locator('#moduleCode').fill('RCT');
    await page.locator('#urlPath').fill('recruitment');
    await dialogSelect(page, 0).click();
    await page.getByRole('option', { name: 'Institution User' }).click();
    await page.getByRole('button', { name: 'Create module' }).click();

    await expect(page.getByText('Module saved successfully.')).toBeVisible();
    expect(calls.writes.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/ParentModule/add',
      body: {
        moduleCode: 'RCT',
        moduleName: 'Recruitment',
        displayName: 'Recruitment',
        urlPath: 'recruitment',
        moduleScope: 1,
        isActive: true,
      },
    });
  });

  test('prefills the edit dialog from the get-by-id response', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'Actions for Asset management' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    await expect(page.locator('.p-dialog-title', { hasText: 'Edit parent module' })).toBeVisible();
    await expect(page.locator('#displayName')).toHaveValue('Asset management');
    await expect(page.locator('#moduleCode')).toHaveValue('A-M');
    await expect(page.locator('#urlPath')).toHaveValue('asset-management');
  });

  test('PUTs the edited module to the id route', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules');

    await page.getByRole('button', { name: 'Actions for Asset management' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page.locator('#displayName')).toHaveValue('Asset management');
    await page.locator('#displayName').fill('Assets');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Module saved successfully.')).toBeVisible();
    expect(calls.writes.at(-1)).toMatchObject({
      method: 'PUT',
      url: '/api/ParentModule/27',
      body: { displayName: 'Assets' },
    });
  });

  test('navigates to sub modules from the cog dropdown', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules');

    await page.locator('.p-splitbutton-dropdown').click();
    await page.getByRole('menuitem', { name: 'Sub Modules' }).click();

    await expect(page).toHaveURL(/\/app\/modules\/sub-modules/);
  });
});

test.describe('Sub modules', () => {
  test('lists sub modules with their parent', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/sub-modules');

    await expect(page.getByRole('cell', { name: 'Sign out', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'My profile', exact: true })).toBeVisible();
    await expect(page.getByRole('row', { name: /Sign out/ }).getByText('Profile')).toBeVisible();
  });

  test('preselects the parent filter from the drill-down query param', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/sub-modules?parentModuleId=6');

    await expect(page.getByRole('cell', { name: 'Sign out', exact: true })).toBeVisible();
    expect(calls.subList.at(-1)).toContain('parentModuleId=6');
  });

  test('honours the scope the drill-down arrived with', async ({ page }) => {
    const calls = await setup(page);
    // A Host-scoped parent must not land on the Institution default, or the grid comes back empty.
    await page.goto('/app/modules/sub-modules?parentModuleId=6&moduleScopeKey=host');

    await expect
      .poll(() => calls.subList.at(-1))
      .toMatch(/moduleScope=2(?=.*parentModuleId=6)|parentModuleId=6.*moduleScope=2/);
  });

  test('requires a parent module on the create dialog', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/sub-modules');

    await page.getByRole('button', { name: 'Add Sub Module' }).click();

    await expect(page.locator('.p-dialog-title', { hasText: 'Create sub module' })).toBeVisible();
    // Parent module and Scope.
    await expect(page.locator('.p-dialog p-select')).toHaveCount(2);
    // Save stays blocked until a parent is picked.
    await expect(page.getByRole('button', { name: 'Create module' })).toBeDisabled();
    expect(calls.moduleHeaders.length).toBeGreaterThan(0);
  });

  test('POSTs the new sub module with its parentModuleId', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/sub-modules');

    await page.getByRole('button', { name: 'Add Sub Module' }).click();
    await dialogSelect(page, 0).click();
    await page.getByRole('option', { name: 'Profile', exact: true }).click();
    await page.locator('#displayName').fill('Preferences');
    await page.locator('#moduleName').fill('Preferences');
    await page.locator('#moduleCode').fill('PRF');
    await page.locator('#urlPath').fill('preferences');
    await dialogSelect(page, 1).click();
    await page.getByRole('option', { name: 'Institution User' }).click();
    await page.getByRole('button', { name: 'Create module' }).click();

    await expect(page.getByText('Module saved successfully.')).toBeVisible();
    expect(calls.writes.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/SubModule/add',
      body: { parentModuleId: 6, displayName: 'Preferences', moduleScope: 1 },
    });
  });

  test('PATCHes the sub module status', async ({ page }) => {
    const calls = await setup(page);
    await page.goto('/app/modules/sub-modules');

    await page.getByRole('button', { name: 'Deactivate Sign out' }).click();
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('Status updated successfully.')).toBeVisible();
    expect(calls.status).toEqual([
      { url: '/api/SubModule/11/status', body: { moduleScope: 1, isActive: false } },
    ]);
  });

  test('navigates back to parent modules from the cog dropdown', async ({ page }) => {
    await setup(page);
    await page.goto('/app/modules/sub-modules');

    await page.locator('.p-splitbutton-dropdown').click();
    await page.getByRole('menuitem', { name: 'Parent Modules' }).click();

    await expect(page).toHaveURL(/\/app\/modules$/);
  });
});
