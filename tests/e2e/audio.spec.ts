import { setSlider } from '../fixtures/settings-controls';
import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  settings,
  sound,
  dismissFeedback,
} from '../fixtures/classroom-page';

test.beforeEach(async ({ page }) => {
  await classroomPage(page, 1);
  await settings(page);
});
test('audio loop uses current tuning and gate and records a hold exactly once', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await setSlider(page.getByLabel('A4 reference'), '442');
  await setSlider(page.getByLabel('Noise gate'), '0.2');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 442);
  await expect(page.locator('#liveCents')).toHaveText('No reliable pitch');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await setSlider(page.getByLabel('Noise gate'), '0.01');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await sound(page, 0);
  await sound(page, 442);
  const attempt = (await saved(page)).sessions[0].attempts[0];
  expect(attempt).toMatchObject({
    status: 'correct',
    source: 'microphone',
    a4: 442,
    target: { pitch: 'A4' },
  });
  expect(attempt.frequency).toBeCloseTo(442, 0);
  expect(attempt.cents).toBeCloseTo(0, 0);
  await sound(page, 442, 1200);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await page
    .getByRole('button', { name: 'Stop microphone', exact: true })
    .click();
  expect(await page.evaluate(() => window.syntheticAudio.stopped)).toBe(1);
});
test('denied permission leaves manual scoring available', async ({ page }) => {
  await page.evaluate(() => {
    window.syntheticAudio.deny = true;
  });
  await page
    .getByRole('button', { name: 'Enable microphone', exact: true })
    .click();
  await expect(page.locator('#toast')).toContainText(
    'Microphone permission denied',
  );
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'In range', exact: true })
    .click();
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
});
test('leaving a session while permission is pending stops the eventual stream', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.syntheticAudio.pending = true;
  });
  await page
    .getByRole('button', { name: 'Enable microphone', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.requests))
    .toBe(1);
  page.once('dialog', (d) => d.accept());
  await page
    .getByRole('button', { name: 'Finish session', exact: true })
    .click();
  await page.evaluate(() => window.syntheticAudio.release?.());
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.stopped))
    .toBe(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Enable microphone', exact: true }),
  ).toBeVisible();
});
test('reference playback cancels holds and disconnection cleans up', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 440, 250);
  await page
    .getByRole('button', { name: 'Hear current target', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.oscillatorFrequency))
    .toBe(440);
  await sound(page, 440, 2500);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await page.evaluate(() => window.syntheticAudio.endTrack?.());
  await expect(
    page.getByRole('button', { name: 'Enable microphone', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#micError')).toContainText(
    'Microphone disconnected',
  );
  expect(await page.evaluate(() => window.syntheticAudio.disconnected)).toBe(1);
});
test('Escape during pending permission cannot start a later automatic check', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.syntheticAudio.pending = true;
  });
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.syntheticAudio.requests))
    .toBe(1);
  await page.locator('h1').click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.syntheticAudio.release?.());
  await expect(
    page.getByRole('button', { name: 'Stop microphone', exact: true }),
  ).toBeVisible();
  await sound(page, 0);
  await sound(page, 440);
  await expect(page.locator('#classroomStatus')).toHaveText('Paused');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
});

async function twoSecondHold(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await setSlider(page.getByLabel('Steady hold (seconds)'), '2');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
}

test('saves a correct A over background noise and a brief impact; retries without literal silence', async ({
  page,
}) => {
  await twoSecondHold(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => {
    window.syntheticAudio.noiseAmplitude = 0.12;
  });
  await sound(page, 0, 1000);
  await expect(page.locator('#classroomStatus')).toHaveText('Your turn - play');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await page.evaluate(() => {
    window.syntheticAudio.humAmplitude = 0.03;
  });
  await sound(page, 440, 1000);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await page.evaluate(() => {
    window.syntheticAudio.noise = true;
  });
  await page.clock.runFor(160);
  await sound(page, 440, 1080);
  let attempts = (await saved(page)).sessions[0].attempts;
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({
    status: 'correct',
    source: 'microphone',
  });
  expect(Math.abs(attempts[0].cents!)).toBeLessThan(10);
  await sound(page, 440, 2500);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await dismissFeedback(page);
  await page.evaluate(() => {
    window.syntheticAudio.humAmplitude = 0;
  });
  await sound(page, 0, 1000);
  await sound(page, 440, 2300);
  attempts = (await saved(page)).sessions[0].attempts;
  expect(attempts).toHaveLength(2);
  expect(attempts.every((attempt) => attempt.status === 'correct')).toBe(true);
});

test('noise and alternating wrong pitches cannot create a saved result', async ({
  page,
}) => {
  await twoSecondHold(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => {
    window.syntheticAudio.noiseAmplitude = 0.25;
  });
  await sound(page, 0, 3000);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await page.evaluate(() => {
    window.syntheticAudio.noiseAmplitude = 0;
  });
  for (let i = 0; i < 24; i++) await sound(page, i % 2 ? 494 : 392, 160);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await sound(page, 0, 700);
  await sound(page, 440, 1000);
  await page.clock.fastForward(5000);
  await sound(page, 440, 1000);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await sound(page, 440, 1200);
  expect((await saved(page)).sessions[0].attempts[0].status).toBe('correct');
});

test('a sustained flat note in moderate noise still saves a measured low result', async ({
  page,
}) => {
  await twoSecondHold(page);
  await sound(page, 0);
  await page.evaluate(() => {
    window.syntheticAudio.noiseAmplitude = 0.12;
  });
  await sound(page, 392, 2300);
  const attempts = (await saved(page)).sessions[0].attempts;
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({ status: 'low', source: 'microphone' });
  expect(Math.abs(1200 * Math.log2(attempts[0].frequency! / 392))).toBeLessThan(
    10,
  );
});
