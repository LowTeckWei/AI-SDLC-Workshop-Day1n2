import { test, expect, uniqueUsername, register, createTodo, addSubtask } from './helpers';

test.describe('Subtasks', () => {
  test('creates a todo and verifies no subtask progress UI is shown initially', async ({ page }) => {
    const username = uniqueUsername('subtask');
    await register(page, username);

    await createTodo(page, 'Todo with no subtasks');

    const todoItem = page.locator('li', { hasText: 'Todo with no subtasks' });
    await expect(todoItem).toBeVisible();

    // Verify no subtask progress text is shown (title itself contains the word
    // "subtasks" nowhere, but be precise and match the "X/Y subtasks" pattern)
    await expect(todoItem.getByText(/\d+\/\d+ subtasks/)).not.toBeVisible();

    // Verify no progress bar is shown
    await expect(todoItem.locator('div.bg-blue-500, div.bg-green-500')).toHaveCount(0);
  });

  test('adds a subtask via input and enter key', async ({ page }) => {
    const username = uniqueUsername('subtask-add');
    await register(page, username);

    await createTodo(page, 'Todo for subtasks');

    // Add a subtask using the helper (which uses Enter key)
    await addSubtask(page, 'Todo for subtasks', 'First subtask');

    const todoItem = page.locator('li', { hasText: 'Todo for subtasks' });

    // Verify subtask appears in the list
    await expect(todoItem.getByText('First subtask')).toBeVisible();

    // Verify progress shows "0/1 subtasks"
    await expect(todoItem.getByText('0/1 subtasks')).toBeVisible();

    // Verify progress bar is blue (incomplete). Note: at 0% completion the bar
    // has zero width, so it has no visible bounding box — assert presence in
    // the DOM instead of visual visibility.
    await expect(todoItem.locator('div.bg-blue-500')).toBeAttached();
  });

  test('toggles subtask complete and verifies progress updates', async ({ page }) => {
    const username = uniqueUsername('subtask-complete');
    await register(page, username);

    await createTodo(page, 'Todo with one subtask');
    await addSubtask(page, 'Todo with one subtask', 'Test subtask');

    const todoItem = page.locator('li', { hasText: 'Todo with one subtask' });

    // Initially progress shows "0/1 subtasks" with blue bar (zero width at 0%,
    // so check DOM presence rather than visual visibility)
    await expect(todoItem.getByText('0/1 subtasks')).toBeVisible();
    const blueBar = todoItem.locator('div.bg-blue-500');
    await expect(blueBar).toBeAttached();

    // Toggle the subtask complete
    const subtaskCheckbox = todoItem.locator('input[type="checkbox"]').nth(1); // second checkbox (first is todo)
    await subtaskCheckbox.click();

    // Wait for progress to update to "1/1 subtasks"
    await expect(todoItem.getByText('1/1 subtasks')).toBeVisible();

    // Verify progress bar is now green (100% complete)
    const greenBar = todoItem.locator('div.bg-green-500');
    await expect(greenBar).toBeVisible();

    // Blue bar should no longer be present
    await expect(todoItem.locator('div.bg-blue-500')).toHaveCount(0);
  });

  test('adds multiple subtasks and verifies progress count', async ({ page }) => {
    const username = uniqueUsername('subtask-multiple');
    await register(page, username);

    await createTodo(page, 'Todo with multiple subtasks');
    await addSubtask(page, 'Todo with multiple subtasks', 'First subtask');

    const todoItem = page.locator('li', { hasText: 'Todo with multiple subtasks' });
    // Wait for the first subtask add to fully round-trip (server refetch)
    // before adding the second one, to avoid a race where the draft-input
    // reset from the first submission clobbers the second submission's text.
    await expect(todoItem.getByText('0/1 subtasks')).toBeVisible();
    await expect(todoItem.getByText('First subtask')).toBeVisible();

    // Add second subtask
    await addSubtask(page, 'Todo with multiple subtasks', 'Second subtask');

    // Progress should now show "0/2 subtasks"
    await expect(todoItem.getByText('0/2 subtasks')).toBeVisible();

    // Verify both subtasks appear
    await expect(todoItem.getByText('First subtask')).toBeVisible();
    await expect(todoItem.getByText('Second subtask')).toBeVisible();
  });

  test('deletes a subtask and verifies progress updates', async ({ page }) => {
    const username = uniqueUsername('subtask-delete');
    await register(page, username);

    await createTodo(page, 'Todo for deletion test');

    const todoItem = page.locator('li', { hasText: 'Todo for deletion test' });

    await addSubtask(page, 'Todo for deletion test', 'Subtask to delete');
    await expect(todoItem.getByText('0/1 subtasks')).toBeVisible();

    await addSubtask(page, 'Todo for deletion test', 'Subtask to keep');
    await expect(todoItem.getByText('0/2 subtasks')).toBeVisible();

    // Delete the first subtask by clicking the × button
    const subtaskToDelete = todoItem.locator('ul li', { hasText: 'Subtask to delete' });
    await subtaskToDelete.getByRole('button', { name: 'Delete subtask' }).click();

    // Verify the deleted subtask is gone
    await expect(todoItem.getByText('Subtask to delete')).not.toBeVisible();

    // Verify the kept subtask remains
    await expect(todoItem.getByText('Subtask to keep')).toBeVisible();

    // Verify progress updated to "0/1 subtasks"
    await expect(todoItem.getByText('0/1 subtasks')).toBeVisible();
  });

  test('completes one subtask of two and verifies progress bar remains blue', async ({ page }) => {
    const username = uniqueUsername('subtask-partial');
    await register(page, username);

    await createTodo(page, 'Todo with partial completion');

    const todoItem = page.locator('li', { hasText: 'Todo with partial completion' });

    await addSubtask(page, 'Todo with partial completion', 'First subtask');
    await expect(todoItem.getByText('0/1 subtasks')).toBeVisible();

    await addSubtask(page, 'Todo with partial completion', 'Second subtask');
    await expect(todoItem.getByText('0/2 subtasks')).toBeVisible();

    // Complete first subtask only
    const firstSubtaskRow = todoItem.locator('ul li', { hasText: 'First subtask' });
    await firstSubtaskRow.locator('input[type="checkbox"]').click();

    // Progress should show "1/2 subtasks"
    await expect(todoItem.getByText('1/2 subtasks')).toBeVisible();

    // Progress bar should be blue (not 100% complete; width is non-zero here
    // since percent = 50%, so visual visibility is fine)
    await expect(todoItem.locator('div.bg-blue-500')).toBeVisible();

    // No green bar yet
    await expect(todoItem.locator('div.bg-green-500')).toHaveCount(0);
  });
});
