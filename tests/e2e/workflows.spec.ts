import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const key = 'mouthpiece.pitchtracker.v1';
test.beforeEach(async ({ page }) => {
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
});

test('manual score, undo, attendance and reload preserve session behavior', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Start session' }).first().click();
  await page.getByLabel('Session name').fill('Baseline rehearsal');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  const focus = page.locator('.focus');
  await focus.getByRole('button', { name: 'In range' }).click();
  await expect(page.locator('.student').first()).toContainText('1 tries');
  await page.getByRole('button', { name: 'Undo last change' }).click();
  await expect(page.locator('.student').first()).toContainText('0 tries');
  await focus.getByRole('button', { name: 'Too low' }).click();
  await page.locator('.student').nth(1).getByLabel('Absent').click();
  await page.reload();
  if (
    await page
      .getByRole('button', { name: 'Session behavior settings', exact: true })
      .count()
  ) {
    await page
      .getByRole('button', { name: 'Session behavior settings', exact: true })
      .click();
    await page.getByLabel('Teacher details', { exact: true }).check();
  }
  await expect(
    page.getByText('Baseline rehearsal', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.student').first()).toContainText('1 tries');
  await expect(
    page.locator('.student').nth(1).getByLabel('Absent'),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.locator('.student').nth(1).getByRole('button', { name: 'In range' }),
  ).toBeDisabled();
});

test('theme switches persist after reload', async ({ page }) => {
  await page.getByLabel('Theme').selectOption('pitch-press');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    'pitch-press',
  );
});

test('backup round trip restores data and malformed imports preserve it', async ({
  page,
}) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up data', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('Backup download missing');
  const backup = JSON.parse(await readFile(path, 'utf8'));
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#importFile').setInputFiles(path);
  await expect(page.locator('#toast')).toHaveText('Backup restored.');
  const restored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect({ ...restored, revision: 0 }).toEqual({ ...backup, revision: 0 });
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.locator('#importFile').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schema":999}'),
  });
  await expect(page.locator('#toast')).toContainText('Restore failed:');
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    before,
  );
});

test('delegated actions use restored data and the current session after undo', async ({
  page,
}) => {
  const { trackerFixture } = await import('../fixtures/tracker');
  const data = trackerFixture();
  data.sessions[0].attempts = [];
  data.sessions[0].roster[0].name = 'Restored <Maya>';
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#importFile').setInputFiles({
    name: 'restored.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.locator('#studentIdentity h2')).toHaveText(
    'Restored <Maya>',
  );
  await page.locator('.focus').getByRole('button', { name: 'Too low' }).click();
  await page.getByRole('button', { name: 'Undo last change' }).click();
  await page
    .locator('.focus')
    .getByRole('button', { name: 'In range' })
    .click();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(saved.sessions[0].attempts).toHaveLength(1);
  expect(saved.sessions[0].attempts[0]).toMatchObject({
    name: 'Restored <Maya>',
    status: 'correct',
  });
  await page.reload();
  await expect(page.locator('.student').first()).toContainText('1 tries');
});
