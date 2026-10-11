import { expect, test } from '@playwright/test';

import { mockAuth, successResponseForRole } from './fixtures/auth-mocks';

test('staffMember grid displays country flag and ISO code', async ({ page }) => {
  await mockAuth(page, { loginResponse: successResponseForRole(1) });
  await page.route('**/StaffMember/get-statistics**', (route) =>
    route.fulfill({
      json: { isSucceeded: true, message: '', errors: [], data: null },
    }),
  );
  await page.route('**/StaffMember/get-all?**', (route) =>
    route.fulfill({
      json: {
        isSucceeded: true,
        message: '',
        errors: [],
        data: [
          {
            staffMemberId: '2',
            employementCode: 'MEPL-0204',
            firstName: 'Aarav',
            middleName: '',
            lastName: 'Mehta',
            countryId: 101,
            countryCode: 'IN',
            nationality: 'India',
            dateOfOnBoarding: '2026-09-19',
            staffEmploymentTypeId: 1,
            staffEmploymentTypeName: 'Full Time',
            departmentId: 1,
            departmentName: 'Engineering',
            designationId: 1,
            designationName: 'Engineer',
            officialEmail: 'aarav@example.com',
            completionPercentage: 57,
            isActive: true,
            summaryStaffMemberInfo: {},
          },
        ],
        pageNumber: 1,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
      },
    }),
  );

  await page.goto('/auth/login');
  await page.locator('#txtEmail').fill('admin@example.com');
  await page.locator('#txtPassword').fill('secret1');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.goto('/app/staff members');

  await expect(page.getByRole('columnheader', { name: 'Country' })).toBeVisible();
  const countryCell = page.getByRole('cell', { name: /India flag IN/ });
  await expect(countryCell).toBeVisible();
  await expect(countryCell.locator('img')).toHaveAttribute('src', /flagcdn\.com\/16x12\/in\.webp/);
  await expect(page.getByRole('button', { name: /Profile 57% complete/ })).toBeVisible();
});
