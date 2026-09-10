import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

test('copied release executes offline from a file URL and reloads', async ({
  page,
}, testInfo) => {
  const directory = testInfo.outputPath('folder with spaces');
  await mkdir(directory, { recursive: true });
  const artifact = resolve(directory, 'Pitch Tracker.html');
  await copyFile(resolve('dist/index.html'), artifact);
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const url = pathToFileURL(artifact).href;
  page.on('request', (request) => {
    if (request.url() !== url && !/^(data|blob):/.test(request.url())) {
      externalRequests.push(request.url());
    }
  });
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Pitch Tracker' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start session' }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Pitch Tracker' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start session' }).first(),
  ).toBeVisible();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});
