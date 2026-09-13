import { sessionControl } from '../fixtures/session-controls';
import { expect, test } from '@playwright/test';
import { classroomPage, saved } from '../fixtures/classroom-page';

for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]) {
  test.describe(`${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      contextOptions: { screen: { width, height } },
    });
    test('Boom Pow preserves the fullscreen session and resets cleanly', async ({
      page,
    }, testInfo) => {
      await classroomPage(page, 12);
      const picker = page.locator('#themeSelect');
      await picker.selectOption('big-button', { force: true });
      if (width > 390) {
        await sessionControl(page, 'Split view');
        await sessionControl(page, 'Full screen');
        await expect
          .poll(() => page.evaluate(() => !!document.fullscreenElement))
          .toBe(true);
      }
      const student = page.locator('.current-display');
      const geometry = () =>
        student.evaluate((element) => {
          const css = getComputedStyle(element);
          return [
            css.width,
            css.height,
            css.padding,
            css.gap,
            css.gridTemplateColumns,
          ];
        });
      const before = await geometry();
      const data = await saved(page);
      const shell = await page.locator('#sessionShell').elementHandle();
      await picker.selectOption('boom-pow', { force: true });
      await expect(page.locator('html')).toHaveAttribute(
        'data-treatment',
        'comic',
      );
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.fonts.check('20px "Boom Pow"')),
      ).toBe(true);
      expect(await geometry()).toEqual(before);
      expect(await shell!.evaluate((element) => element.isConnected)).toBe(
        true,
      );
      expect(await saved(page)).toEqual(data);
      // Large inline artwork must decode, not just appear in the CSS source.
      for (const selector of ['body']) {
        expect(
          await page.locator(selector).evaluate(async (element) => {
            const background = getComputedStyle(element).backgroundImage;
            const url = background.match(/url\(["']?(.*?)["']?\)/)?.[1];
            if (!url?.startsWith('data:image/png;base64,')) return false;
            const image = new Image();
            image.src = url;
            await image.decode();
            return image.naturalWidth > 0;
          }),
        ).toBe(true);
      }
      await expect(
        page.locator('.tuner-section[data-live-practice] .tuner'),
      ).toHaveCSS('background-color', 'rgb(255, 248, 232)');
      await expect(page.locator('[data-ui-click="reference-tone"]')).toHaveCSS(
        'background-color',
        'rgb(189, 32, 24)',
      );
      await page.screenshot({
        path: testInfo.outputPath(`boom-pow-${width}.png`),
        fullPage: true,
      });
      await page.locator('[data-ui-click="reference-tone"]').click();
      await expect
        .poll(() =>
          page.evaluate(() => window.syntheticAudio.oscillatorFrequency),
        )
        .toBe(440);
      await page
        .getByRole('button', { name: 'Next student', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#studentIdentity')).toContainText('Lucas');
      await picker.selectOption('big-button', { force: true });
      await expect(
        page.locator('.tuner-section[data-live-practice] .tuner'),
      ).toHaveCSS('background-color', 'rgb(0, 84, 189)');
      await picker.selectOption('boom-pow', { force: true });
      await page.reload();
      await expect(picker).toHaveValue('boom-pow');
    });
  });
}
