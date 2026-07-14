import { test, expect, Page } from '@playwright/test';

async function createTodo(page: Page, title: string, priority?: string) {
  const input = page.locator('input[placeholder="What needs to be done?"]');
  await input.fill(title);
  if (priority) {
    await page.locator('form select').selectOption(priority);
  }
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/todos') && r.request().method() === 'POST'
  );
  await page.locator('form button[type="submit"]').click();
  await responsePromise;
  await expect(page.locator('li').filter({ hasText: title })).toBeVisible({ timeout: 10000 });
}

test.describe('Priority System', () => {
  test.beforeEach(async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('WebAuthn.enable');
    await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });

    await page.goto('/login');
    await page.fill('input[type="text"]', `priority-user-${Date.now()}`);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a todo with High priority and show red badge', async ({ page }) => {
    await createTodo(page, 'Urgent task', 'high');

    const todoItem = page.locator('li').filter({ hasText: 'Urgent task' });
    const badge = todoItem.locator('span').filter({ hasText: 'High' });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/bg-red-100|bg-red-900/);
  });

  test('should create a todo with Medium priority and show yellow badge', async ({ page }) => {
    await createTodo(page, 'Normal task', 'medium');

    const todoItem = page.locator('li').filter({ hasText: 'Normal task' });
    const badge = todoItem.locator('span').filter({ hasText: 'Medium' });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/bg-yellow-100|bg-yellow-900/);
  });

  test('should create a todo with Low priority and show blue badge', async ({ page }) => {
    await createTodo(page, 'Someday task', 'low');

    const todoItem = page.locator('li').filter({ hasText: 'Someday task' });
    const badge = todoItem.locator('span').filter({ hasText: 'Low' });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/bg-blue-100|bg-blue-900/);
  });

  test('should default to Medium priority when none selected', async ({ page }) => {
    await createTodo(page, 'Default priority task');

    const todoItem = page.locator('li').filter({ hasText: 'Default priority task' });
    await expect(todoItem.locator('span').filter({ hasText: 'Medium' })).toBeVisible();
  });

  test('should edit priority from Low to High and re-sort', async ({ page }) => {
    await createTodo(page, 'Medium task', 'medium');
    await createTodo(page, 'Low task', 'low');

    // Edit the Low todo to High
    const lowTodoItem = page.locator('li').filter({ hasText: 'Low task' });
    await lowTodoItem.locator('button:has-text("Edit")').click();

    // Change priority in edit modal and wait for API
    await page.locator('.fixed select').selectOption('high');
    const updateResp = page.waitForResponse(
      (r) => r.url().includes('/api/todos/') && r.request().method() === 'PUT'
    );
    await page.locator('.fixed button:has-text("Update")').click();
    await updateResp;

    // Verify it now shows High badge
    const editedItem = page.locator('li').filter({ hasText: 'Low task' });
    await expect(editedItem.locator('span').filter({ hasText: 'High' })).toBeVisible();

    // Verify High-priority todo appears before Medium-priority todo
    const todoItems = page.locator('section').filter({ hasText: 'Pending' }).locator('li');
    const firstTodoText = await todoItems.first().textContent();
    expect(firstTodoText).toContain('Low task');
  });

  test('should filter to show only High priority todos', async ({ page }) => {
    await createTodo(page, 'High task', 'high');
    await createTodo(page, 'Medium task', 'medium');
    await createTodo(page, 'Low task', 'low');

    // Set filter to High Priority (filter select is outside the form)
    const filterSelect = page.locator('select').filter({ hasText: 'All Priorities' });
    await filterSelect.selectOption('high');

    // Only high-priority todo should be visible
    await expect(page.locator('li').filter({ hasText: 'High task' })).toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'Medium task' })).not.toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'Low task' })).not.toBeVisible();
  });

  test('should clear filter and show all todos', async ({ page }) => {
    await createTodo(page, 'High task', 'high');
    await createTodo(page, 'Low task', 'low');

    // Filter to High only
    const filterSelect = page.locator('select').filter({ hasText: 'All Priorities' });
    await filterSelect.selectOption('high');
    await expect(page.locator('li').filter({ hasText: 'Low task' })).not.toBeVisible();

    // Clear filter
    await page.locator('select').filter({ hasText: 'High Priority' }).selectOption('all');

    // All todos visible again
    await expect(page.locator('li').filter({ hasText: 'High task' })).toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'Low task' })).toBeVisible();
  });

  test('should sort todos High → Medium → Low within Pending section', async ({ page }) => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);

    // Create in reverse order to test sorting
    await page.locator('input[placeholder="What needs to be done?"]').fill('Low item');
    await page.locator('form select').selectOption('low');
    await page.locator('input[type="datetime-local"]').fill(tomorrow);
    const r1 = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await r1;
    await expect(page.locator('li').filter({ hasText: 'Low item' })).toBeVisible({ timeout: 10000 });

    await page.locator('input[placeholder="What needs to be done?"]').fill('High item');
    await page.locator('form select').selectOption('high');
    await page.locator('input[type="datetime-local"]').fill(tomorrow);
    const r2 = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await r2;
    await expect(page.locator('li').filter({ hasText: 'High item' })).toBeVisible({ timeout: 10000 });

    await page.locator('input[placeholder="What needs to be done?"]').fill('Medium item');
    await page.locator('form select').selectOption('medium');
    await page.locator('input[type="datetime-local"]').fill(tomorrow);
    const r3 = page.waitForResponse((r) => r.url().includes('/api/todos') && r.request().method() === 'POST');
    await page.locator('form button[type="submit"]').click();
    await r3;
    await expect(page.locator('li').filter({ hasText: 'Medium item' })).toBeVisible({ timeout: 10000 });

    // Verify order: High → Medium → Low
    const pendingSection = page.locator('section').filter({ hasText: 'Pending' });
    const todoTexts = await pendingSection.locator('li').allTextContents();

    const highIdx = todoTexts.findIndex((t) => t.includes('High item'));
    const medIdx = todoTexts.findIndex((t) => t.includes('Medium item'));
    const lowIdx = todoTexts.findIndex((t) => t.includes('Low item'));

    expect(highIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(lowIdx);
  });
});
