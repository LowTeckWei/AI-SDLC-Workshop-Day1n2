import { test, expect } from '@playwright/test';

test.describe('Subtasks & Progress Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Mutex: verify server is responsive before starting test
    // This ensures no lingering DB writes from previous tests block this one
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 10000 });

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

    await page.fill('input[type="text"]', `subtask-user-${Date.now()}`);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { waitUntil: 'networkidle' });

    // Wait for initial data load to complete before interacting
    await expect(page.locator('text=No pending todos')).toBeVisible({ timeout: 10000 });

    // Create a todo and wait for the POST response to complete
    await page.fill('input[placeholder="What needs to be done?"]', 'Test Todo');
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/todos') && resp.request().method() === 'POST' && resp.status() === 201
      ),
      page.locator('form button[type="submit"]').click(),
    ]);
    await expect(page.locator('p:has-text("Test Todo")')).toBeVisible({ timeout: 10000 });
  });

  test('should expand subtasks section on a todo with none yet', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    await expect(todoItem.locator('input[placeholder="Add subtask..."]')).toBeVisible();
  });

  test('should add a single subtask via Enter key', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Step 1');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');

    await expect(todoItem.locator('text=Step 1')).toBeVisible();
    await expect(todoItem.locator('text=0/1 subtasks')).toBeVisible();
  });

  test('should add multiple subtasks via Add button', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Step 1');
    await todoItem.locator('button:has-text("Add")').last().click();
    await expect(todoItem.locator('text=Step 1')).toBeVisible();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Step 2');
    await todoItem.locator('button:has-text("Add")').last().click();
    await expect(todoItem.locator('text=Step 2')).toBeVisible();

    await expect(todoItem.locator('text=0/2 subtasks')).toBeVisible();
  });

  test('should toggle subtask complete and update progress bar', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    // Add two subtasks
    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Step 1');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');
    await expect(todoItem.locator('text=Step 1')).toBeVisible();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Step 2');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');
    await expect(todoItem.locator('text=Step 2')).toBeVisible();

    // Toggle first subtask - use click() since it's a controlled component
    const firstCheckbox = todoItem.locator('input[type="checkbox"]').nth(1);
    await firstCheckbox.click();

    await expect(todoItem.locator('text=1/2 subtasks')).toBeVisible();
    await expect(todoItem.locator('text=50%')).toBeVisible();
  });

  test('should show green bar at 100% completion', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Only step');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');
    await expect(todoItem.locator('text=Only step')).toBeVisible();

    // Toggle complete - use click() since it's a controlled component
    const subtaskCheckbox = todoItem.locator('input[type="checkbox"]').nth(1);
    await subtaskCheckbox.click();

    await expect(todoItem.locator('text=1/1 subtasks')).toBeVisible();
    await expect(todoItem.locator('text=100%')).toBeVisible();
    await expect(todoItem.locator('.bg-green-500')).toBeVisible();
  });

  test('should delete a subtask and recalculate progress', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Keep');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');
    await expect(todoItem.locator('text=Keep')).toBeVisible();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Remove');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');
    await expect(todoItem.locator('text=Remove')).toBeVisible();

    await expect(todoItem.locator('text=0/2 subtasks')).toBeVisible();

    // Delete the second subtask
    const deleteButtons = todoItem.locator('button:has-text("✕")');
    await deleteButtons.last().click();

    await expect(todoItem.locator('text=0/1 subtasks')).toBeVisible();
    await expect(todoItem.locator('text=Remove')).not.toBeVisible();
  });

  test('should show progress bar when subtask list is collapsed', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Some step');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');
    await expect(todoItem.locator('text=Some step')).toBeVisible();

    // Collapse
    await todoItem.locator('button:has-text("Subtasks")').click();

    // Progress bar should still be visible
    await expect(todoItem.locator('text=0/1 subtasks')).toBeVisible();
    // Subtask input should be hidden
    await expect(todoItem.locator('input[placeholder="Add subtask..."]')).not.toBeVisible();
  });

  test('should cascade delete subtasks when parent todo is deleted', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    await todoItem.locator('input[placeholder="Add subtask..."]').fill('Child step');
    await todoItem.locator('input[placeholder="Add subtask..."]').press('Enter');
    await expect(todoItem.locator('text=Child step')).toBeVisible();

    // Delete the parent todo
    await todoItem.locator('button:has-text("Delete")').click();

    await expect(page.locator('p:has-text("Test Todo")')).not.toBeVisible();
    await expect(page.locator('text=Child step')).not.toBeVisible();
  });

  test('should not add subtask with empty title', async ({ page }) => {
    const todoItem = page.locator('li', { has: page.locator('p:has-text("Test Todo")') }).first();
    await todoItem.locator('button:has-text("Subtasks")').click();

    // Try to add with empty title
    await todoItem.locator('input[placeholder="Add subtask..."]').fill('   ');
    await todoItem.locator('button:has-text("Add")').last().click();

    // No progress bar count should appear (still 0 subtasks = no bar rendered)
    await expect(todoItem.locator('text=/\\d+\\/\\d+ subtasks/')).not.toBeVisible();
  });
});
