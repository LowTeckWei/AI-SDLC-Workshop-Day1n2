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
  });

  test('should create a todo with title only and appear in Pending section', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Buy groceries');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Buy groceries')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('should create a todo with title, priority, and future due date', async ({ page }) => {
    const futureDate = new Date(Date.now() + 86400000); // tomorrow
    const dateStr = futureDate.toISOString().slice(0, 16);

    await page.fill('input[placeholder="What needs to be done?"]', 'Important task');
    await page.selectOption('form select', 'high');
    await page.fill('input[type="datetime-local"]', dateStr);
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Important task')).toBeVisible();
    await expect(page.locator('text=high')).toBeVisible();
  });

  test('should not create todo with empty title', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add")');
    await expect(addButton).toBeDisabled();
  });

  test('should not create todo with past due date', async ({ page }) => {
    const pastDate = new Date(Date.now() - 86400000); // yesterday
    const dateStr = pastDate.toISOString().slice(0, 16);

    await page.fill('input[placeholder="What needs to be done?"]', 'Past task');
    await page.fill('input[type="datetime-local"]', dateStr);
    await page.click('button:has-text("Add")');

    await expect(page.locator('.bg-red-50, .bg-red-900\\/50')).toBeVisible();
  });

  test('should edit a todo title and due date', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Original title');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Original title')).toBeVisible();

    await page.click('button:has-text("Edit")');
    await page.fill('input[type="text"]', 'Updated title');
    await page.click('button:has-text("Update")');

    await expect(page.locator('text=Updated title')).toBeVisible();
    await expect(page.locator('text=Original title')).not.toBeVisible();
  });

  test('should cancel edit without changes', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Keep this title');
    await page.click('button:has-text("Add")');

    await page.click('button:has-text("Edit")');
    await page.fill('input[type="text"]', 'Changed title');
    await page.click('button:has-text("Cancel")');

    await expect(page.locator('text=Keep this title')).toBeVisible();
    await expect(page.locator('text=Changed title')).not.toBeVisible();
  });

  test('should toggle completion and move to Completed section', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Complete me');
    await page.click('button:has-text("Add")');

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();

    await expect(page.locator('text=Completed (1)')).toBeVisible();
  });

  test('should uncheck a completed todo and return to Pending', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Toggle me');
    await page.click('button:has-text("Add")');

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    await expect(page.locator('text=Completed (1)')).toBeVisible();

    await checkbox.uncheck();
    await expect(page.locator('text=Pending (1)')).toBeVisible();
  });

  test('should delete a todo', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Delete me');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Delete me')).toBeVisible();

    await page.click('button:has-text("Delete")');
    await expect(page.locator('text=Delete me')).not.toBeVisible();
  });

  test('should persist todos after page reload', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Persistent todo');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Persistent todo')).toBeVisible();

    await page.reload();
    await expect(page.locator('text=Persistent todo')).toBeVisible();
  });
});
