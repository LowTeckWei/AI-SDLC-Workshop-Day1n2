import { test, expect } from '@playwright/test';

test.describe('Todo CRUD Operations', () => {
  let authenticatorId: string;

  test.beforeEach(async ({ page }) => {
    // Set up virtual authenticator
    const client = await page.context().newCDPSession(page);
    await client.send('WebAuthn.enable');
    const result = await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });
    authenticatorId = result.authenticatorId;

    // Register and land on main page
    await page.goto('/login');
    await page.fill('input[type="text"]', `testuser-${Date.now()}`);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a todo with title only and appear in Pending section', async ({ page }) => {
    await page.locator('input[placeholder="What needs to be done?"]').fill('Buy groceries');
    const resp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await resp;

    await expect(page.locator('li').filter({ hasText: 'Buy groceries' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('should create a todo with title, priority, and future due date', async ({ page }) => {
    const futureDate = new Date(Date.now() + 86400000); // tomorrow
    const dateStr = futureDate.toISOString().slice(0, 16);

    await page.locator('input[placeholder="What needs to be done?"]').fill('Important task');
    await page.locator('form select').selectOption('high');
    await page.locator('input[type="datetime-local"]').fill(dateStr);
    const resp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await resp;

    const todoItem = page.locator('li').filter({ hasText: 'Important task' });
    await expect(todoItem).toBeVisible({ timeout: 10000 });
    await expect(todoItem.locator('span').filter({ hasText: 'High' })).toBeVisible();
  });

  test('should not create todo with empty title', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add")');
    await expect(addButton).toBeDisabled();
  });

  test('should not create todo with past due date', async ({ page }) => {
    const pastDate = new Date(Date.now() - 86400000); // yesterday
    const dateStr = pastDate.toISOString().slice(0, 16);

    await page.locator('input[placeholder="What needs to be done?"]').fill('Past task');
    await page.locator('input[type="datetime-local"]').fill(dateStr);
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('.bg-red-50, .bg-red-900\\/50')).toBeVisible();
  });

  test('should edit a todo title and due date', async ({ page }) => {
    await page.locator('input[placeholder="What needs to be done?"]').fill('Original title');
    const createResp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await createResp;
    await expect(page.locator('li').filter({ hasText: 'Original title' })).toBeVisible({ timeout: 10000 });

    await page.locator('li').filter({ hasText: 'Original title' }).locator('button:has-text("Edit")').click();
    await page.locator('.fixed input[type="text"]').fill('Updated title');
    const updateResp = page.waitForResponse((r) => r.url().includes('/api/todos/') && r.request().method() === 'PUT');
    await page.locator('.fixed button:has-text("Update")').click();
    await updateResp;

    await expect(page.locator('li').filter({ hasText: 'Updated title' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('li').filter({ hasText: 'Original title' })).not.toBeVisible();
  });

  test('should cancel edit without changes', async ({ page }) => {
    await page.locator('input[placeholder="What needs to be done?"]').fill('Keep this title');
    const resp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await resp;
    await expect(page.locator('li').filter({ hasText: 'Keep this title' })).toBeVisible({ timeout: 10000 });

    await page.locator('li').filter({ hasText: 'Keep this title' }).locator('button:has-text("Edit")').click();
    await page.locator('.fixed input[type="text"]').fill('Changed title');
    await page.locator('.fixed button:has-text("Cancel")').click();

    await expect(page.locator('li').filter({ hasText: 'Keep this title' })).toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'Changed title' })).not.toBeVisible();
  });

  test('should toggle completion and move to Completed section', async ({ page }) => {
    await page.locator('input[placeholder="What needs to be done?"]').fill('Complete me');
    const resp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await resp;
    await expect(page.locator('li').filter({ hasText: 'Complete me' })).toBeVisible({ timeout: 10000 });

    const checkbox = page.locator('li').filter({ hasText: 'Complete me' }).locator('input[type="checkbox"]');
    await checkbox.check();

    await expect(page.locator('text=Completed (1)')).toBeVisible();
  });

  test('should uncheck a completed todo and return to Pending', async ({ page }) => {
    await page.locator('input[placeholder="What needs to be done?"]').fill('Toggle me');
    const resp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await resp;
    await expect(page.locator('li').filter({ hasText: 'Toggle me' })).toBeVisible({ timeout: 10000 });

    const checkbox = page.locator('li').filter({ hasText: 'Toggle me' }).locator('input[type="checkbox"]');
    await checkbox.check();
    await expect(page.locator('text=Completed (1)')).toBeVisible();

    await checkbox.uncheck();
    await expect(page.locator('text=Pending (1)')).toBeVisible();
  });

  test('should delete a todo', async ({ page }) => {
    await page.locator('input[placeholder="What needs to be done?"]').fill('Delete me');
    const resp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await resp;
    await expect(page.locator('li').filter({ hasText: 'Delete me' })).toBeVisible({ timeout: 10000 });

    await page.locator('li').filter({ hasText: 'Delete me' }).locator('button:has-text("Delete")').click();
    await expect(page.locator('li').filter({ hasText: 'Delete me' })).not.toBeVisible();
  });

  test('should persist todos after page reload', async ({ page }) => {
    await page.locator('input[placeholder="What needs to be done?"]').fill('Persistent todo');
    const resp = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await resp;
    await expect(page.locator('li').filter({ hasText: 'Persistent todo' })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('li').filter({ hasText: 'Persistent todo' })).toBeVisible({ timeout: 10000 });
  });
});
