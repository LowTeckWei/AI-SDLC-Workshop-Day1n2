import { test, expect, uniqueUsername, register, createTodo } from './helpers';

test.describe('Calendar', () => {
  test('loads with a month heading and a 7-column grid', async ({ page }) => {
    const username = uniqueUsername('cal-load');
    await register(page, username);

    await page.goto('/calendar');

    await expect(page.getByRole('heading', { level: 2 })).toHaveText(/^[A-Z][a-z]+ \d{4}$/);
    for (const label of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('Next and Prev buttons update the URL month param and heading', async ({ page }) => {
    const username = uniqueUsername('cal-nav');
    await register(page, username);

    await page.goto('/calendar?month=2026-07');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('July 2026');

    await page.getByRole('button', { name: 'Next →' }).click();
    await expect(page).toHaveURL(/month=2026-08/);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('August 2026');

    await page.getByRole('button', { name: '← Prev' }).click();
    await expect(page).toHaveURL(/month=2026-07/);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('July 2026');

    await page.getByRole('button', { name: '← Prev' }).click();
    await expect(page).toHaveURL(/month=2026-06/);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('June 2026');
  });

  test('shows a todo on its due day and opens the day modal', async ({ page }) => {
    const username = uniqueUsername('cal-todo');
    await register(page, username);

    const todoTitle = `Calendar todo ${Date.now()}`;
    await createTodo(page, todoTitle, { dueDate: '2027-03-20T09:00', priority: 'high' });
    await expect(page.locator('li', { hasText: todoTitle }).first()).toBeVisible();

    await page.goto('/calendar?month=2027-03');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('March 2027');

    const dayCell = page.getByRole('button', { name: new RegExp(`^20.*${todoTitle}`, 's') });
    await expect(dayCell).toBeVisible();
    await expect(dayCell.getByText(todoTitle)).toBeVisible();

    await dayCell.click();

    const modalHeading = page.getByRole('heading', { name: '2027-03-20' });
    await expect(modalHeading).toBeVisible();
    await expect(page.locator('li', { hasText: todoTitle })).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(modalHeading).not.toBeVisible();
  });
});
