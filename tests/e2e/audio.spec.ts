import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TrackerData } from '../../src/domain/tracker';
import { installAudioDevice } from '../fixtures/audio-device';
import { trackerFixture } from '../fixtures/tracker';
const key = 'mouthpiece.pitchtracker.v1';

test.beforeEach(async ({ page }) => {
  await installAudioDevice(page);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  const data = trackerFixture();
  data.sessions[0].attempts = [];
  data.settings = { ...data.settings, a4: 442, hold: 0.5, gate: 0.2 };
  data.configs.Flute = { pitch: 'A4', min: -1, max: 1 };
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key, data },
  );
  await page.reload();
});

test('audio loop uses current tuning and gate and records a hold exactly once', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Check pitch' }).click();
  await expect(page.locator('#liveCents')).toHaveText('No reliable pitch');
  await page.getByRole('button', { name: 'Classes & settings' }).click();
  await page.getByLabel('Noise gate').fill('0.01');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Session', exact: true }).click();
  await page.getByRole('button', { name: 'Check pitch' }).click();
  await expect(page.locator('.student').first()).toContainText('1 tries');
  const attempt = await page.evaluate(
    (key) =>
      (JSON.parse(localStorage.getItem(key)!) as TrackerData).sessions[0]
        .attempts[0],
    key,
  );
  expect(attempt).toMatchObject({
    status: 'correct',
    source: 'microphone',
    a4: 442,
    target: { pitch: 'A4', min: -1, max: 1 },
  });
  expect(attempt.frequency).toBeCloseTo(442, 0);
  expect(attempt.cents).toBeCloseTo(0, 0);
  await page.waitForTimeout(700);
  await expect(page.locator('.student').first()).toContainText('1 tries');
  await page.getByRole('button', { name: 'Stop microphone' }).click();
  expect(await page.evaluate(() => window.syntheticAudio.stopped)).toBe(1);
});

test('denied permission leaves manual scoring available', async ({ page }) => {
  await page.evaluate(() => {
    window.syntheticAudio.deny = true;
  });
  await page.getByRole('button', { name: 'Enable microphone' }).click();
  await expect(page.locator('#toast')).toContainText(
    'Microphone permission denied',
  );
  await page
    .locator('.focus')
    .getByRole('button', { name: 'In range' })
    .click();
  await expect(page.locator('.student').first()).toContainText('1 tries');
});

test('leaving a session while permission is pending stops the eventual stream', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.syntheticAudio.pending = true;
  });
  await page.getByRole('button', { name: 'Enable microphone' }).click();
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.requests))
    .toBe(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.evaluate(() => window.syntheticAudio.release?.());
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.stopped))
    .toBe(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Enable microphone' }),
  ).toBeVisible();
});

test('reference playback cancels a check and device disconnect cleans up', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Check pitch' }).click();
  await page.getByRole('button', { name: 'Hear target' }).click();
  await expect(page.getByRole('button', { name: 'Cancel check' })).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.oscillatorFrequency))
    .toBe(442);
  await page.evaluate(() => window.syntheticAudio.endTrack?.());
  await expect(
    page.getByRole('button', { name: 'Enable microphone' }),
  ).toBeVisible();
  await expect(page.locator('#toast')).toContainText('Microphone disconnected');
  expect(await page.evaluate(() => window.syntheticAudio.disconnected)).toBe(1);
  await expect(page.locator('.student').first()).toContainText('0 tries');
});

test('cancelling while microphone permission is pending does not arm a later check', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.syntheticAudio.pending = true;
  });
  await page.getByRole('button', { name: 'Check pitch' }).click();
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.requests))
    .toBe(1);
  await page.locator('h1').click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.syntheticAudio.release?.());
  await expect(
    page.getByRole('button', { name: 'Stop microphone' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel check' })).toBeHidden();
});
