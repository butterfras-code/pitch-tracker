import { sessionControl } from '../fixtures/session-controls';
import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  settings,
  closeSettings,
  sound,
  claps,
  dismissFeedback,
} from '../fixtures/classroom-page';
test.beforeEach(async ({ page }) => {
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
});
test('automatic retries require quiet and complete the round without repeated scores', async ({
  page,
}) => {
  await settings(page);
  await page
    .getByLabel('Advance', { exact: true })
    .selectOption('when-correct');
  await closeSettings(page);
  await page.locator('#pauseListening').click();
  await sound(page, 0);
  await sound(page, 392);
  let data = await saved(page);
  expect(data.activeStudent).toBe('student-1');
  expect(data.sessions[0].attempts[0].status).toBe('low');
  await sound(page, 392, 2500);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await dismissFeedback(page);
  await sound(page, 0);
  await sound(page, 440);
  expect((await saved(page)).activeStudent).toBe('student-2');
  await sound(page, 440, 2500);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
  await dismissFeedback(page);
  await sound(page, 0);
  await sound(page, 440);
  await dismissFeedback(page);
  await sound(page, 0);
  await sound(page, 440);
  await dismissFeedback(page);
  await expect(page.getByText('Round complete', { exact: true })).toBeVisible();
  data = await saved(page);
  expect(data.sessions[0].attempts).toHaveLength(4);
});
test('one and done advances any result; switching auto advance off stays put', async ({
  page,
}) => {
  await settings(page);
  await page
    .getByLabel('Advance', { exact: true })
    .selectOption('when-correct');
  await page
    .getByLabel('Advance', { exact: true })
    .selectOption('after-attempt');
  await closeSettings(page);
  await page.locator('#pauseListening').click();
  await sound(page, 0);
  await sound(page, 392);
  expect((await saved(page)).activeStudent).toBe('student-2');
  await dismissFeedback(page);
  await settings(page);
  await page.getByLabel('Advance', { exact: true }).selectOption('manual');
  await closeSettings(page);
  await sound(page, 0);
  await sound(page, 440);
  expect((await saved(page)).activeStudent).toBe('student-2');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
});
test('double/triple clap navigation preserves attempts and obeys pause and disable', async ({
  page,
}) => {
  await settings(page);
  await page.getByRole('button', { name: 'Clap navigation' }).click();
  await closeSettings(page);
  await page.locator('#pauseListening').click();
  await sound(page, 0);
  await sound(page, 392);
  await dismissFeedback(page);
  await claps(page, 2);
  expect((await saved(page)).activeStudent).toBe('student-2');
  await claps(page, 3);
  expect((await saved(page)).activeStudent).toBe('student-1');
  await page.locator('#pauseListening').click();
  await claps(page, 2);
  await sound(page, 440);
  expect((await saved(page)).activeStudent).toBe('student-1');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await page.locator('#pauseListening').click();
  await settings(page);
  await page.getByRole('button', { name: 'Clap navigation' }).click();
  await closeSettings(page);
  await claps(page, 2);
  expect((await saved(page)).activeStudent).toBe('student-1');
});
test('claps can return from round completion without deleting results', async ({
  page,
}) => {
  await settings(page);
  await page
    .getByLabel('Advance', { exact: true })
    .selectOption('when-correct');
  await page.getByRole('button', { name: 'Clap navigation' }).click();
  await closeSettings(page);
  await page.locator('#pauseListening').click();
  for (let i = 0; i < 3; i++) {
    await sound(page, 0);
    await sound(page, 440);
    await dismissFeedback(page);
  }
  await expect(page.getByText('Round complete', { exact: true })).toBeVisible();
  await claps(page, 3);
  expect((await saved(page)).activeStudent).toBe('student-2');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(3);
});
test('manual scores follow advance policy', async ({ page }) => {
  await settings(page);
  await page
    .getByLabel('Advance', { exact: true })
    .selectOption('when-correct');
  await closeSettings(page);
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'Too low', exact: true })
    .click();
  expect((await saved(page)).activeStudent).toBe('student-1');
  await dismissFeedback(page);
  await settings(page);
  await page
    .getByLabel('Advance', { exact: true })
    .selectOption('after-attempt');
  await closeSettings(page);
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'Too high', exact: true })
    .click();
  expect((await saved(page)).activeStudent).toBe('student-2');
});
test('noise, navigation, dialogs and reference playback cannot carry a hold', async ({
  page,
}) => {
  await page.locator('#pauseListening').click();
  await sound(page, 0);
  await page.evaluate(() => {
    window.syntheticAudio.noise = true;
  });
  await page.clock.runFor(1500);
  await sound(page, 0);
  await sound(page, 440, 250);
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await sound(page, 440, 1200);
  await sound(page, 0);
  await page.getByRole('button', { name: 'History for Maya' }).click();
  await sound(page, 440, 1200);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await sound(page, 440, 1200);
  await sound(page, 0);
  await page
    .getByRole('button', { name: 'Hear current target', exact: true })
    .click();
  await sound(page, 440, 3500);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
});
test('projected student view keeps large name and navigation together', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sessionControl(page, 'Student view');
  expect(
    await page
      .locator('#studentIdentity h2')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(48);
  await expect(
    page.getByRole('button', { name: 'Next student', exact: true }),
  ).toBeInViewport();
});

test('hands-off handoff accepts fluctuating quieter noise but rejects a continuing softer tone', async ({
  page,
}) => {
  await settings(page);
  await page
    .getByLabel('Advance', { exact: true })
    .selectOption('after-attempt');
  await closeSettings(page);
  await page.locator('#pauseListening').click();
  await sound(page, 0);
  await sound(page, 392, 900);
  expect((await saved(page)).activeStudent).toBe('student-2');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  // Both a long held tone and a decrescendo below the scoring gate must stay locked.
  await sound(page, 392, 2000);
  await page.evaluate(() => {
    window.syntheticAudio.amplitude = 0.008;
  });
  await page.clock.runFor(2000);
  await sound(page, 392, 1000);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  // A brief interruption cannot release the previous attempt.
  await sound(page, 0, 160);
  await sound(page, 392, 1000);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  // Entirely above the noise gate, with >1.5x variation: neither older
  // pause path can accept this, but it is much quieter than the played tone.
  await page.evaluate(() => {
    window.syntheticAudio.amplitude = 0;
  });
  for (let i = 0; i < 12; i++) {
    await page.evaluate(
      (amplitude) => {
        window.syntheticAudio.noiseAmplitude = amplitude;
      },
      i % 2 ? 0.075 : 0.03,
    );
    await page.clock.runFor(100);
  }
  await expect(
    page.locator('.card-feedback, #pitchFeedback[open]'),
  ).toHaveCount(0);
  await sound(page, 440, 900);
  const data = await saved(page);
  expect(data.activeStudent).toBe('student-3');
  expect(data.sessions[0].attempts.map((attempt) => attempt.status)).toEqual([
    'low',
    'correct',
  ]);
  await sound(page, 440, 4000);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
});
