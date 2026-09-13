import { sessionControl } from '../fixtures/session-controls';
import { test, expect } from '@playwright/test';
import {
  classroomPage,
  closeSettings,
  saved,
  settings,
  sound,
  dismissFeedback,
} from '../fixtures/classroom-page';

test('views preserve holds; dashboard follows without moving page or keyboard focus', async ({
  page,
}) => {
  await classroomPage(page, 80);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 440, 300);
  await sessionControl(page, 'Student view');
  await sessionControl(page, 'Split view');
  await sound(page, 440, 400);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await dismissFeedback(page);
  await sessionControl(page, 'Class view');
  // Split navigation retains focus while activating an offscreen roster card.
  await sessionControl(page, 'Split view');
  await page.locator('.student[data-student-id="student-70"] .name').click();
  await page.locator('.roster-scroll').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.getByRole('button', { name: 'Next student', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.locator('.student[data-student-id="student-71"]'),
  ).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'Next student', exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await sessionControl(page, 'Class view');
  await page.getByLabel('Search students').fill('no match');
  await expect(page.locator('#activeOutsideFilter')).toContainText(
    'Student 71',
  );
  await page
    .getByRole('button', { name: 'Show current student', exact: true })
    .click();
  await expect(page.getByLabel('Search students')).toHaveValue('');
});
test('card history and tuner scoring stay available; retry rounds, random and undo preserve results', async ({
  page,
}) => {
  await classroomPage(page);
  await expect(
    page.getByRole('button', { name: 'History for Maya' }),
  ).toBeVisible();
  await expect(page.locator('.student [data-ui-click="record"]')).toHaveCount(
    0,
  );
  expect(
    (await page.locator('.student').allTextContents()).join(' '),
  ).not.toMatch(/\btries\b/);
  const headerHeight = await page
    .locator('.student')
    .first()
    .locator('.roster-header')
    .evaluate((el) => el.getBoundingClientRect().height);
  for (const control of ['.history-toggle', '.attendance-toggle'])
    expect(
      await page
        .locator('.student')
        .first()
        .locator(control)
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThanOrEqual(headerHeight);
  await page.getByRole('button', { name: 'History for Maya' }).click();
  await expect(page.getByRole('dialog')).toContainText('Recent attempts');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await sessionControl(page, 'Class view');
  await expect(
    page.locator(
      '.student.selected .tuner-section[data-live-practice] [data-ui-click="record"]',
    ),
  ).toHaveCount(3);
  await expect(page.locator('.student [data-ui-click="record"]')).toHaveCount(
    3,
  );
  await sessionControl(page, 'Split view');
  await settings(page);
  await expect(page.getByLabel('Teacher details')).toHaveCount(0);
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page.getByLabel('Advance mode').selectOption('one-and-done');
  await closeSettings(page);
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'Too low', exact: true })
    .click();
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'In range', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(page.getByText('Round complete', { exact: true })).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Retry students needing practice',
      exact: true,
    })
    .click();
  await settings(page);
  await page.getByRole('button', { name: 'Random', exact: true }).click();
  await closeSettings(page);
  expect((await saved(page)).activeStudent).toBe('student-1');
  await expect(
    page.locator('.student').nth(1).locator('.student-result, .badge'),
  ).toHaveText('In range');
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'In range', exact: true })
    .click();
  await expect(page.getByText('Round complete', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Undo last change', exact: true })
    .click();
  expect((await saved(page)).sessions[0].attempts).toHaveLength(2);
  await page.reload();
  await settings(page);
  await expect(
    page.getByText('Round queues restart after reopening.', { exact: false }),
  ).toBeVisible();
});
test('restoring the same session clears temporary retry membership and completion', async ({
  page,
}) => {
  const data = await classroomPage(page);
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'Too low', exact: true })
    .click();
  for (let i = 0; i < 3; i++)
    await page
      .getByRole('button', { name: 'Next student', exact: true })
      .click();
  await page
    .getByRole('button', {
      name: 'Retry students needing practice',
      exact: true,
    })
    .click();
  await expect(
    page.locator('.student').nth(1).locator('.student-result, .badge'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(page.getByText('Round complete', { exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#importFile').setInputFiles({
    name: 'same-session.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.locator('#toast')).toHaveText('Backup restored.');
  await expect(page.getByText('Round complete', { exact: true })).toBeHidden();
  await expect(
    page.locator('.student').nth(1).locator('.student-result, .badge'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Undo last change', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  expect((await saved(page)).activeStudent).toBe('student-2');
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
});

for (const [width, height] of [
  [1920, 1080],
  [1366, 768],
  [680, 900],
  [768, 1024],
  [1024, 768],
  [390, 844],
  [844, 390],
])
  test(`responsive session ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await classroomPage(page);
    for (const view of ['Split', 'Student', 'Class']) {
      await sessionControl(page, view + ' view');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const next = page.getByRole('button', {
        name: 'Next student',
        exact: true,
      });
      await expect(next).toBeVisible();
      if (height >= 768)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 1,
          ),
        ).toBe(true);
    }
  });
test('card updates retain focused controls and manual roster scrolling', async ({
  page,
}) => {
  await classroomPage(page, 30);
  await sessionControl(page, 'Class view');
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await page.locator('.student').first().locator('.attendance-toggle').focus();
  const control = await page
    .locator('.student')
    .first()
    .locator('.attendance-toggle')
    .elementHandle();
  await sound(page, 0);
  await sound(page, 440);
  await dismissFeedback(page);
  expect(
    await control!.evaluate(
      (el) => el.isConnected && document.activeElement === el,
    ),
  ).toBe(true);
  await page.locator('.roster-scroll').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const position = await page
    .locator('.roster-scroll')
    .evaluate((el) => el.scrollTop);
  await settings(page);
  await page.getByLabel('Clap navigation').check();
  await page.getByLabel('Clap navigation').uncheck();
  // Firefox may clamp the restored bottom edge to a fractional CSS pixel.
  expect(
    Math.abs(
      (await page.locator('.roster-scroll').evaluate((el) => el.scrollTop)) -
        position,
    ),
  ).toBeLessThan(1);
});
test('fullscreen success, browser exit and rejection preserve content view', async ({
  page,
}) => {
  await classroomPage(page);
  await sessionControl(page, 'Class view');
  await sessionControl(page, 'Full screen');
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => !!document.fullscreenElement)) ||
        (await page.locator('#viewMessage').textContent())!.includes(
          'unavailable',
        ),
    )
    .toBe(true);
  if (await page.evaluate(() => !!document.fullscreenElement))
    await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('#sessionShell')).toHaveAttribute(
    'data-view',
    'class',
  );
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () =>
      Promise.reject(new Error('Unavailable'));
  });
  await sessionControl(page, 'Full screen');
  await expect(page.locator('#viewMessage')).toContainText('unavailable');
});
test('microphone errors and input switching preserve manual scoring', async ({
  page,
}) => {
  await classroomPage(page);
  await settings(page);
  await page.evaluate(() => {
    window.syntheticAudio.deny = true;
  });
  await page
    .getByRole('button', { name: 'Enable microphone', exact: true })
    .click();
  await expect(page.locator('#micError')).toContainText('permission denied');
  await closeSettings(page);
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'In range', exact: true })
    .click();
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await page.evaluate(() => {
    window.syntheticAudio.deny = false;
  });
  await settings(page);
  await page
    .getByRole('button', { name: 'Enable microphone', exact: true })
    .click();
  await expect(page.getByLabel('Microphone input')).toContainText(
    'Room microphone',
  );
  await page.getByLabel('Microphone input').selectOption('room');
  expect(await page.evaluate(() => window.syntheticAudio.requestedDevice)).toBe(
    'room',
  );
  await expect(page.locator('#micError')).toBeEmpty();
  await page
    .getByRole('button', { name: 'Stop microphone', exact: true })
    .click();
});
test('card navigation and skipped turns can be undone without deleting results', async ({
  page,
}) => {
  await classroomPage(page);
  await page
    .locator('.student')
    .nth(2)
    .getByRole('button', { name: 'Sofia', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Undo last change', exact: true })
    .click();
  await expect(page.locator('#studentIdentity h2')).toHaveText('Maya');
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(page.locator('.student').first()).toContainText(
    'Skipped this round',
  );
  await page
    .getByRole('button', { name: 'Undo last change', exact: true })
    .click();
  await expect(
    page.locator('.student').first().locator('.student-result, .badge'),
  ).toHaveCount(0);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
});
test('expanded settings do not overlap feedback and enlarged text remains reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await classroomPage(page);
  await settings(page);
  expect(
    await page.evaluate(() => {
      const f = document
          .querySelector('.classroom-feedback')!
          .getBoundingClientRect(),
        t = document.querySelector('.tuner')!.getBoundingClientRect();
      return t.height > 0 && f.bottom > t.top && t.bottom > f.top;
    }),
  ).toBe(false);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await closeSettings(page);
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(page.locator('#studentIdentity h2')).toHaveText('Lucas');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('live range effects follow pitch and clear on silence, pause and navigation', async ({
  page,
}) => {
  await classroomPage(page);
  const shell = page.locator('#sessionShell');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  for (const [frequency, range] of [
    [410, 'low'],
    [440, 'correct'],
    [470, 'high'],
  ] as const) {
    await sound(page, 0);
    await sound(page, frequency, 250);
    await expect(shell).toHaveAttribute('data-range', range);
    const button = page.locator(
      `.tuner-section[data-live-practice] button.${range}`,
    );
    expect(
      await button.evaluate((el) => getComputedStyle(el).animationName),
    ).not.toBe('none');
  }
  await sound(page, 0);
  await expect(shell).toHaveAttribute('data-range', '');
  await sound(page, 440, 250);
  await page
    .getByRole('button', { name: 'Pause listening', exact: true })
    .click();
  await expect(shell).toHaveAttribute('data-range', '');
  await page
    .getByRole('button', { name: 'Resume listening', exact: true })
    .click();
  await sound(page, 440, 250);
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(shell).toHaveAttribute('data-range', '');
  await sound(page, 440, 250);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.tuner-section[data-live-practice] .correct')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
});

test('session groups listening input, student identities and tuner scoring', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await classroomPage(page);
  await expect(page.locator('#studentIdentity')).not.toContainText('Target');
  const rect = (selector: string) => page.locator(selector).boundingBox();
  const mic = (await rect('.tuner-section[data-live-practice] .input-signal'))!;
  const tuner = (await rect('.tuner-section[data-live-practice] .tuner'))!;
  const scores = (await rect('.tuner-section[data-live-practice] .scorebar'))!;
  const listening = (await rect('#pauseListening'))!;
  const playback = (await rect('[data-ui-click="reference-tone"]'))!;
  await expect(
    page.locator('.tuner-section[data-live-practice] .tuner > .input-signal'),
  ).toHaveCount(1);
  expect(mic.x).toBeGreaterThanOrEqual(tuner.x);
  expect(mic.x + mic.width).toBeLessThanOrEqual(tuner.x + tuner.width);
  expect(mic.y).toBeGreaterThanOrEqual(tuner.y);
  expect(mic.y + mic.height).toBeLessThanOrEqual(tuner.y + tuner.height);
  expect(Math.abs(listening.y - playback.y)).toBeLessThan(2);
  await expect(page.locator('.target-actions #pauseListening')).toBeVisible();
  await expect(page.locator('#classroomStatus')).toBeEmpty();
  await expect(
    page.locator('#pauseListening .microphone-off-mark'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await expect(page.locator('#pauseListening')).toHaveAttribute(
    'data-microphone',
    'on',
  );
  await expect(
    page.locator('#pauseListening .microphone-off-mark'),
  ).toBeHidden();
  await expect(page.locator('#upNext')).toContainText('Lucas');
  const instrument = (await rect('#studentIdentity p'))!;
  const heading = (await rect('#studentIdentity h2'))!;
  expect(instrument.y + instrument.height).toBeLessThanOrEqual(heading.y);
  expect(scores.y).toBeGreaterThanOrEqual(tuner.y + tuner.height);
  expect(scores.y - tuner.y - tuner.height).toBeLessThanOrEqual(16);
  const previous = (await rect(
    '.student-heading [data-ui-click="previous-student"]',
  ))!;

  const next = (await rect('.student-heading [data-ui-click="next-student"]'))!;
  expect(previous.x + previous.width).toBeLessThanOrEqual(heading.x);
  expect(next.x).toBeGreaterThanOrEqual(heading.x + heading.width);
  await page.setViewportSize({ width: 390, height: 844 });
  await sessionControl(page, 'Student view');
  await page.screenshot({ path: testInfo.outputPath('mobile-session.png') });
});
