import { expect, test } from '@playwright/test';
import {
  classroomPage,
  sound,
  saved,
  dismissFeedback,
} from '../fixtures/classroom-page';
import { sessionControl } from '../fixtures/session-controls';

for (const width of [1366, 1920]) {
  test(`compact card stays steady across microphone states at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1080 });
    await classroomPage(page, 30);
    await page.locator('#themeSelect').selectOption('vintage-audio');
    await sessionControl(page, 'Class view');
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const card = page.locator('.selected');
    const before = await card.boundingBox();
    await expect(card.locator('#pauseListening')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(card.locator('#listeningLabel')).toBeHidden();
    expect(before!.height).toBeLessThanOrEqual(390);
    const instrument = await card.locator('.roster-instrument').boundingBox();
    const name = await card.locator('.name').boundingBox();
    expect(instrument!.y + instrument!.height).toBeLessThanOrEqual(name!.y);
    await expect(page.locator('#inputHint')).toHaveCount(0);
    await expect(
      page.getByText('Microphone level', { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('#inputStatus')).toHaveAccessibleName(
      'Microphone off',
    );
    await page.locator('#pauseListening').click();
    await expect(page.locator('#inputStatus')).toHaveAccessibleName(
      'Microphone waiting for a pause',
    );
    await expect(card.locator('#pauseListening')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const geometry = () =>
      page
        .locator(
          '.selected .session-target[data-live-practice], .selected .tuner-section[data-live-practice] .input-signal, .selected .tuner-section[data-live-practice] .tuner, .selected .tuner-section[data-live-practice] .scorebar',
        )
        .evaluateAll((elements) =>
          elements.map((el) => {
            const { x, y, width, height } = el.getBoundingClientRect();
            return { x, y, width, height };
          }),
        );
    const positions = await geometry();
    for (const frequency of [0, 410, 440, 470]) {
      await sound(page, 0);
      await sound(page, frequency, 250);
      expect(await geometry()).toEqual(positions);
      expect(await card.boundingBox()).toEqual(before);
    }
    await page.evaluate(() => {
      window.syntheticAudio.noise = true;
    });
    await page.clock.runFor(250);
    expect(await geometry()).toEqual(positions);
    await expect(page.locator('#liveCents')).toHaveText('—');
    await page.locator('#pauseListening').click();
    await expect(page.locator('#inputStatus')).toHaveAccessibleName(
      'Microphone paused',
    );
    await expect(card.locator('#pauseListening')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(card.locator('#pauseListening')).toHaveAccessibleName(
      'Resume listening',
    );
    expect(await geometry()).toEqual(positions);
    await card
      .locator('.tuner-section[data-live-practice] button.correct')
      .click();
    await dismissFeedback(page);
    await expect(card.locator('.roster-rating')).toHaveText('In range');
    expect(await card.boundingBox()).toEqual(before);
    await page.screenshot({
      path: testInfo.outputPath(`compact-vintage-${width}.png`),
    });
    for (const view of ['Student view', 'Split view']) {
      await sessionControl(page, view);
      await expect(page.locator('#inputHint')).toHaveCount(0);
      await expect(page.locator('#inputStatus')).toBeVisible();
    }
  });
}

test('target surface uses paired theme colors and direct toggle preserves attendance and scores', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await classroomPage(page);
  await sessionControl(page, 'Class view');
  for (const theme of [
    'pitch-press',
    'big-button',
    'lisa-lives',
    'vintage-audio',
    'boom-pow',
  ]) {
    await page.locator('#themeSelect').selectOption(theme);
    const colors = await page
      .locator('.selected .session-target[data-live-practice]')
      .evaluate((el) => {
        const style = getComputedStyle(el);
        const sample = document.createElement('span');
        sample.style.color = 'var(--control-ink)';
        sample.style.backgroundColor = 'var(--control)';
        el.append(sample);
        const expected = getComputedStyle(sample);
        const result = [
          style.backgroundColor,
          expected.backgroundColor,
          getComputedStyle(el.querySelector('.target-pitch')!).color,
          expected.color,
        ];
        sample.remove();
        return result;
      });
    expect(colors[0]).toBe(colors[1]);
    expect(colors[2]).toBe(colors[3]);
    expect(colors[0]).not.toBe('rgba(0, 0, 0, 0)');
    await page.screenshot({
      path: testInfo.outputPath(`compact-${theme}.png`),
    });
  }
  const maya = page.locator('.student').first();
  await maya.locator('.tuner-section .low').click();
  await dismissFeedback(page);
  await maya.getByRole('button', { name: 'Absent' }).click();
  expect((await saved(page)).sessions[0].absent).toContain('student-1');
  await expect(maya.locator('.student-result')).toHaveText('Too low');
  await maya.getByRole('button', { name: 'Absent' }).click();
  expect((await saved(page)).sessions[0].absent).not.toContain('student-1');
});

test('long instrument names reserve rating space before the first attempt', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const data = await classroomPage(page);
  data.sessions[0].roster[0].instrument = 'Trombone/Euphonium';
  data.configs['Trombone/Euphonium'] = data.configs.Flute;
  await page.evaluate(
    (data) =>
      localStorage.setItem('mouthpiece.pitchtracker.v1', JSON.stringify(data)),
    data,
  );
  await page.reload();
  await sessionControl(page, 'Class view');
  const card = page.locator('.selected');
  const before = await card.boundingBox();
  for (const rating of ['low', 'correct', 'high']) {
    await card
      .locator(`.tuner-section[data-live-practice] button.${rating}`)
      .click();
    await dismissFeedback(page);
    expect(await card.boundingBox()).toEqual(before);
  }
});

test('student card identity stays single-line and view-specific', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const data = await classroomPage(page, 8);
  data.sessions[0].roster[0].name =
    'Alexandria Montgomery-Worthington the Third';
  data.sessions[0].roster[0].instrument = 'Contrabass Trombone and Euphonium';
  data.configs['Contrabass Trombone and Euphonium'] = data.configs.Flute;
  await page.evaluate(
    (data) =>
      localStorage.setItem('mouthpiece.pitchtracker.v1', JSON.stringify(data)),
    data,
  );
  await page.reload();

  const card = page.locator('.student').first();
  await expect(card.locator('.roster-rating')).toBeVisible();
  await expect(card.locator('.card-practice')).toBeHidden();
  const splitGeometry = await card.evaluate((element) => {
    const instrument =
      element.querySelector<HTMLElement>('.roster-instrument')!;
    const name = element.querySelector<HTMLElement>('.name')!;
    const header = element.querySelector<HTMLElement>('.roster-header')!;
    const positions = [...header.children].map((child) => {
      const isAttendanceToggle = (child as HTMLElement).classList.contains(
        'attendance-toggle',
      );
      if (isAttendanceToggle) return null;
      const box = (child as HTMLElement).getBoundingClientRect();
      return Math.round(box.y + box.height / 2);
    });
    return {
      noCardOverflow:
        element.scrollWidth === element.clientWidth &&
        element.scrollHeight === element.clientHeight,
      headerIsOneRow:
        new Set(positions.filter((value): value is number => value !== null))
          .size === 1,
      instrument: [
        getComputedStyle(instrument).whiteSpace,
        getComputedStyle(instrument).textOverflow,
      ],
      name: [
        getComputedStyle(name).whiteSpace,
        getComputedStyle(name).textOverflow,
      ],
    };
  });
  expect(splitGeometry).toEqual({
    noCardOverflow: true,
    headerIsOneRow: false,
    instrument: ['nowrap', 'ellipsis'],
    name: ['nowrap', 'ellipsis'],
  });

  await sessionControl(page, 'Class view');
  await expect(card.locator('.roster-rating')).toBeHidden();
  const heights = await page
    .locator('.student')
    .evaluateAll((cards) => cards.map((item) => item.clientHeight));
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
});
