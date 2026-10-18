import { expect, test } from '@playwright/test';

import {
  buildLoginResponse,
  hostSuccessResponse,
  mockAuth,
  passwordChangeResponse,
  successResponseForRole,
} from './fixtures/auth-mocks';

const EMAIL = '#txtEmail';
const PASSWORD = '#txtPassword';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await page.goto('/auth/login');
  });

  test('renders the form with the login button disabled', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome Back!' })).toBeVisible();
    await expect(page.getByText('Please sign in to access your account.')).toBeVisible();
    await expect(page.locator(EMAIL)).toBeVisible();
    await expect(page.locator(PASSWORD)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeDisabled();
  });

  test('keeps remember me and single sign-on disabled until supported', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: 'Remember me (coming soon)' })).toBeDisabled();

    const sso = page.getByRole('group', { name: 'Single sign-on' });
    for (const provider of ['Google', 'Microsoft', 'Apple']) {
      await expect(sso.getByRole('button', { name: provider })).toBeDisabled();
    }
    await expect(
      page.getByText('Google, Microsoft and Apple sign-in are coming soon.'),
    ).toBeVisible();
  });

  test('shows a required error for an empty email', async ({ page }) => {
    await page.locator(EMAIL).focus();
    await page.locator(EMAIL).blur();
    await expect(page.getByText('Please enter your email address.')).toBeVisible();
  });

  test('shows a format error for an invalid email', async ({ page }) => {
    await page.locator(EMAIL).fill('not-an-email');
    await page.locator(EMAIL).blur();
    await expect(
      page.getByText('Please enter a valid email address. (e.g. user@example.com).'),
    ).toBeVisible();
  });

  test('shows a required error for an empty password', async ({ page }) => {
    await page.locator(PASSWORD).focus();
    await page.locator(PASSWORD).blur();
    await expect(page.getByText('Please enter your password.')).toBeVisible();
  });

  test('trims surrounding whitespace from the email on blur', async ({ page }) => {
    await page.locator(EMAIL).fill('  abc@gmail.com  ');
    await page.locator(EMAIL).blur();
    await expect(page.locator(EMAIL)).toHaveValue('abc@gmail.com');
  });

  test('enables the login button once the form is valid', async ({ page }) => {
    await page.locator(EMAIL).fill('user@example.com');
    await page.locator(PASSWORD).fill('secret1');
    await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  test('redirects a staff member (roleTypeId 2) to the staff dashboard', async ({ page }) => {
    await mockAuth(page, { loginResponse: successResponseForRole(2) });
    await page.locator(EMAIL).fill('user@example.com');
    await page.locator(PASSWORD).fill('secret1');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('redirects an admin (roleTypeId 1) to the admin dashboard', async ({ page }) => {
    await mockAuth(page, { loginResponse: successResponseForRole(1) });
    await page.locator(EMAIL).fill('admin@example.com');
    await page.locator(PASSWORD).fill('secret1');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/app\/admin-dashboard/);
  });

  test('redirects a manager (roleTypeId 3) to the admin dashboard', async ({ page }) => {
    await mockAuth(page, { loginResponse: successResponseForRole(3) });
    await page.locator(EMAIL).fill('manager@example.com');
    await page.locator(PASSWORD).fill('secret1');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/app\/admin-dashboard/);
  });

  test('redirects a host to the host dashboard', async ({ page }) => {
    await mockAuth(page, { loginResponse: hostSuccessResponse() });
    await page.locator(EMAIL).fill('sujeet@skolenza.in');
    await page.locator(PASSWORD).fill('secret1');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/app\/host-dashboard/);
  });

  test('submits with the Enter key', async ({ page }) => {
    await mockAuth(page, { loginResponse: successResponseForRole(2) });
    await page.locator(EMAIL).fill('user@example.com');
    await page.locator(PASSWORD).fill('secret1');
    await page.locator(PASSWORD).press('Enter');
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('shows an error and stays on login when credentials are rejected', async ({ page }) => {
    await mockAuth(page, {
      loginResponse: buildLoginResponse({ isSucceeded: false, message: 'Invalid credentials' }),
    });
    await page.locator(EMAIL).fill('user@example.com');
    await page.locator(PASSWORD).fill('wrongpass');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('shows an error and stays on login when the account has no role', async ({ page }) => {
    const noRole = buildLoginResponse();
    (noRole.data.user as { primaryRole: unknown }).primaryRole = null;
    await mockAuth(page, { loginResponse: noRole });
    await page.locator(EMAIL).fill('user@example.com');
    await page.locator(PASSWORD).fill('secret1');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(
      page.getByText('Your account has no role assigned. Contact your administrator.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('redirects to set-password when a password change is required', async ({ page }) => {
    await mockAuth(page, { loginResponse: passwordChangeResponse('reset-tok') });
    await page.locator(EMAIL).fill('user@example.com');
    await page.locator(PASSWORD).fill('secret1');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/auth\/set-password\?token=reset-tok/);
  });

  test('shows the loading state while the login request is pending', async ({ page }) => {
    await mockAuth(page, { loginResponse: successResponseForRole(2), delayMs: 1500 });
    await page.locator(EMAIL).fill('user@example.com');
    await page.locator(PASSWORD).fill('secret1');
    const loginButton = page.getByRole('button', { name: 'Login' });
    await loginButton.click();
    await expect(loginButton).toBeDisabled();
    await expect(loginButton.locator('.p-button-loading-icon, .pi-spinner')).toBeVisible();
  });

  test('navigates to forgot password', async ({ page }) => {
    await page.getByRole('link', { name: 'Forgot Password?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test('navigates to create account', async ({ page }) => {
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL(/\/auth\/plan/);
  });
});
