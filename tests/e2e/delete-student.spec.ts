import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

test('student deletion supports cancellation, persists, and preserves session history', async ({
  page,
}) => {
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .first()
    .click();
  await page.getByLabel('Session name').fill('Before deletion');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await page
    .locator('.tuner-section[data-live-practice]')
    .getByRole('button', { name: 'In range' })
    .click();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Edit class' }).first().click();
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'Maya', exact: true }) });
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete Maya');
    await dialog.dismiss();
  });
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Archive', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(row).toHaveCount(0);
  const lucas = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'Lucas', exact: true }) });
  page.once('dialog', (dialog) => dialog.accept());
  await lucas.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(lucas).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.student')).toHaveCount(10);
  await expect(page.locator('.student').first()).toContainText('Maya');
  await expect(page.locator('.student').first()).toContainText('In range');
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Edit class' }).first().click();
  await expect(row).toHaveCount(0);
  await expect(lucas).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to classes' }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByText('Student summary & attempts', { exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Maya Flute', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .first()
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await expect(page.locator('.student')).toHaveCount(8);
  await expect(
    page.locator('.student').filter({ hasText: 'Maya' }),
  ).toHaveCount(0);
});
