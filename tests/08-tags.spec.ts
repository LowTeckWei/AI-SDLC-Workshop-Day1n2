import { test, expect, uniqueUsername, register, createTodo, createTag } from './helpers';

test.describe('Tags', () => {
  test('creates a tag and verifies it appears in the Manage Tags modal', async ({ page }) => {
    const username = uniqueUsername('tag-create');
    await register(page, username);

    const tagName = `Urgent-${Date.now()}`;
    await createTag(page, tagName, '#ff0000');

    // Reopen the Manage Tags modal to verify the tag persisted.
    // The tag list renders each name in an <input defaultValue={tag.name}>,
    // so match on the rendered "value" attribute rather than text content
    // (form control values are not part of an element's text content).
    await page.getByRole('button', { name: 'Manage Tags' }).click();
    await expect(page.locator(`input[value="${tagName}"]`)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('attaches a tag to a todo via the +tagname button', async ({ page }) => {
    const username = uniqueUsername('tag-attach');
    await register(page, username);

    const tagName = `Work-${Date.now()}`;
    await createTag(page, tagName, '#3b82f6');

    await createTodo(page, 'Todo needing a tag');

    const todoItem = page.locator('li', { hasText: 'Todo needing a tag' });
    await expect(todoItem).toBeVisible();

    // Click the "+ tagname" button to attach the tag
    await todoItem.getByRole('button', { name: `+ ${tagName}` }).click();

    // Verify the tag badge now appears on the todo. The badge <span> contains
    // both the tag name and a "×" remove button, so its combined text is
    // "TagName×" — match without `exact` (substring match).
    await expect(todoItem.getByText(tagName)).toBeVisible();
  });

  test('detaches a tag from a todo but keeps it in the global tag list', async ({ page }) => {
    const username = uniqueUsername('tag-detach');
    await register(page, username);

    const tagName = `Personal-${Date.now()}`;
    await createTag(page, tagName, '#22c55e');

    await createTodo(page, 'Todo to detach tag from');

    const todoItem = page.locator('li', { hasText: 'Todo to detach tag from' });
    await todoItem.getByRole('button', { name: `+ ${tagName}` }).click();

    // Verify tag badge attached
    await expect(todoItem.getByText(tagName)).toBeVisible();

    // Detach the tag by clicking the "×" remove button
    await todoItem.getByRole('button', { name: `Remove ${tagName}` }).click();

    // Verify tag badge removed from todo, but "+ tagname" button reappears
    await expect(todoItem.getByRole('button', { name: `+ ${tagName}` })).toBeVisible();

    // Reopen Manage Tags to confirm tag still exists globally
    await page.getByRole('button', { name: 'Manage Tags' }).click();
    await expect(page.locator(`input[value="${tagName}"]`)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('renames a tag via the Manage Tags modal', async ({ page }) => {
    const username = uniqueUsername('tag-rename');
    await register(page, username);

    const originalName = `Old-${Date.now()}`;
    const newName = `New-${Date.now()}`;
    await createTag(page, originalName, '#a855f7');

    await page.getByRole('button', { name: 'Manage Tags' }).click();
    const nameInput = page.locator(`input[value="${originalName}"]`);
    await nameInput.fill(newName);
    await nameInput.blur();

    // Verify new name appears
    await expect(page.locator(`input[value="${newName}"]`)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('deletes a tag via the Manage Tags modal', async ({ page }) => {
    const username = uniqueUsername('tag-delete');
    await register(page, username);

    const tagName = `ToDelete-${Date.now()}`;
    await createTag(page, tagName, '#eab308');

    await page.getByRole('button', { name: 'Manage Tags' }).click();
    await expect(page.locator(`input[value="${tagName}"]`)).toBeVisible();

    // Find the tag's list item and click its Delete button
    const tagRow = page.locator('li').filter({ has: page.locator(`input[value="${tagName}"]`) });
    await tagRow.getByRole('button', { name: 'Delete' }).click();

    // Verify the tag no longer appears in the modal's tag list
    await expect(page.locator(`input[value="${tagName}"]`)).not.toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });
});
