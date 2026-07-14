import fs from 'fs';
import path from 'path';
import { test, expect, uniqueUsername, register, createTodo } from './helpers';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function buildImportFixture(todoTitle: string, subtaskTitle: string, tagName: string) {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    todos: [
      {
        title: todoTitle,
        completed: false,
        due_date: null,
        priority: 'medium',
        is_recurring: false,
        recurrence_pattern: null,
        reminder_minutes: null,
        subtasks: [{ title: subtaskTitle, completed: false, position: 0 }],
        tags: [{ name: tagName, color: '#3b82f6' }],
      },
    ],
  };
}

test.describe('Export and import', () => {
  test('exports todos as JSON with a dated filename', async ({ page }) => {
    const username = uniqueUsername('export-json');
    await register(page, username);
    await createTodo(page, `Export me JSON ${Date.now()}`, { priority: 'medium' });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export JSON' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^todos-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test('exports todos as CSV with a dated filename', async ({ page }) => {
    const username = uniqueUsername('export-csv');
    await register(page, username);
    await createTodo(page, `Export me CSV ${Date.now()}`, { priority: 'medium' });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^todos-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('imports a JSON fixture and shows the todo with its subtask and tag', async ({ page }) => {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });

    const suffix = Date.now();
    const todoTitle = `Imported todo ${suffix}`;
    const subtaskTitle = `Imported subtask ${suffix}`;
    const tagName = `imported-tag-${suffix}`;

    const fixturePath = path.join(FIXTURES_DIR, `import-${suffix}.json`);
    fs.writeFileSync(fixturePath, JSON.stringify(buildImportFixture(todoTitle, subtaskTitle, tagName)));

    const username = uniqueUsername('import');
    await register(page, username);

    await page.getByRole('button', { name: 'Import' }).click();
    await page.locator('input[type="file"]').setInputFiles(fixturePath);

    const todoItem = page.locator('li', { hasText: todoTitle }).first();
    await expect(todoItem).toBeVisible();
    await expect(todoItem.getByText(subtaskTitle)).toBeVisible();
    await expect(todoItem.getByText(tagName)).toBeVisible();

    fs.rmSync(fixturePath, { force: true });
  });
});
