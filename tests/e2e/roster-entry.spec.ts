import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

test('ALL header assigns a shared instrument and validates the whole batch', async ({
  page,
}) => {
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  const rows = page.locator('#main .panel').first().locator('tbody tr');
  await expect(rows).toHaveCount(10);
  await page.getByRole('button', { name: 'Add students', exact: true }).click();
  const input = page.getByLabel('Students', { exact: true });
  const submit = page.getByRole('button', { name: 'Add to roster' });
  for (const value of [
    'ALL:\nAlex',
    'ALL: Unknown\nAlex',
    'ALL: Trumpet',
    `ALL: Trumpet\nAlex\n${'x'.repeat(121)}`,
  ]) {
    await input.fill(value);
    await submit.click();
    await expect(page.locator('#rosterError')).not.toBeEmpty();
    await expect(rows).toHaveCount(10);
  }
  await input.fill('\n  all: fReNcH hOrN  \n Alex \n\n Rivera, Sam\n');
  await submit.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(rows).toHaveCount(12);
  await expect(rows.nth(0)).toContainText('Flute');
  await expect(rows.nth(10)).toContainText('Alex');
  await expect(rows.nth(10)).toContainText('French Horn');
  await expect(rows.nth(11)).toContainText('Rivera, Sam');
  await expect(rows.nth(11)).toContainText('French Horn');
  await page.reload();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await expect(rows).toHaveCount(12);
  await expect(rows.nth(11)).toContainText('French Horn');
  await page.getByRole('button', { name: 'Add students', exact: true }).click();
  await input.fill('Pat, trumpet\nLee, Jo, Clarinet');
  await submit.click();
  await expect(rows).toHaveCount(14);
  await expect(rows.nth(12)).toContainText('Trumpet');
  await expect(rows.nth(13)).toContainText('Lee, Jo');
  await expect(rows.nth(13)).toContainText('Clarinet');
});
