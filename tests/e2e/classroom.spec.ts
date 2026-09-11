import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  settings,
  sound,
  claps,
  dismissFeedback,
} from '../fixtures/classroom-page';
test.beforeEach(async ({ page }) => {
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await settings(page);
});
test('automatic retries require quiet and complete the round without repeated scores', async ({
  page,
}) => {
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
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
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page.getByLabel('Advance mode').selectOption('one-and-done');
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 392);
  expect((await saved(page)).activeStudent).toBe('student-2');
  await dismissFeedback(page);
  await page.getByLabel('Auto Advance', { exact: true }).uncheck();
  await sound(page, 0);
  await sound(page, 440);
  expect((await saved(page)).activeStudent).toBe('student-2');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
});
test('double/triple clap navigation preserves attempts and obeys pause and disable', async ({
  page,
}) => {
  await page.getByLabel('Clap navigation', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 392);
  await dismissFeedback(page);
  await claps(page, 2);
  expect((await saved(page)).activeStudent).toBe('student-2');
  await claps(page, 3);
  expect((await saved(page)).activeStudent).toBe('student-1');
  await page
    .getByRole('button', { name: 'Pause listening', exact: true })
    .click();
  await claps(page, 2);
  await sound(page, 440);
  expect((await saved(page)).activeStudent).toBe('student-1');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await page
    .getByRole('button', { name: 'Resume listening', exact: true })
    .click();
  await page.getByLabel('Clap navigation', { exact: true }).uncheck();
  await claps(page, 2);
  expect((await saved(page)).activeStudent).toBe('student-1');
});
test('claps can return from round completion without deleting results', async ({
  page,
}) => {
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page.getByLabel('Clap navigation', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
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
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'Too low', exact: true })
    .click();
  expect((await saved(page)).activeStudent).toBe('student-1');
  await dismissFeedback(page);
  await page.getByLabel('Advance mode').selectOption('one-and-done');
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'Too high', exact: true })
    .click();
  expect((await saved(page)).activeStudent).toBe('student-2');
});
test('noise, navigation, dialogs and reference playback cannot carry a hold', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
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
  await page.getByLabel('Teacher details', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Session notes', exact: true })
    .click();
  await sound(page, 440, 1200);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
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
  await page.getByRole('button', { name: 'Student view', exact: true }).click();
  expect(
    await page
      .locator('.focus h2')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(48);
  await expect(
    page.getByRole('button', { name: 'Next student', exact: true }),
  ).toBeInViewport();
});
