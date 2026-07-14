import { test, expect, uniqueUsername, register, login } from './helpers';

test.describe('Authentication (WebAuthn)', () => {
  test('registers a new user with a passkey and lands on the home page', async ({ page, authenticatorId }) => {
    expect(authenticatorId).toBeTruthy();
    const username = uniqueUsername('register');

    await register(page, username);

    await expect(page).toHaveURL('/');
    await expect(page.getByText(username)).toBeVisible();
  });

  test('rejects registering a username that is already taken', async ({ page }) => {
    const username = uniqueUsername('dupe');
    await register(page, username);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');

    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.getByLabel('Username').fill(username);
    await page.getByRole('button', { name: /Register with Passkey/i }).click();

    await expect(page.getByText(/already taken/i)).toBeVisible();
  });

  test('logs in an existing passkey user', async ({ page }) => {
    const username = uniqueUsername('login');
    await register(page, username);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');

    await login(page, username);

    await expect(page).toHaveURL('/');
    await expect(page.getByText(username)).toBeVisible();
  });

  test('redirects unauthenticated users from / to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('redirects unauthenticated users from /calendar to /login', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL('/login');
  });

  test('redirects authenticated users away from /login back to /', async ({ page }) => {
    const username = uniqueUsername('redirect');
    await register(page, username);

    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });

  test('logs out and redirects to /login', async ({ page }) => {
    const username = uniqueUsername('logout');
    await register(page, username);

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL('/login');
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });
});
