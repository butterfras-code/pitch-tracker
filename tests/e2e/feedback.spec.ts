import { sessionControl } from '../fixtures/session-controls';
import { expect, test } from '@playwright/test';
import {
  classroomPage,
  closeSettings,
  saved,
  settings,
  sound,
} from '../fixtures/classroom-page';
import catalog from '../../src/themes/feedback.json' with { type: 'json' };
import { readFile } from 'node:fs/promises';

for (const mode of ['Split view', 'Class view']) {
  test(`${mode}: feedback waits for audible pause and manual dismissal preserves waiting state`, async ({
    page,
  }, testInfo) => {
    await classroomPage(page);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await sessionControl(page, mode);
    await sessionControl(page, 'Full screen');
    await settings(page);
    await page.getByLabel('Auto Advance', { exact: true }).check();
    await closeSettings(page);
    await page
      .getByRole('button', { name: 'Start listening', exact: true })
      .click();
    await expect(page.locator('#inputStatus')).toHaveAccessibleName(
      'Microphone waiting for a pause',
    );
    await sound(page, 0);
    await sound(page, 440, 900);
    const feedback = page.locator('#pitchFeedback[open], .card-feedback');
    await expect(feedback).toBeVisible();
    await expect(page.locator('#studentIdentity')).toContainText('Lucas');
    await sound(page, 440, 3000);
    await expect(feedback).toBeVisible();
    await expect(page.locator('#inputStatus')).toHaveAttribute(
      'data-microphone',
      'waiting',
    );
    expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
    await page.screenshot({
      path: testInfo.outputPath('waiting-for-pause.png'),
    });
    // No second quiet period should be needed after feedback closes.
    await sound(page, 0, 700);
    await expect(feedback).toHaveCount(0);
    await expect(page.locator('#inputStatus')).toHaveAccessibleName(
      'Microphone on',
    );
    await sound(page, 440, 900);
    expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
    await feedback.getByRole('button', { name: 'Continue' }).click();
    await expect(feedback).toHaveCount(0);
    await sound(page, 440, 2000);
    await expect(page.locator('#inputStatus')).toHaveAccessibleName(
      'Microphone waiting for a pause',
    );
    expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
    await sound(page, 0, 700);
    await sound(page, 440, 900);
    expect((await saved(page)).sessions[0].attempts).toHaveLength(3);
    // Round completion needs no handoff and must not trap the final feedback.
    await sound(page, 440, 1500);
    await expect(feedback).toHaveCount(0);
  });
}

test('quiet during feedback satisfies handoff but does not shorten its minimum duration', async ({
  page,
}) => {
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await settings(page);
  const duration = page.getByLabel('Feedback popup duration (seconds)', {
    exact: true,
  });
  await duration.fill('3');
  await duration.press('Tab');
  await closeSettings(page);
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 440, 700);
  const feedback = page.locator('#pitchFeedback');
  await sound(page, 0, 700);
  await expect(page.locator('#inputStatus')).toHaveAccessibleName(
    'Microphone on',
  );
  await expect(feedback).toBeVisible();
  await sound(page, 440, 1000);
  await expect(feedback).toBeVisible();
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await sound(page, 0, 1600);
  await expect(feedback).toBeHidden();
  await sound(page, 440, 700);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
});

for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]) {
  test.describe(`feedback at ${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      contextOptions: { screen: { width, height } },
    });
    test('generic and comic popups work offline and preserve the session layout', async ({
      page,
    }, testInfo) => {
      await classroomPage(page, 12);
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      if (width > 390) {
        await sessionControl(page, 'Full screen');
        await expect
          .poll(() => page.evaluate(() => !!document.fullscreenElement))
          .toBe(true);
      }
      const popup = page.locator('#pitchFeedback');
      for (const theme of ['big-button', 'boom-pow']) {
        await page.locator('#themeSelect').selectOption(theme, { force: true });
        for (const [rating, label] of [
          ['low', 'Too low'],
          ['high', 'Too high'],
          ['correct', 'In range'],
        ] as const) {
          const button = page.locator(
            `.current-display [data-ui-click="record"][data-status="${rating}"]`,
          );
          const layout = await page.locator('.session-content').boundingBox();
          await button.click();
          await expect(popup).toBeVisible();
          await expect(popup).toHaveAttribute('data-rating', rating);
          await expect(popup.locator('.feedback-caption')).toHaveText(
            `Maya · ${label}`,
          );
          const pool =
            theme === 'boom-pow'
              ? catalog.themes['boom-pow'][rating]
              : catalog.defaults[rating];
          expect(pool).toContain(
            await popup.locator('.feedback-phrase').textContent(),
          );
          await expect(
            popup.getByRole('button', { name: 'Continue' }),
          ).toBeFocused();
          await expect(popup).toHaveAccessibleName(
            (await popup.locator('.feedback-phrase').textContent()) ?? '',
          );
          expect(await popup.evaluate((el) => el.matches(':modal'))).toBe(true);
          expect(await page.locator('.session-content').boundingBox()).toEqual(
            layout,
          );
          const bounds = await popup.boundingBox();
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
          expect(bounds!.y).toBeGreaterThanOrEqual(0);
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
          if (rating === 'correct') {
            await page.evaluate(() => document.fonts.ready);
            await page.screenshot({
              path: testInfo.outputPath(`feedback-${theme}-${width}.png`),
            });
          }
          await page.clock.runFor(900);
          await expect(popup).toBeVisible();
          await page.clock.runFor(100);
          await expect(popup).toBeHidden();
          await expect(page.locator('#lastResult')).toContainText('Maya');
          await expect(button).toBeFocused();
        }
      }
      expect((await saved(page)).sessions[0].attempts).toHaveLength(6);
    });
  });
}

test('auto-advance keeps the recorded name; Continue and Escape restore keyboard access', async ({
  page,
}) => {
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator('#themeSelect').selectOption('boom-pow');
  await settings(page);
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page.getByLabel('Advance mode').selectOption('one-and-done');
  await closeSettings(page);
  await page.locator('.current-display [data-status="low"]').click();
  await expect(page.locator('#studentIdentity')).toContainText('Lucas');
  await expect(page.locator('#pitchFeedback')).toContainText('Maya');
  await page.keyboard.press('2');
  await page.keyboard.press('n');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await expect(page.locator('#studentIdentity')).toContainText('Lucas');
  await page
    .locator('#pitchFeedback')
    .getByRole('button', { name: 'Continue' })
    .click();
  await expect(page.locator('#pitchFeedback')).toBeHidden();
  await page.locator('.current-display [data-status="high"]').click();
  await expect(page.locator('#pitchFeedback')).toContainText('Lucas');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pitchFeedback')).toBeHidden();
  await page.locator('#themeSelect').selectOption('pitch-press');
  await page.locator('.current-display [data-status="correct"]').click();
  expect(catalog.defaults.correct).toContain(
    await page.locator('.feedback-phrase').textContent(),
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Undo last change', exact: true })
    .click();
  await expect(page.locator('#toast')).toHaveText('Last change undone.');
});

test('microphone popup waits for a recorded hold, blocks scoring and resumes after dismissal', async ({
  page,
}) => {
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await settings(page);
  await page
    .getByLabel('Feedback popup duration (seconds)', { exact: true })
    .fill('3');
  await page
    .getByLabel('Feedback popup duration (seconds)', { exact: true })
    .press('Tab');
  await closeSettings(page);
  await page.locator('#themeSelect').selectOption('boom-pow');
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 440, 250);
  await expect(page.locator('#pitchFeedback')).toBeHidden();
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  await sound(page, 440, 650);
  await expect(page.locator('#pitchFeedback')).toHaveAttribute(
    'data-rating',
    'correct',
  );
  const first = await page.locator('.feedback-phrase').textContent();
  await sound(page, 0, 700);
  await sound(page, 460, 900);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await expect(page.locator('.feedback-phrase')).toHaveText(first!);
  await page.keyboard.press('Escape');
  await sound(page, 0);
  await sound(page, 440, 900);
  await expect(page.locator('#pitchFeedback')).toBeVisible();
  await expect(page.locator('.feedback-phrase')).not.toHaveText(first!);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
});

test('replacement cancels old timers; theme switches clear the popup without leaking comic styles', async ({
  page,
}) => {
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator('#themeSelect').selectOption('boom-pow');
  await page.locator('.current-display [data-status="low"]').click();
  await page.clock.runFor(750);
  // Simulate another queued controller action; ordinary background input is modal-blocked.
  await page
    .locator('.current-display [data-status="high"]')
    .evaluate((el: HTMLButtonElement) => el.click());
  await page.clock.runFor(500);
  await expect(page.locator('#pitchFeedback')).toBeVisible();
  await expect(page.locator('#pitchFeedback')).toHaveAttribute(
    'data-rating',
    'high',
  );
  await page
    .locator('#themeSelect')
    .selectOption('big-button', { force: true });
  await expect(page.locator('#pitchFeedback')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.current-display [data-status="correct"]').click();
  await expect(page.locator('#pitchFeedback')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.locator('#pitchFeedback')).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('.feedback-phrase')).toHaveCSS(
    'text-transform',
    'none',
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'History & progress', exact: true })
    .click();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await expect(page.locator('#pitchFeedback')).toBeHidden();
});

test('long names remain literal text and the popup stays usable on a short phone viewport', async ({
  page,
}) => {
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const name =
    '<img src=x onerror=alert(1)>' + ' A long student name'.repeat(4);
  await page.evaluate(
    ({ name }) => {
      const key = 'mouthpiece.pitchtracker.v1';
      const data = JSON.parse(localStorage.getItem(key)!);
      data.sessions[0].roster[0].name = name;
      data.classes[0].students[0].name = name;
      localStorage.setItem(key, JSON.stringify(data));
    },
    { name },
  );
  await page.reload();
  await page.setViewportSize({ width: 390, height: 650 });
  await page.locator('.current-display [data-status="correct"]').click();
  await expect(page.locator('.feedback-caption')).toContainText(name);
  await expect(page.locator('#pitchFeedback img')).toHaveCount(0);
  await page
    .locator('#pitchFeedback')
    .getByRole('button', { name: 'Continue' })
    .click();
  await expect(page.locator('#pitchFeedback')).toBeHidden();
});

test('user duration saves from session settings, controls timing across themes and round trips in backups', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await classroomPage(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await settings(page);
  const duration = page.getByLabel('Feedback popup duration (seconds)', {
    exact: true,
  });
  await expect(duration).toHaveValue('');
  await duration.fill('1.5');
  await duration.press('Tab');
  expect((await saved(page)).settings.feedbackDurationMs).toBe(1500);
  expect((await saved(page)).schema).toBe(3);
  await closeSettings(page);
  await sessionControl(page, 'Full screen');
  await settings(page);
  await page.screenshot({
    path: testInfo.outputPath('feedback-settings-desktop.png'),
  });
  await closeSettings(page);
  await page.locator('#themeSelect').selectOption('boom-pow', { force: true });
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator('.current-display [data-status="correct"]').click();
  await expect(page.locator('.feedback-hint')).toHaveText(
    'Closes automatically after 1.5 seconds',
  );
  await page.clock.runFor(1400);
  await expect(page.locator('#pitchFeedback')).toBeVisible();
  await page.clock.runFor(100);
  await expect(page.locator('#pitchFeedback')).toBeHidden();
  await page.evaluate(() => {
    if (document.fullscreenElement) return document.exitFullscreen();
  });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up data', exact: true }).click();
  const path = await (await downloading).path();
  const backup = JSON.parse(await readFile(path!, 'utf8'));
  expect(backup.settings.feedbackDurationMs).toBe(1500);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(duration).toHaveValue('1.5');
  await duration.fill('5');
  await duration.press('Tab');
  expect((await saved(page)).settings.feedbackDurationMs).toBe(5000);
  // Saving pitch settings later must not downgrade schema 3 or discard timing.
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  expect((await saved(page)).schema).toBe(3);
  expect((await saved(page)).settings.feedbackDurationMs).toBe(5000);
  await duration.fill('0.1');
  await duration.dispatchEvent('change');
  expect((await saved(page)).settings.feedbackDurationMs).toBe(5000);
  await duration.fill('5');
  await duration.press('Tab');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#importFile').setInputFiles(path!);
  await expect(page.locator('#toast')).toHaveText('Backup restored.');
  expect((await saved(page)).settings.feedbackDurationMs).toBe(1500);
  const before = await saved(page);
  await page.locator('#importFile').setInputFiles({
    name: 'bad-timing.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...backup,
        settings: { ...backup.settings, feedbackDurationMs: -1 },
      }),
    ),
  });
  await expect(page.locator('#toast')).toContainText('Restore failed:');
  expect(await saved(page)).toEqual(before);
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await settings(page);
  await duration.fill('');
  await duration.press('Tab');
  expect((await saved(page)).settings.feedbackDurationMs).toBeNull();
  await closeSettings(page);
  await page.locator('.current-display [data-status="correct"]').click();
  await expect(page.locator('.feedback-hint')).toHaveText(
    'Closes automatically after 1 second',
  );
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await settings(page);
  await duration.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('feedback-settings-phone.png'),
  });
});
