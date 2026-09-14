import type { Page } from '@playwright/test';

export async function sessionControl(page: Page, name: string) {
  const accessibleName = name.replace(/\bview$/, 'View');
  await page.getByRole('button', { name: accessibleName, exact: true }).click();
}
