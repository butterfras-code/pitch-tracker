import { expect, test } from '@playwright/test';
import {
  classroomPage,
  closeSettings,
  dismissFeedback,
  saved,
  settings,
} from '../fixtures/classroom-page';
import { sessionControl } from '../fixtures/session-controls';

test('class handoff keeps feedback with the scorer and stable card positions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await settings(page);
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page.getByLabel('Advance mode').selectOption('one-and-done');
  await closeSettings(page);
  await sessionControl(page, 'Class view');
  const positions = () =>
    page.locator('#cards > .student').evaluateAll((cards) =>
      cards.map((card) => {
        const { x, y, width, height } = card.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
  const before = await positions();
  await page.locator('.selected .tuner-section button.low').click();
  await expect(page.locator('.selected')).toContainText('Lucas');
  await expect(
    page.locator('.student').first().locator('.card-feedback'),
  ).toContainText('Maya · Too low');
  await expect(page.locator('.selected #liveNote')).toBeVisible();
  expect(await positions()).toEqual(before);
  await page.clock.runFor(1000);
  await expect(page.locator('.card-feedback')).toHaveCount(0);
  await expect(
    page.locator('.student').first().locator('.student-result'),
  ).toHaveText('Too low');
  await page.getByRole('button', { name: 'Undo last change' }).click();
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await expect(page.locator('.selected')).toContainText('Maya');
  await expect(page.locator('.selected #liveNote')).toBeVisible();
});

test('class microphone failure, attendance and empty filters retain manual recovery', async ({
  page,
}) => {
  await classroomPage(page);
  await sessionControl(page, 'Class view');
  await page.evaluate(() => {
    window.syntheticAudio.deny = true;
  });
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await expect(page.locator('#micError')).toContainText('permission denied');
  await page.getByLabel('Search students').fill('no match');
  await expect(page.locator('#cards')).toContainText('No students match');
  await expect(
    page.locator('#activeOutsideFilter .tuner-section'),
  ).toBeVisible();
  await page.locator('#activeOutsideFilter .tuner-section button.high').click();
  await dismissFeedback(page);
  expect((await saved(page)).sessions[0].attempts.at(-1)?.status).toBe('high');
  await page
    .getByRole('button', { name: 'Show current student', exact: true })
    .click();
  await page.locator('.selected').getByLabel('Absent', { exact: true }).click();
  await expect(page.locator('.selected')).toContainText('Lucas');
  await expect(
    page.locator('.selected .tuner-section button.correct'),
  ).toBeEnabled();
});

test('fullscreen class scoring and menus fit every bundled theme', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await classroomPage(page, 30);
  await sessionControl(page, 'Class view');
  await sessionControl(page, 'Full screen');
  const signatures = [];
  for (const theme of await page
    .locator('#themeSelect option')
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    )) {
    await page.locator('#themeSelect').selectOption(theme, { force: true });
    await page.evaluate(() => document.fonts.ready);
    for (const selector of [
      '.session-toolbar',
      '.selected #pauseListening',
      '.selected .target-playback',
      '.selected .tuner-section .scorebar',
    ])
      await expect(page.locator(selector)).toBeInViewport();
    signatures.push(await page.locator('.selected').boundingBox());
    await settings(page);
    await expect(page.getByLabel('Microphone input')).toBeVisible();
    await closeSettings(page);
    await page.screenshot({ path: testInfo.outputPath(`class-${theme}.png`) });
  }
  for (const signature of signatures.slice(1))
    expect(signature).toEqual(signatures[0]);
});
