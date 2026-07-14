import { Page } from '@playwright/test';

export class TodoHelper {
  constructor(private page: Page) {}

  async registerUser(username: string) {
    await this.page.goto('/login');
    await this.page.fill('input[type="text"]', username);

    // Set up virtual authenticator via CDP
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('WebAuthn.enable');
    await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });

    await this.page.click('button:has-text("Register")');
    await this.page.waitForURL('/');
  }

  async loginUser(username: string) {
    await this.page.goto('/login');
    await this.page.fill('input[type="text"]', username);

    const client = await this.page.context().newCDPSession(this.page);
    await client.send('WebAuthn.enable');
    await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });

    await this.page.click('button:has-text("Login")');
    await this.page.waitForURL('/');
  }

  async createTodo(title: string, options?: { priority?: string; dueDate?: string }) {
    await this.page.fill('input[placeholder="What needs to be done?"]', title);

    if (options?.priority) {
      await this.page.selectOption('form select', options.priority);
    }

    if (options?.dueDate) {
      await this.page.fill('input[type="datetime-local"]', options.dueDate);
    }

    await this.page.click('button:has-text("Add")');
  }

  async getTodoCount() {
    return this.page.locator('li').count();
  }
}
