import type { Page } from '@playwright/test';

export async function openView(page: Page) {
  if (!(await page.locator('#viewMenu').isVisible()))
    await page.locator('#viewTrigger').click();
}

export async function sessionControl(page: Page, name: string) {
  await openView(page);
  await page.getByRole('button', { name, exact: true }).click();
  if (await page.locator('#viewMenu').isVisible())
    await page.getByRole('button', { name: 'Close view menu' }).click();
}

export async function teacherDetails(page: Page, checked: boolean) {
  const optionsOpen = await page.locator('#behaviorSettings').isVisible();
  await openView(page);
  await page.getByLabel('Teacher details', { exact: true }).setChecked(checked);
  await page.getByRole('button', { name: 'Close view menu' }).click();
  if (optionsOpen)
    await page
      .getByRole('button', { name: 'Session options', exact: true })
      .click();
}
