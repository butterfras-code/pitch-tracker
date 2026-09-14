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
        await page.getByRole('button', { name: /^split view$/i }).click();
        await page.getByRole('button', { name: /^full screen$/i }).click();
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
        'rgb(0, 174, 239)',
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
      await page.getByRole('button', { name: /^class view$/i }).click();
      const inactive = page.locator('.inactive-practice').first();
      await expect(inactive.locator('.tuner')).toHaveCSS(
        'background-image',
        'none',
      );
      await expect(inactive.locator('.meter')).toHaveCSS(
        'background-image',
        'none',
      );
      await expect(inactive.locator('.session-target')).toHaveCSS(
        'background-image',
        'none',
      );
      await expect(page.locator('.student .name').first()).toHaveCSS(
        'font-family',
        /Boom Pow/,
      );
      const live = page.locator('.tuner-section[data-live-practice]');
      for (const [range, color] of [
        ['low', 'rgb(0, 174, 239)'],
        ['correct', 'rgb(255, 229, 0)'],
        ['high', 'rgb(236, 0, 140)'],
      ]) {
        await page.locator('#sessionShell').evaluate((el, range) => {
          el.dataset.range = range;
        }, range);
        await expect(live.locator('.' + range)).toHaveCSS(
          'animation-name',
          'comic-ink-pulse',
        );
        await expect(live.locator('.' + range)).toHaveCSS(
          'background-color',
          color,
        );
        await expect(inactive.locator('.' + range)).toHaveCSS(
          'animation-name',
          'none',
        );
      }
      await page.locator('#sessionShell').evaluate((el) => {
        el.dataset.range = 'correct';
      });
      expect(
        await page
          .locator('#liveNote')
          .evaluate((el) => getComputedStyle(el, '::before').animationName),
      ).toBe('comic-impact');
      await expect(live.locator('.correct')).toHaveCSS('border-radius', '0px');
      // Freeze the action beat to review its full visual footprint.
      await live.evaluate((el) => {
        for (const animation of el.getAnimations({ subtree: true })) {
          animation.pause();
          animation.currentTime = 300;
        }
      });
      await page.screenshot({
        path: testInfo.outputPath('boom-class.png'),
        fullPage: true,
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(live.locator('.correct')).toHaveCSS(
        'animation-name',
        'none',
      );
      expect(
        await page
          .locator('#liveNote')
          .evaluate((el) => getComputedStyle(el, '::before').animationName),
      ).toBe('none');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole('button', { name: /^student view$/i }).click();
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
