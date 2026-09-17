import { expect, test } from '@playwright/test';
import { classroomPage, sound } from '../fixtures/classroom-page';

test.beforeEach(async ({ page }) => {
  await classroomPage(page, 1);
  await page.getByRole('button', { name: 'Tuner', exact: true }).click();
});

test('tuner mode uses a selected transposition and target for live feedback', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: 'Pitch Tracker' }),
  ).toBeVisible();
  await page.getByLabel('Transposition').selectOption('bb');
  await expect(page.getByText('Sounds G4 in concert pitch')).toBeVisible();
  await expect(page.getByText('B♭ transposed pitch')).toBeVisible();

  await page.getByRole('button', { name: 'Start listening' }).click();
  await sound(page, 0, 400);
  await sound(page, 392, 800);

  await expect(page.locator('#liveNote')).toHaveText('G4');
  await expect(page.locator('#writtenLiveNote')).toHaveText('A4');
  await expect(page.locator('#tunerStreak')).toHaveText('1');
  await expect(
    page.locator('.tuner-feedback [data-status="correct"]'),
  ).toHaveAttribute('aria-current', 'true');

  await sound(page, 0, 500);
  await sound(page, 440, 800);
  await expect(page.locator('#tunerStreak')).toHaveText('0');
  await expect(page.locator('#tunerResult')).toContainText('streak reset');
});

test('target changes reset the transient streak and concert mode has one note display', async ({
  page,
}) => {
  await expect(page.locator('.transposed-note')).toBeHidden();
  await page.getByRole('button', { name: 'Start listening' }).click();
  await sound(page, 440, 800);
  await expect(page.locator('#tunerStreak')).toHaveText('1');

  await page.getByLabel('Target note').selectOption('C');
  await expect(page.locator('#tunerStreak')).toHaveText('0');
  await expect(page.locator('.tuner-target-summary strong')).toHaveText('C4');
  await expect(page.locator('#tunerResult')).toContainText('begin a streak');
});

test('tuner controls remain reachable on phones and in full screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    )
    .toBe(true);
  const workspace = page.locator('.tuner-only-workspace');
  expect(
    await workspace.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await workspace.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByText('Hold the target note')).toBeInViewport();

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(page.getByLabel('Transposition')).toBeVisible();
  await expect(page.locator('.tuner-feedback')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Exit full screen', exact: true }),
  ).toBeVisible();
});
