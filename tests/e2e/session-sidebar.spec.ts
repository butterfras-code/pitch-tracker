import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  sound,
  dismissFeedback,
} from '../fixtures/classroom-page';
import { sessionControl } from '../fixtures/session-controls';

for (const [width, height] of [
  [1920, 1080],
  [1366, 768],
  [390, 844],
]) {
  test(`shared toolbar and active scoring remain reachable at ${width}x${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await classroomPage(page, 30);
    for (const view of ['Split', 'Student', 'Class']) {
      await sessionControl(page, view + ' view');
      await expect(page.locator('#sessionSidebar')).toHaveCount(0);
      for (const name of [
        'Back to classes',
        'Session options',
        'Undo last change',
        'Finish session',
        'Next student',
        'Previous student',
        'Start listening',
      ]) {
        await page
          .getByRole('button', { name, exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          page.getByRole('button', { name, exact: true }),
        ).toBeInViewport();
      }
      if (view !== 'Class') {
        const previous = await page
          .locator('.student-heading [data-ui-click="previous-student"]')
          .boundingBox();
        const identity = await page
          .locator('#studentIdentity h2')
          .boundingBox();
        const next = await page
          .locator('.student-heading [data-ui-click="next-student"]')
          .boundingBox();
        expect(previous!.x + previous!.width).toBeLessThanOrEqual(identity!.x);
        expect(identity!.x + identity!.width).toBeLessThanOrEqual(next!.x);
        await expect(
          page.locator('.current-display .target-actions #pauseListening'),
        ).toBeVisible();
      }
      await expect(
        page.getByRole('button', { name: view + ' view', exact: true }),
      ).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await expect(page.locator('.current-display')).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Next student', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.selected #pauseListening')).toBeVisible();
    await expect(page.locator('.selected #liveNote')).toBeVisible();
    await expect(page.locator('.selected .target-playback')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`class-${width}.png`) });
    await page.locator('.student .name').filter({ hasText: 'Lucas' }).click();
    await expect(page.locator('.selected')).toContainText('Lucas');
    await expect(page.locator('.selected #liveNote')).toHaveCount(1);
    await page.getByRole('button', { name: 'Undo last change' }).click();
    expect((await saved(page)).activeStudent).toBe('student-1');
  });
}

test('class scoring preserves the live tuner across views and resolves feedback in the scored card', async ({
  page,
}) => {
  await classroomPage(page);
  await sessionControl(page, 'Class view');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const tuner = await page.locator('#liveNote').elementHandle();
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, 440, 250);
  await expect(page.locator('.selected #liveNote')).not.toHaveText('—');
  await sessionControl(page, 'Split view');
  await sessionControl(page, 'Class view');
  expect(await tuner!.evaluate((el) => el.isConnected)).toBe(true);
  await sound(page, 440, 400);
  expect((await saved(page)).sessions[0].attempts).toHaveLength(1);
  await expect(page.locator('.selected .card-feedback')).toContainText(
    'Maya · In range',
  );
  await expect(page.locator('#pitchFeedback')).not.toHaveAttribute('open');
  await expect(page.locator('.selected .card-practice')).toBeHidden();
  await dismissFeedback(page);
  await expect(page.locator('.selected .card-practice')).toBeVisible();
  await page.locator('.student .name').filter({ hasText: 'Lucas' }).click();
  await expect(
    page.locator('.student').first().locator('.student-result'),
  ).toHaveText('In range');
  await page.getByLabel('Search students').fill('Sofia');
  await expect(
    page.locator('#activeOutsideFilter .selected #liveNote'),
  ).toBeVisible();
  await page.locator('#activeOutsideFilter .tuner-section .low').click();
  expect((await saved(page)).sessions[0].attempts.at(-1)?.studentId).toBe(
    'student-2',
  );
});

test('class cards show inert tuner shells and transfer the one live tuner on selection', async ({
  page,
}) => {
  await classroomPage(page);
  await sessionControl(page, 'Class view');

  const liveNote = await page.locator('#liveNote').elementHandle();
  await expect(page.locator('[data-live-practice]')).toHaveCount(2);
  await expect(
    page.locator('.student:not(.selected) .inactive-practice'),
  ).toHaveCount(2);
  await expect(
    page.locator('.student:not(.selected) .inactive-practice').first(),
  ).toBeVisible();
  await expect(page.locator('.selected .inactive-practice')).toBeHidden();
  await expect(page.locator('.inactive-practice [data-ui-click]')).toHaveCount(
    0,
  );
  expect(
    await page
      .locator('.inactive-practice [id]')
      .evaluateAll((elements) => elements.map((element) => element.id)),
  ).toEqual([]);

  const previous = page.locator('[data-student-id="student-1"]');
  const next = page.locator('[data-student-id="student-2"]');
  await next.locator('.name').click();
  await expect(next.locator('.inactive-practice')).toBeHidden();
  await expect(previous.locator('.inactive-practice')).toBeVisible();
  await expect(next.locator('[data-live-practice]')).toHaveCount(2);
  expect(await liveNote!.evaluate((element) => element.isConnected)).toBe(true);
});

test('view controls stay visible and fullscreen retains toolbar', async ({
  page,
}) => {
  await classroomPage(page);
  await expect(page.getByRole('group', { name: 'Content view' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Split view', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Full screen', exact: true }),
  ).toBeVisible();
  await sessionControl(page, 'Full screen');
  if (await page.evaluate(() => !!document.fullscreenElement)) {
    await expect(page.locator('body > header')).toBeHidden();
    await expect(page.locator('.session-toolbar')).toBeInViewport();
    await sessionControl(page, 'Class view');
    await expect(
      page.getByRole('button', { name: 'Class view', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await sessionControl(page, 'Exit full screen');
    await expect(page.locator('body > header')).toBeVisible();
  }
});

test('class card selection and compact chevrons select students without scoring', async ({
  page,
}) => {
  await classroomPage(page);
  await sessionControl(page, 'Class view');
  const lucas = page.locator('[data-student-id="student-2"]');
  await lucas.locator('.roster-instrument').click();
  await expect(lucas).toHaveClass(/selected/);
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(page.locator('.selected .name')).toHaveText('Sofia');
  await page
    .getByRole('button', { name: 'Previous student', exact: true })
    .click();
  await expect(page.locator('.selected .name')).toHaveText('Lucas');
  await page
    .locator('[data-student-id="student-1"]')
    .click({ position: { x: 20, y: 150 } });
  await expect(page.locator('.selected .name')).toHaveText('Maya');
  await page.locator('.selected .attendance-toggle').click();
  await expect(page.locator('[data-student-id="student-1"]')).toHaveClass(
    /absent/,
  );
  expect((await saved(page)).sessions[0].attempts).toHaveLength(0);
  for (const view of ['Student', 'Split', 'Class']) {
    await sessionControl(page, view + ' view');
    const parent = page.locator(
      view === 'Class'
        ? '.selected .roster-name-navigation'
        : '.student-navigation',
    );
    const name = parent.locator(view === 'Class' ? '.name' : 'h2');
    const previous = await parent
      .locator('[data-ui-click="previous-student"]')
      .boundingBox();
    const next = await parent
      .locator('[data-ui-click="next-student"]')
      .boundingBox();
    const identity = await name.boundingBox();
    expect(identity!.x - previous!.x - previous!.width).toBeLessThanOrEqual(3);
    expect(next!.x - identity!.x - identity!.width).toBeLessThanOrEqual(3);
    await expect(parent.locator('.student-chevron').first()).toHaveCSS(
      'border-top-width',
      '0px',
    );
  }
});
