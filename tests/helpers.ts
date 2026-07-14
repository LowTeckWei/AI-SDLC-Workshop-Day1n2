import { test as base, expect, type Page } from '@playwright/test';

interface Fixtures {
  authenticatorId: string;
}

export const test = base.extend<Fixtures>({
  authenticatorId: [
    // eslint-disable-next-line no-empty-pattern
    async ({ context, page }, use) => {
      const client = await context.newCDPSession(page);
      await client.send('WebAuthn.enable');
      const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
        options: {
          protocol: 'ctap2',
          transport: 'internal',
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      });

      await use(authenticatorId);

      await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    },
    { auto: true },
  ],
});

export { expect };

export function uniqueUsername(prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

/** Registers a brand-new passkey user and lands on the authenticated home page. */
export async function register(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByRole('button', { name: /Register with Passkey/i }).click();
  await page.waitForURL('/');
}

/** Logs in an existing passkey user and lands on the authenticated home page. */
export async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByRole('button', { name: /Log In with Passkey/i }).click();
  await page.waitForURL('/');
}

export interface CreateTodoOptions {
  dueDate?: string; // datetime-local value, e.g. "2026-12-31T09:00"
  priority?: 'high' | 'medium' | 'low';
  recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderLabel?: string; // visible option text, e.g. "1 hour before"
}

/** Fills and submits the new-todo form on the home page. */
export async function createTodo(page: Page, title: string, options: CreateTodoOptions = {}): Promise<void> {
  await page.getByPlaceholder('What needs to be done?').fill(title);

  if (options.dueDate) {
    await page.locator('input[type="datetime-local"]').first().fill(options.dueDate);
  }
  if (options.priority) {
    await page.locator('form', { hasText: 'Add Todo' }).locator('select').first().selectOption(options.priority);
  }
  if (options.recurring) {
    await page.getByLabel('Recurring').first().check();
    await page
      .locator('form', { hasText: 'Add Todo' })
      .locator('select')
      .nth(1)
      .selectOption(options.recurring);
  }
  if (options.reminderLabel) {
    await page
      .locator('form', { hasText: 'Add Todo' })
      .getByRole('combobox')
      .filter({ hasText: 'No reminder' })
      .selectOption({ label: options.reminderLabel });
  }

  await page.getByRole('button', { name: 'Add Todo' }).click();
}

/** Adds a subtask to the todo list item containing the given title. */
export async function addSubtask(page: Page, todoTitle: string, subtaskTitle: string): Promise<void> {
  const todoItem = page.locator('li', { hasText: todoTitle }).first();
  await todoItem.getByPlaceholder('Add subtask').fill(subtaskTitle);
  await todoItem.getByPlaceholder('Add subtask').press('Enter');
}

/** Creates a tag via the Manage Tags modal, then closes the modal. */
export async function createTag(page: Page, name: string, color = '#3b82f6'): Promise<void> {
  await page.getByRole('button', { name: 'Manage Tags' }).click();
  await page.getByPlaceholder('Tag name').fill(name);
  await page.locator('input[type="color"]').first().fill(color);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Close' }).click();
}

export interface CreateTemplateOptions {
  subtasks?: string[];
}

/** Creates a template via the Templates modal, leaving the modal open. */
export async function createTemplate(
  page: Page,
  name: string,
  titleTemplate: string,
  options: CreateTemplateOptions = {}
): Promise<void> {
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByPlaceholder('Template name').fill(name);
  await page.getByPlaceholder('Todo title').fill(titleTemplate);

  for (const subtask of options.subtasks ?? []) {
    await page.getByPlaceholder('Subtask title').fill(subtask);
    await page.getByRole('button', { name: 'Add subtask' }).click();
  }

  await page.getByRole('button', { name: 'Create Template' }).click();
}
