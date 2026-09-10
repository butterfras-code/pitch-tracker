import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

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
  await page.locator('.student').nth(1).getByLabel('Absent').check();
  await page.reload();
  await expect(
    page.getByText('Baseline rehearsal', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.student').first()).toContainText('1 tries');
  await expect(
    page.locator('.student').nth(1).getByLabel('Absent'),
  ).toBeChecked();
  await expect(
    page.locator('.student').nth(1).getByRole('button', { name: 'In range' }),
  ).toBeDisabled();
});

test('theme switches persist after reload', async ({ page }) => {
  await page.getByLabel('Theme').selectOption('classic');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'classic');
});

test('audio loop uses current tuning and gate when recording a synthetic tone', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Start session' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();

  // Replace only the audio device boundary. Exercise the real legacy loop,
  // bundled domain functions, hold classification, and recording path.
  const result = await page.evaluate<{
    gated: string;
    attempt: {
      status: string;
      source: string;
      a4: number;
      frequency: number;
      cents: number;
    };
  }>(`(() => {
    db.settings.a4 = 442;
    db.settings.gate = 0.3;
    db.settings.hold = 0.1;
    db.configs[pupil().instrument] = { pitch: 'A4', min: -1, max: 1 };
    ctx = { sampleRate: 48000 };
    analyser = { getFloatTimeDomainData(samples) {
      for (let i = 0; i < samples.length; i++) {
        samples[i] = 0.2 * Math.sin(2 * Math.PI * 442 * i / 48000);
      }
    } };
    mic = true;
    try {
      audioLoop(1000);
      cancelAnimationFrame(raf);
      const gated = $('liveCents').textContent;
      db.settings.gate = 0.01;
      checking = { id: db.activeStudent, sid: ses().id };
      checkDeadline = 10000;
      audioLoop(1100);
      cancelAnimationFrame(raf);
      audioLoop(1201);
      cancelAnimationFrame(raf);
      return { gated, attempt: ses().attempts.at(-1) };
    } finally {
      stopMic();
      ctx = null;
    }
  })()`);

  expect(result.gated).toBe('No reliable pitch');
  expect(result.attempt).toMatchObject({
    status: 'correct',
    source: 'microphone',
    a4: 442,
    target: { pitch: 'A4', min: -1, max: 1 },
  });
  expect(result.attempt.frequency).toBeCloseTo(442, 0);
  expect(result.attempt.cents).toBeCloseTo(0, 0);
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
