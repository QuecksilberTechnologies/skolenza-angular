import { expect, test } from '@playwright/test';

import { mockAuth, successResponseForRole } from './fixtures/auth-mocks';

const identityRows = [
  {
    id: 1,
    staffMemberId: '1',
    countryCode: 'US',
    countryName: 'United States',
    identityCategoryName: 'Government identity',
    identityCategoryDocumentId: 41,
    documentCode: 'SSN',
    documentName: 'Social Security Number',
    description: 'United States social security identifier',
    isMandatory: true,
    identityValue: '***-**-6789',
    isVerified: false,
    isEditAllowed: true,
    hasIdentityUploaded: false,
    effectiveFrom: null,
    effectiveTo: null,
    isActive: true,
    completionPercentage: 100,
  },
  {
    id: 2,
    staffMemberId: '1',
    countryCode: 'US',
    countryName: 'United States',
    identityCategoryName: 'Travel identity',
    identityCategoryDocumentId: 42,
    documentCode: 'PASSPORT',
    documentName: 'Passport',
    description: 'Government-issued passport',
    isMandatory: false,
    identityValue: null,
    isVerified: false,
    isEditAllowed: true,
    hasIdentityUploaded: false,
    effectiveFrom: null,
    effectiveTo: null,
    isActive: null,
    completionPercentage: 0,
  },
];

test('country catalogue drives identity fields and displays API completion percentage', async ({
  page,
}) => {
  await mockAuth(page, { loginResponse: successResponseForRole(2) });
  await page.route('**/StaffMember/Basic/get**', (route) =>
    route.fulfill({
      json: { isSucceeded: true, message: '', errors: [], data: [{ countryId: 233 }] },
    }),
  );
  await page.route('**/StaffMember/Sensitive/get**', (route) =>
    route.fulfill({
      json: {
        isSucceeded: true,
        message: 'Identity information retrieved successfully.',
        errors: [],
        data: identityRows,
        completionPercentage: 50,
      },
    }),
  );

  await page.goto('/auth/login');
  await page.locator('#txtEmail').fill('staffMember@example.com');
  await page.locator('#txtPassword').fill('secret1');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.goto('/app/profile/identity-info');

  await expect(page.getByText('Social Security Number', { exact: true })).toBeVisible();
  await expect(page.getByText('Passport', { exact: true })).toBeVisible();
  await expect(page.locator('app-profile-header .profile-progress')).toHaveAttribute(
    'data-pc-name',
    'knob',
  );
  await expect(page.getByText('50%', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add Identity' }).click();
  await expect(page.getByRole('heading', { name: 'Social Security Number' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Passport' })).toBeVisible();
  await expect(page.getByText('Aadhaar Number', { exact: true })).toHaveCount(0);
});

test('selected staffMember id drives the persisted-country identity catalogue', async ({ page }) => {
  await mockAuth(page, { loginResponse: successResponseForRole(1) });
  let requestedStaffMemberId: string | null = null;
  await page.route('**/StaffMember/Sensitive/get**', (route) => {
    requestedStaffMemberId = new URL(route.request().url()).searchParams.get('StaffMemberId');
    return route.fulfill({
      json: {
        isSucceeded: true,
        message: 'Identity information retrieved successfully.',
        errors: [],
        data: [
          {
            ...identityRows[1],
            staffMemberId: 'DLQ7VZXK',
            countryCode: 'GB',
            countryName: 'United Kingdom',
            identityCategoryDocumentId: 83,
            documentCode: 'NINO',
            documentName: 'National Insurance Number',
            description: 'United Kingdom national insurance identifier',
          },
          {
            ...identityRows[1],
            staffMemberId: 'DLQ7VZXK',
            countryCode: 'GB',
            countryName: 'United Kingdom',
          },
        ],
        completionPercentage: 0,
      },
    });
  });

  await page.goto('/auth/login');
  await page.locator('#txtEmail').fill('admin@example.com');
  await page.locator('#txtPassword').fill('secret1');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.goto('/app/profile/identity-info?staffMemberId=DLQ7VZXK&countryId=83');

  await expect(page.getByText('National Insurance Number', { exact: true })).toBeVisible();
  await expect(page.getByText('United Kingdom', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Aadhaar Card', { exact: true })).toHaveCount(0);
  expect(requestedStaffMemberId).toBe('DLQ7VZXK');
});
