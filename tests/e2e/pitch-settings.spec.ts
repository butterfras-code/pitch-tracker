import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  settings,
  sound,
} from '../fixtures/classroom-page';
import { selectTarget, setSlider } from '../fixtures/settings-controls';

test.beforeEach(async ({ page }) => {
  await classroomPage(page, 1);
  await page
    .getByRole('button', { name: 'Classes & settings', exact: true })
    .click();
});

test('note selection, custom tuning, clef overrides, bounds and reset', async ({
  page,
}) => {
  const row = page.locator('#configTable tr[data-instrument="Flute"]');
  await selectTarget(page, 'Flute', 'Bb3');
  await expect(row.getByRole('img')).toHaveAccessibleName(/Bass clef/);
  await row.getByRole('button', { name: 'Flute toggle clef' }).click();
  await expect(row.getByRole('img')).toHaveAccessibleName(/Treble clef/);
  await selectTarget(page, 'Flute', 'C3');
  await expect(row.getByRole('img')).toHaveAccessibleName(/Treble clef/);
  await row.getByRole('button', { name: 'Auto clef', exact: true }).click();
  await expect(row.getByRole('img')).toHaveAccessibleName(/Bass clef/);
  await selectTarget(page, 'Flute', 'C4');
  await expect(row.getByRole('img')).toHaveAccessibleName(/Treble clef/);
  const target = page.getByRole('slider', {
    name: 'Flute target adjustment',
    exact: true,
  });
  await target.press('ArrowRight');
  await expect(row.locator('.target-summary')).toContainText('Custom · C4 +1¢');
  await expect(row.locator('.range-readouts')).toContainText('Min -25¢');
  await expect(row.locator('.range-readouts')).toContainText('Max +25¢');
  await setSlider(target, '18');
  await setSlider(
    page.getByRole('slider', { name: 'Flute minimum pitch', exact: true }),
    '-32',
  );
  await setSlider(
    page.getByRole('slider', { name: 'Flute maximum pitch', exact: true }),
    '58',
  );
  await expect(row.locator('.range-readouts')).toContainText('Min -50¢');
  await expect(row.locator('.range-readouts')).toContainText('Max +40¢');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  expect((await saved(page)).configs.Flute).toEqual({
    pitch: 'C4',
    offset: 18,
    min: -50,
    max: 40,
  });
  await page.reload();
  await page
    .getByRole('button', { name: 'Classes & settings', exact: true })
    .click();
  await expect(row.locator('.target-summary')).toContainText(
    'Custom · C4 +18¢',
  );
  await row.getByRole('button', { name: 'Reset to note' }).click();
  await expect(row.locator('.target-summary')).toContainText('On pitch');
  await expect(target).toHaveValue('0');
  await setSlider(
    page.getByRole('slider', { name: 'Flute minimum pitch', exact: true }),
    '200',
  );
  await expect(row.locator('.range-readouts')).toContainText('Min 0¢');
  await selectTarget(page, 'Flute', 'A');
  await expect(row).toContainText('Staff and frequency preview use octave 4.');
});

test('graphical detection values and tuned playback feed actual measurement', async ({
  page,
}) => {
  await selectTarget(page, 'Flute', 'A4');
  await setSlider(
    page.getByRole('slider', { name: 'Flute target adjustment', exact: true }),
    '18',
  );
  for (const [label, value] of [
    ['A4 reference', '442'],
    ['Steady hold', '0.7'],
    ['Allowed pitch spread', '20'],
    ['Noise gate', '0.01'],
  ]) {
    const slider = page.getByRole('slider', { name: new RegExp(label) });
    await slider.press('ArrowRight');
    await expect(slider.locator('..').locator('output')).toContainText(
      await slider.inputValue(),
    );
    await setSlider(slider, value);
    await expect(slider.locator('..').locator('output')).toContainText(value);
  }
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  expect((await saved(page)).settings).toMatchObject({
    a4: 442,
    hold: 0.7,
    stability: 20,
    gate: 0.01,
  });
  await page.getByRole('button', { name: 'Session', exact: true }).click();
  await settings(page);
  await page.getByRole('button', { name: 'Hear target', exact: true }).click();
  const hz = 442 * 2 ** (18 / 1200);
  expect(
    await page.evaluate(() => window.syntheticAudio.oscillatorFrequency),
  ).toBeCloseTo(hz, 8);
  await page.clock.runFor(2400);
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0);
  await sound(page, hz, 1200);
  expect((await saved(page)).sessions[0].attempts[0]).toMatchObject({
    status: 'correct',
    target: { pitch: 'A4', offset: 18 },
  });
});

test('target and detection sliders remain visible and draggable on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const target = page.getByRole('slider', {
    name: 'Flute target adjustment',
    exact: true,
  });
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  expect(Number(await target.inputValue())).toBeGreaterThan(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test('saving untouched sliders preserves imported fractional settings and tuning', async ({
  page,
}) => {
  const data = await saved(page);
  data.schema = 2;
  data.configs.Flute.offset = 18.25;
  data.settings.a4 = 442.125;
  data.settings.hold = 0.75;
  data.settings.stability = 20.5;
  data.settings.gate = 0.0125;
  await page.evaluate(
    (data) =>
      localStorage.setItem('mouthpiece.pitchtracker.v1', JSON.stringify(data)),
    data,
  );
  await page.reload();
  await page
    .getByRole('button', { name: 'Classes & settings', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  expect((await saved(page)).configs.Flute.offset).toBe(18.25);
  expect((await saved(page)).settings).toEqual(data.settings);
});
