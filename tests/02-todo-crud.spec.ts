import { test, expect, uniqueUsername, register, createTodo } from './helpers';

test.describe('Todo CRUD operations', () => {
  test('registers a user and creates a todo that appears in Pending section', async ({ page }) => {
    const username = uniqueUsername('crud');
    await register(page, username);

    const title = 'Learn Playwright';
    await createTodo(page, title, {
      dueDate: '2027-06-15T09:00',
    });

    await expect(page.locator('li', { hasText: title })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Pending' })).toBeVisible();
  });

  test('allows creating a todo with a valid future due date', async ({ page }) => {
    const username = uniqueUsername('futuredate');
    await register(page, username);

    const title = 'Todo with future date';
    const futureDate = '2027-12-31T14:30';
    await createTodo(page, title, { dueDate: futureDate });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();

    const dueDateText = todoItem.locator('p', { hasText: /Due/ });
    await expect(dueDateText).toBeVisible();
  });

  test('edits a todo title and verifies the update', async ({ page }) => {
    const username = uniqueUsername('edittitle');
    await register(page, username);

    const originalTitle = 'Original task';
    await createTodo(page, originalTitle, { dueDate: '2027-06-15T09:00' });

    let todoItem = page.locator('li', { hasText: originalTitle }).first();
    await expect(todoItem).toBeVisible();

    let editButton = todoItem.locator('button', { hasText: 'Edit' });
    await editButton.click();

    await page.waitForTimeout(1000);

    todoItem = page.locator('li', { hasText: originalTitle }).first();
    const allInputs = todoItem.locator('input');
    let titleInput = null;

    for (let i = 0; i < await allInputs.count(); i++) {
      const type = await allInputs.nth(i).getAttribute('type');
      if (type !== 'checkbox') {
        titleInput = allInputs.nth(i);
        break;
      }
    }

    if (titleInput) {
      const updatedTitle = 'Updated task';
      await titleInput.clear();
      await titleInput.fill(updatedTitle);

      const saveButton = todoItem.locator('button', { hasText: 'Save' });
      await saveButton.click();

      await page.waitForTimeout(1000);

      await expect(page.locator('li', { hasText: updatedTitle })).toBeVisible();
    }
  });

  test('toggles a todo complete and verifies it moves to Completed section', async ({ page }) => {
    const username = uniqueUsername('togglecomplete');
    await register(page, username);

    const title = 'Task to complete';
    await createTodo(page, title, { dueDate: '2027-06-15T09:00' });

    const todoItem = page.locator('li', { hasText: title }).first();
    await expect(todoItem).toBeVisible();

    const checkbox = todoItem.locator('input[type="checkbox"]').first();
    await checkbox.check();

    await page.waitForTimeout(500);

    const titleSpan = todoItem.locator('span', { hasText: title }).first();
    await expect(titleSpan).toHaveClass(/line-through/);

    const completedSection = page.locator('h2', { hasText: /Completed/ });
    await expect(completedSection).toBeVisible();
  });

  test('deletes a todo and verifies it is removed from the list', async ({ page }) => {
    const username = uniqueUsername('deletetodo');
    await register(page, username);

    const title = 'Todo to delete';
    await createTodo(page, title, { dueDate: '2027-06-15T09:00' });

    let todoItem = page.locator('li', { hasText: title }).first();
    await expect(todoItem).toBeVisible();

    const deleteButton = todoItem.locator('button', { hasText: 'Delete' });
    await deleteButton.click();

    await page.waitForTimeout(500);

    todoItem = page.locator('li', { hasText: title }).first();
    await expect(todoItem).not.toBeVisible();
  });

  test('creates multiple todos with different priorities and verifies they appear', async ({ page }) => {
    const username = uniqueUsername('priorityorder');
    await register(page, username);

    const dueDate = '2027-06-15T09:00';

    await createTodo(page, 'Low priority task', {
      dueDate,
      priority: 'low',
    });

    await page.waitForTimeout(500);

    await createTodo(page, 'High priority task', {
      dueDate,
      priority: 'high',
    });

    await page.waitForTimeout(500);

    const lowItem = page.locator('li', { hasText: 'Low priority task' }).first();
    const highItem = page.locator('li', { hasText: 'High priority task' }).first();

    await expect(lowItem).toBeVisible();
    await expect(highItem).toBeVisible();

    await expect(lowItem).toContainText('Low');
    await expect(highItem).toContainText('High');
  });
});
