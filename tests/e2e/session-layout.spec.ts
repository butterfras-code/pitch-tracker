import { test, expect } from '@playwright/test';
import {
  classroomPage,
  saved,
  settings,
  sound,
} from '../fixtures/classroom-page';

test('views preserve holds; dashboard follows without moving page or keyboard focus', async ({
  page,
}) => {
  await classroomPage(page, 80);
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 440, 300);
  await page.getByRole('button', { name: 'Student view', exact: true }).click();
  await page.getByRole('button', { name: 'Split view', exact: true }).click();
  await sound(page, 440, 300);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await page.getByRole('button', { name: 'Class view', exact: true }).click();
  // Focus remains on the navigation button while its action activates an offscreen card.
  await page.locator('.student[data-student-id="student-70"] .name').click();
  await page.locator('#cards').evaluate((el) => {
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
  await page.getByLabel('Search students').fill('no match');
  await expect(page.locator('#activeOutsideFilter')).toContainText(
    'Student 71',
  );
  await page
    .getByRole('button', { name: 'Show current student', exact: true })
    .click();
  await expect(page.getByLabel('Search students')).toHaveValue('');
});
test('teacher details are opt-in; retry rounds, random and undo preserve results', async ({
  page,
}) => {
  await classroomPage(page);
  await expect(
    page.getByRole('button', { name: 'History for Maya' }),
  ).toBeHidden();
  await settings(page);
  await page.getByLabel('Teacher details', { exact: true }).check();
  await expect(
    page.getByRole('button', { name: 'History for Maya' }),
  ).toBeVisible();
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page.getByLabel('Advance mode').selectOption('one-and-done');
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
  await page.getByRole('button', { name: 'Random', exact: true }).click();
  expect((await saved(page)).activeStudent).toBe('student-1');
  await expect(page.locator('.student').nth(1)).toContainText(
    'Not in this round',
  );
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
    page.getByLabel('Teacher details', { exact: true }),
  ).not.toBeChecked();
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
  await expect(page.locator('.student').nth(1)).toContainText(
    'Not in this round',
  );
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
  await expect(page.locator('.student').nth(1)).toContainText('Not yet tried');
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
      await page
        .getByRole('button', { name: view + ' view', exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole('button', { name: 'Next student', exact: true }),
      ).toBeVisible();
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
  await page.getByRole('button', { name: 'Class view', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await page.locator('.student').first().getByLabel('Absent').focus();
  const control = await page
    .locator('.student')
    .first()
    .getByLabel('Absent')
    .elementHandle();
  await sound(page, 0);
  await sound(page, 440);
  expect(
    await control!.evaluate(
      (el) => el.isConnected && document.activeElement === el,
    ),
  ).toBe(true);
  await page.locator('#cards').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const position = await page.locator('#cards').evaluate((el) => el.scrollTop);
  await settings(page);
  await page.getByLabel('Teacher details', { exact: true }).check();
  await page.getByLabel('Teacher details', { exact: true }).uncheck();
  expect(await page.locator('#cards').evaluate((el) => el.scrollTop)).toBe(
    position,
  );
});
test('fullscreen success, browser exit and rejection preserve content view', async ({
  page,
}) => {
  await classroomPage(page);
  await page.getByRole('button', { name: 'Class view', exact: true }).click();
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
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
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
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
  await page
    .locator('.current-display')
    .getByRole('button', { name: 'In range', exact: true })
    .click();
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await page.evaluate(() => {
    window.syntheticAudio.deny = false;
  });
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
  await expect(page.locator('.student').first()).toContainText('Not yet tried');
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
          .querySelector('#classroomStatus')!
          .getBoundingClientRect(),
        t = document.querySelector('.tuner')!.getBoundingClientRect();
      return t.height > 0 && f.bottom > t.top;
    }),
  ).toBe(false);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page
    .getByRole('button', { name: 'Session behavior settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(page.locator('#studentIdentity h2')).toHaveText('Lucas');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
