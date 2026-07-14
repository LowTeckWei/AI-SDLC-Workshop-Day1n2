import { test, expect, uniqueUsername, register, createTodo, type CreateTodoOptions } from './helpers';
import type { Page } from '@playwright/test';

async function createThreeTodos(page: Page, suffix: string) {
  const milk = `Buy milk ${suffix}`;
  const report = `Write report ${suffix}`;
  const bread = `Buy bread ${suffix}`;

  // Each createTodo submission is async (POST + reload) and resets the form
  // afterwards; wait for each todo to land before typing the next title,
  // otherwise the in-flight form reset can wipe the next title before submit.
  await createTodo(page, milk, { priority: 'high' });
  await expect(page.locator('li', { hasText: milk })).toBeVisible();
  await createTodo(page, report, { priority: 'medium' });
  await expect(page.locator('li', { hasText: report })).toBeVisible();
  await createTodo(page, bread, { priority: 'low' });
  await expect(page.locator('li', { hasText: bread })).toBeVisible();

  return { milk, report, bread };
}

function prioritySelect(page: Page) {
  return page.locator('select').filter({ has: page.locator('option', { hasText: 'All priorities' }) });
}

function completionSelect(page: Page) {
  return page.locator('select').filter({ has: page.locator('option', { hasText: /^All$/ }) });
}

async function resetFilters(page: Page) {
  await page.getByPlaceholder('Search todos...').fill('');
  await prioritySelect(page).selectOption('');
  await completionSelect(page).selectOption('all');
  await page.waitForTimeout(400); // let debounced search clear settle
}

test.describe('Search and filtering', () => {
  test('search input filters todos by title substring', async ({ page }) => {
    const username = uniqueUsername('search');
    await register(page, username);
    const suffix = Date.now().toString();
    const { milk, report, bread } = await createThreeTodos(page, suffix);

    await page.getByPlaceholder('Search todos...').fill('Buy');
    await page.waitForTimeout(400);

    await expect(page.locator('li', { hasText: milk })).toBeVisible();
    await expect(page.locator('li', { hasText: bread })).toBeVisible();
    await expect(page.locator('li', { hasText: report })).not.toBeVisible();
  });

  test('priority filter shows only matching-priority todos', async ({ page }) => {
    const username = uniqueUsername('priority');
    await register(page, username);
    const suffix = Date.now().toString();
    const { milk, report, bread } = await createThreeTodos(page, suffix);

    await prioritySelect(page).selectOption('high');

    await expect(page.locator('li', { hasText: milk })).toBeVisible();
    await expect(page.locator('li', { hasText: report })).not.toBeVisible();
    await expect(page.locator('li', { hasText: bread })).not.toBeVisible();
  });

  test('completion filter shows only completed todos', async ({ page }) => {
    const username = uniqueUsername('completion');
    await register(page, username);
    const suffix = Date.now().toString();
    const { milk, report, bread } = await createThreeTodos(page, suffix);

    const milkItem = page.locator('li', { hasText: milk }).first();
    await milkItem.locator('input[type="checkbox"]').first().check();
    await expect(milkItem.locator('span.line-through', { hasText: milk })).toBeVisible();

    await completionSelect(page).selectOption('completed');

    await expect(page.locator('li', { hasText: milk })).toBeVisible();
    await expect(page.locator('li', { hasText: report })).not.toBeVisible();
    await expect(page.locator('li', { hasText: bread })).not.toBeVisible();
  });

  test('saves a filter preset and re-applies it after resetting', async ({ page }) => {
    const username = uniqueUsername('preset');
    await register(page, username);
    const suffix = Date.now().toString();
    const { milk, report, bread } = await createThreeTodos(page, suffix);

    await prioritySelect(page).selectOption('high');
    await expect(page.locator('li', { hasText: milk })).toBeVisible();
    await expect(page.locator('li', { hasText: report })).not.toBeVisible();

    const presetName = `High priority ${suffix}`;
    await page.getByPlaceholder('Preset name').fill(presetName);
    await page.getByRole('button', { name: 'Save preset' }).click();

    await expect(page.getByRole('button', { name: presetName })).toBeVisible();

    await resetFilters(page);
    await expect(page.locator('li', { hasText: report })).toBeVisible();
    await expect(page.locator('li', { hasText: bread })).toBeVisible();

    await page.getByRole('button', { name: presetName }).click();

    await expect(prioritySelect(page)).toHaveValue('high');
    await expect(page.locator('li', { hasText: milk })).toBeVisible();
    await expect(page.locator('li', { hasText: report })).not.toBeVisible();
    await expect(page.locator('li', { hasText: bread })).not.toBeVisible();
  });
});
