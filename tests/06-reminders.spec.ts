import { test, expect, uniqueUsername, register, createTodo } from './helpers';

test.describe('Reminders', () => {
  test('creates a todo without a due date and verifies reminder select is disabled', async ({ page }) => {
    const username = uniqueUsername('reminder');
    await register(page, username);

    // Create a todo without a due date
    await page.getByPlaceholder('What needs to be done?').fill('No due date todo');

    // Verify reminder select is disabled
    const reminderSelect = page
      .locator('form', { hasText: 'Add Todo' })
      .getByRole('combobox')
      .filter({ hasText: 'No reminder' });
    await expect(reminderSelect).toBeDisabled();

    await page.getByRole('button', { name: 'Add Todo' }).click();
  });

  test('creates a todo with a due date and sets a reminder', async ({ page }) => {
    const username = uniqueUsername('reminder-with-date');
    await register(page, username);

    // Create a todo with a due date and reminder
    await createTodo(page, 'Important meeting', {
      dueDate: '2027-06-15T09:00',
      reminderLabel: '1 hour before',
    });

    // Verify the todo appears with reminder badge
    const todoItem = page.locator('li', { hasText: 'Important meeting' });
    await expect(todoItem).toBeVisible();
    await expect(todoItem.getByText('🔔 1h')).toBeVisible();
  });

  test('creates a todo with a due date but no reminder selected', async ({ page }) => {
    const username = uniqueUsername('reminder-none');
    await register(page, username);

    // Create a todo with a due date but don't select a reminder
    await createTodo(page, 'Todo with no reminder', {
      dueDate: '2027-06-15T09:00',
    });

    // Verify the todo appears without reminder badge
    const todoItem = page.locator('li', { hasText: 'Todo with no reminder' });
    await expect(todoItem).toBeVisible();
    await expect(todoItem.getByText(/🔔/)).not.toBeVisible();
  });

  test('enables reminder select when due date is set', async ({ page }) => {
    const username = uniqueUsername('reminder-enable');
    await register(page, username);

    const reminderSelect = page
      .locator('form', { hasText: 'Add Todo' })
      .getByRole('combobox')
      .filter({ hasText: 'No reminder' });

    // Initially disabled (no due date)
    await expect(reminderSelect).toBeDisabled();

    // Set a due date
    await page.locator('input[type="datetime-local"]').first().fill('2027-06-15T09:00');

    // Now should be enabled
    await expect(reminderSelect).toBeEnabled();
  });

  test('verifies all reminder label formats', async ({ page }) => {
    const username = uniqueUsername('reminder-formats');
    await register(page, username);

    // Test each reminder format
    const reminderTests = [
      { label: '15 minutes before', expectedBadge: '🔔 15m' },
      { label: '30 minutes before', expectedBadge: '🔔 30m' },
      { label: '1 hour before', expectedBadge: '🔔 1h' },
      { label: '2 hours before', expectedBadge: '🔔 2h' },
      { label: '1 day before', expectedBadge: '🔔 1d' },
      { label: '2 days before', expectedBadge: '🔔 2d' },
      { label: '1 week before', expectedBadge: '🔔 1w' },
    ];

    for (let i = 0; i < reminderTests.length; i++) {
      const { label, expectedBadge } = reminderTests[i];
      const title = `Todo reminder ${i + 1}`;
      await createTodo(page, title, {
        dueDate: `2027-06-${15 + i}T09:00`,
        reminderLabel: label,
      });
      // Wait for the todo to appear (and the form to finish its async reset)
      // before creating the next one, to avoid a race where the form reset
      // from this submission clobbers the next submission's field values.
      await expect(page.locator('li', { hasText: title }).getByText(expectedBadge)).toBeVisible();
    }
  });
});
