import { test, expect, uniqueUsername, register, createTemplate } from './helpers';

test.describe('Templates', () => {
  test('creates a template and shows it in the templates list', async ({ page }) => {
    const username = uniqueUsername('tmpl-create');
    await register(page, username);

    const templateName = `Weekly Review ${Date.now()}`;
    await createTemplate(page, templateName, 'Do the weekly review', {
      subtasks: ['Check inbox', 'Plan next week'],
    });

    // createTemplate leaves the modal open; the new template should be listed.
    await expect(page.getByText(templateName, { exact: true })).toBeVisible();

    // Close and reopen the modal to confirm persistence.
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Templates' }).click();
    await expect(page.getByText(templateName, { exact: true })).toBeVisible();
  });

  test('uses a template to create a todo with its subtasks copied over', async ({ page }) => {
    const username = uniqueUsername('tmpl-use');
    await register(page, username);

    const templateName = `Onboarding ${Date.now()}`;
    const todoTitle = `Onboard new hire ${Date.now()}`;
    await createTemplate(page, templateName, todoTitle, {
      subtasks: ['Send welcome email', 'Set up laptop'],
    });

    const templateRow = page.locator('li', { hasText: templateName });
    await templateRow.getByRole('button', { name: 'Use' }).click();

    await page.getByRole('button', { name: 'Close' }).click();

    const todoItem = page.locator('li', { hasText: todoTitle }).first();
    await expect(todoItem).toBeVisible();
    await expect(todoItem.getByText('Send welcome email')).toBeVisible();
    await expect(todoItem.getByText('Set up laptop')).toBeVisible();
  });

  test('deleting a template does not affect todos already created from it', async ({ page }) => {
    const username = uniqueUsername('tmpl-del');
    await register(page, username);

    const templateName = `Cleanup Routine ${Date.now()}`;
    const todoTitle = `Run cleanup ${Date.now()}`;
    await createTemplate(page, templateName, todoTitle, { subtasks: ['Sweep floor'] });

    const templateRow = page.locator('li', { hasText: templateName });
    await templateRow.getByRole('button', { name: 'Use' }).click();

    // Delete the template while the modal is still open.
    await expect(page.locator('li', { hasText: templateName })).toBeVisible();
    await page.locator('li', { hasText: templateName }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(templateName, { exact: true })).not.toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();

    // The todo created from the (now-deleted) template must still exist.
    await expect(page.locator('li', { hasText: todoTitle }).first()).toBeVisible();
  });
});
