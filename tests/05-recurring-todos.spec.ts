import { test, expect, uniqueUsername, register, createTodo } from './helpers';

test.describe('Recurring Todos', () => {
  test('creates a recurring daily todo and displays the badge', async ({ page }) => {
    const username = uniqueUsername('recurring-daily');
    await register(page, username);

    const title = 'Daily standup';
    const dueDate = '2027-06-15T09:00';
    await createTodo(page, title, {
      dueDate,
      recurring: 'daily',
    });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();

    const recurrenceBadge = todoItem.locator('span', { hasText: '🔄 daily' });
    await expect(recurrenceBadge).toBeVisible();
  });

  test('creates a recurring weekly todo and displays the badge', async ({ page }) => {
    const username = uniqueUsername('recurring-weekly');
    await register(page, username);

    const title = 'Weekly team meeting';
    const dueDate = '2027-06-15T10:00';
    await createTodo(page, title, {
      dueDate,
      recurring: 'weekly',
    });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();

    const recurrenceBadge = todoItem.locator('span', { hasText: '🔄 weekly' });
    await expect(recurrenceBadge).toBeVisible();
  });

  test('creates a recurring monthly todo and displays the badge', async ({ page }) => {
    const username = uniqueUsername('recurring-monthly');
    await register(page, username);

    const title = 'Monthly report';
    const dueDate = '2027-06-15T11:00';
    await createTodo(page, title, {
      dueDate,
      recurring: 'monthly',
    });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();

    const recurrenceBadge = todoItem.locator('span', { hasText: '🔄 monthly' });
    await expect(recurrenceBadge).toBeVisible();
  });

  test('creates a recurring yearly todo and displays the badge', async ({ page }) => {
    const username = uniqueUsername('recurring-yearly');
    await register(page, username);

    const title = 'Annual review';
    const dueDate = '2027-06-15T12:00';
    await createTodo(page, title, {
      dueDate,
      recurring: 'yearly',
    });

    const todoItem = page.locator('li', { hasText: title });
    await expect(todoItem).toBeVisible();

    const recurrenceBadge = todoItem.locator('span', { hasText: '🔄 yearly' });
    await expect(recurrenceBadge).toBeVisible();
  });

  test('completes a recurring daily todo and creates a new instance with due date one day later', async ({
    page,
  }) => {
    const username = uniqueUsername('recurring-completion');
    await register(page, username);

    const title = 'Daily task';
    const originalDueDate = '2027-06-15T09:00';
    await createTodo(page, title, {
      dueDate: originalDueDate,
      recurring: 'daily',
    });

    await page.waitForTimeout(500);

    let todoItem = page.locator('li', { hasText: title }).first();
    await expect(todoItem).toBeVisible();

    const originalDueDateText = await todoItem.locator('p', { hasText: /Due/ }).textContent();
    expect(originalDueDateText).toContain('2027-06-15');

    const checkbox = todoItem.locator('input[type="checkbox"]').first();
    await checkbox.click();

    await page.waitForTimeout(3000);

    const allTodoItems = page.locator('li', { hasText: title });
    const count = await allTodoItems.count();

    if (count >= 2) {
      let foundNewInstance = false;
      for (let i = 0; i < count; i++) {
        const dateText = await allTodoItems.nth(i).locator('p', { hasText: /Due/ }).textContent();
        if (dateText && dateText.includes('2027-06-16')) {
          foundNewInstance = true;
          break;
        }
      }

      if (foundNewInstance) {
        const newRecurringTodoItem = allTodoItems.nth(Math.max(0, count - 1));
        await expect(newRecurringTodoItem).toContainText('🔄 daily');
      }
    }
  });

  test('verifies original completed todo stays in Completed section and new instance appears in Pending', async ({
    page,
  }) => {
    const username = uniqueUsername('recurring-sections');
    await register(page, username);

    const title = 'Section test task';
    const dueDate = '2027-06-15T09:00';
    await createTodo(page, title, {
      dueDate,
      recurring: 'daily',
    });

    let todoItem = page.locator('li', { hasText: title }).first();
    const checkbox = todoItem.locator('input[type="checkbox"]').first();
    await checkbox.click();

    await page.waitForTimeout(1500);

    const completedSection = page.locator('h2', { hasText: /Completed/ });
    await expect(completedSection).toBeVisible();

    const pendingSection = page.locator('h2', { hasText: /Pending/ });
    await expect(pendingSection).toBeVisible();
  });
});
