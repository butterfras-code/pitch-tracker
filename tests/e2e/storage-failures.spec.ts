import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const url = pathToFileURL(resolve('dist/index.html')).href;
const key = 'mouthpiece.pitchtracker.v1';

test('corrupt saved data is preserved while the app remains usable', async ({
  page,
}) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{broken'), key);
  await page.goto(url);
  await expect(page.getByRole('alert')).toContainText(
    'Saved data could not be read',
  );
  await page.getByRole('button', { name: 'Start session' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await expect(page.locator('.focus')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    '{broken',
  );
});

test('denied storage access does not prevent manual tracking', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await page.goto(url);
  await expect(page.getByRole('alert')).toContainText(
    'Saved data could not be read',
  );
  await page.getByRole('button', { name: 'Start session' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await page
    .locator('.focus')
    .getByRole('button', { name: 'In range' })
    .click();
  await expect(page.locator('.student').first()).toContainText('1 tries');
});

test('quota failures pause saves and retain the saved data', async ({
  page,
}) => {
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: 'Start session' }).first(),
  ).toBeVisible();
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Start session' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Browser storage is unavailable or full',
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    before,
  );
  await page
    .locator('.focus')
    .getByRole('button', { name: 'In range' })
    .click();
  await expect(page.locator('.student').first()).toContainText('1 tries');
});

test('a newer stored revision is not overwritten by a stale window', async ({
  page,
}) => {
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: 'Start session' }).first(),
  ).toBeVisible();
  // Model another writer without relying on browser-specific file-URL event delivery.
  const newer = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!);
    data.revision++;
    const raw = JSON.stringify(data);
    localStorage.setItem(key, raw);
    return raw;
  }, key);
  await page.getByRole('button', { name: 'Start session' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Another window changed this tracker',
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    newer,
  );
});

test('failed restore keeps the current UI and data', async ({ page }) => {
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: 'Start session' }).first(),
  ).toBeVisible();
  const before = await page.evaluate((key) => localStorage.getItem(key)!, key);
  const incoming = JSON.parse(before);
  incoming.classes[0].name = 'Replacement class';
  await page.evaluate((key) => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Full', 'QuotaExceededError');
      return set.call(this, name, value);
    };
  }, key);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#importFile').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(incoming)),
  });
  await expect(page.locator('#toast')).toContainText('Restore failed:');
  await expect(page.locator('#classSelect')).toHaveValue(incoming.classId);
  await expect(page.locator('#classSelect option:checked')).toHaveText(
    'Demo class',
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    before,
  );
});
