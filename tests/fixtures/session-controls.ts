import type { Page } from '@playwright/test';

export async function sessionControl(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}
