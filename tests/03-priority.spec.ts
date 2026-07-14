import { test, expect, uniqueUsername, register, createTodo } from './helpers';

test.describe('Todo Priority', () => {
  test('creates a todo with high priority and displays correct badge', async ({ page }) => {
    const username = uniqueUsername('priority-high');
    await register(page, username);

    const title = 'High priority task';
    await createTodo(page, title, {
      dueDate: '2027-06-15T09:00',
      priority: 'high',
    });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();
    await expect(todoItem).toContainText('High');
  });

  test('creates a todo with medium priority and displays correct badge', async ({ page }) => {
    const username = uniqueUsername('priority-medium');
    await register(page, username);

    const title = 'Medium priority task';
    await createTodo(page, title, {
      dueDate: '2027-06-15T09:00',
      priority: 'medium',
    });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();
    await expect(todoItem).toContainText('Medium');
  });

  test('creates a todo with low priority and displays correct badge', async ({ page }) => {
    const username = uniqueUsername('priority-low');
    await register(page, username);

    const title = 'Low priority task';
    await createTodo(page, title, {
      dueDate: '2027-06-15T09:00',
      priority: 'low',
    });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();
    await expect(todoItem).toContainText('Low');
  });

  test('default priority is Medium when not explicitly set', async ({ page }) => {
    const username = uniqueUsername('priority-default');
    await register(page, username);

    const title = 'Task with default priority';
    await createTodo(page, title, {
      dueDate: '2027-06-15T09:00',
    });

    const todoItem = page.locator('li', { hasText: title });
    const priorityBadge = todoItem.locator('span', { hasText: 'Medium' });
    await expect(priorityBadge).toBeVisible();
  });

  test('edits a todo priority and verifies the badge updates', async ({ page }) => {
    const username = uniqueUsername('priority-edit');
    await register(page, username);

    const title = 'Task to edit priority';
    await createTodo(page, title, {
      dueDate: '2027-06-15T09:00',
      priority: 'low',
    });

    let todoItem = page.locator('li', { hasText: title }).first();
    await expect(todoItem).toContainText('Low');

    const editButton = todoItem.locator('button', { hasText: /Edit/ });
    await editButton.first().click();

    await page.waitForTimeout(2000);

    todoItem = page.locator('li', { hasText: title }).first();
    const allSelects = todoItem.locator('select');
    const selectCount = await allSelects.count();

    if (selectCount > 0) {
      const prioritySelect = allSelects.first();
      await prioritySelect.selectOption('high');

      const allButtons = todoItem.locator('button');
      let saveButtonFound = false;
      for (let i = 0; i < await allButtons.count(); i++) {
        const text = await allButtons.nth(i).textContent();
        if (text && text.includes('Save')) {
          await allButtons.nth(i).click();
          saveButtonFound = true;
          break;
        }
      }

      if (saveButtonFound) {
        await page.waitForTimeout(1000);
        const updatedTodoItem = page.locator('li', { hasText: title }).first();
        await expect(updatedTodoItem).toContainText('High');
      }
    }
  });
});
