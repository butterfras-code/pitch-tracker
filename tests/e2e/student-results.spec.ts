import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  dismissFeedback,
} from '../fixtures/classroom-page';

test('fullscreen split cards show latest session results across rounds and reloads', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await classroomPage(page);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  const card = page.locator('.student').first();
  await expect(card.locator('.student-result, .badge')).toHaveCount(0);
  for (const result of ['Too low', 'Too high', 'In range']) {
    await page
      .locator('.current-display')
      .getByRole('button', { name: result, exact: true })
      .click();
    await expect(card.locator('.student-result, .badge')).toHaveText(result);
    await dismissFeedback(page);
  }
  await page
    .getByRole('button', { name: 'Undo last change', exact: true })
    .click();
  await expect(card.locator('.student-result, .badge')).toHaveText('Too high');
  for (let i = 0; i < 3; i++)
    await page
      .getByRole('button', { name: 'Next student', exact: true })
      .click();
  await page
    .getByRole('button', { name: 'Another round', exact: true })
    .click();
  await expect(card.locator('.student-result, .badge')).toHaveText('Too high');
  await page.reload();
  await expect(card.locator('.student-result, .badge')).toHaveText('Too high');
  await expect(page.locator('#cards')).not.toContainText('Not yet tried');
});

for (const width of [390, 1920]) {
  test(`result skins and corner attendance toggle at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await classroomPage(page);
    const card = page.locator('.student').first();
    for (const theme of [
      'cel-mech',
      'pitch-press',
      'big-button',
      'lisa-lives',
    ]) {
      await page.evaluate(
        (theme) =>
          localStorage.setItem('mouthpiece.pitchtracker.theme.v1', theme),
        theme,
      );
      await page.reload();
      await page
        .getByRole('button', { name: 'Split view', exact: true })
        .click();
      await card.getByRole('button', { name: 'Maya', exact: true }).click();
      if (width === 1920)
        await page
          .getByRole('button', { name: 'Full screen', exact: true })
          .click();
      for (const status of ['low', 'correct', 'high']) {
        await page.locator(`.tuner-section button.${status}`).click();
        await dismissFeedback(page);
        await page.locator('#roundLabel').hover();
        const skin = (el: Element) => {
          const css = getComputedStyle(el);
          return [
            css.color,
            css.backgroundColor,
            css.backgroundImage.length,
            css.border,
            css.borderRadius,
            css.boxShadow,
            css.fontWeight,
          ];
        };
        expect(await card.locator('.student-result').evaluate(skin)).toEqual(
          await page.locator(`.tuner-section button.${status}`).evaluate(skin),
        );
      }
      await card.scrollIntoViewIfNeeded();
      const toggle = card.getByRole('button', { name: 'Absent', exact: true });
      const bounds = (await card.boundingBox())!;
      const icon = (await toggle.boundingBox())!;
      expect(
        Math.abs(bounds.x + bounds.width - icon.x - icon.width),
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(bounds.y + bounds.height - icon.y - icon.height),
      ).toBeLessThanOrEqual(2);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect((await saved(page)).sessions[0].absent).toContain('student-1');
      await expect(card.locator('.student-result')).toHaveText('Too high');
      await expect(card.locator('input[type="checkbox"]')).toHaveCount(0);
      await toggle.press('Space');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect((await saved(page)).sessions[0].absent).not.toContain('student-1');
      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${width}.png`),
      });
    }
  });
}
