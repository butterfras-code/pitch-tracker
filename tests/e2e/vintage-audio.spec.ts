import { sessionControl } from '../fixtures/session-controls';
import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  dismissFeedback,
} from '../fixtures/classroom-page';

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
    test('Vintage Audio preserves the fullscreen session and resets cleanly', async ({
      page,
    }, testInfo) => {
      await classroomPage(page, 12);
      const picker = page.locator('#themeSelect');
      await picker.selectOption('big-button', { force: true });
      if (width > 390) {
        await page.getByRole('button', { name: /^split view$/i }).click();
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
      await picker.selectOption('vintage-audio', { force: true });
      await expect(page.locator('html')).toHaveAttribute(
        'data-treatment',
        'studio',
      );
      await page.evaluate(() => document.fonts.ready);
      expect(await geometry()).toEqual(before);
      expect(await shell!.evaluate((element) => element.isConnected)).toBe(
        true,
      );
      expect(await saved(page)).toEqual(data);
      for (const selector of ['body', '.current-display']) {
        await expect(page.locator(selector)).not.toHaveCSS(
          'background-image',
          /url\(/,
        );
      }
      await expect(page.locator('.session-target').first()).toHaveCSS(
        'background-color',
        'rgb(246, 205, 130)',
      );
      await expect(page.locator('.session-target').first()).toHaveCSS(
        'color',
        'rgb(32, 29, 22)',
      );
      await expect(
        page.locator('.tuner-section[data-live-practice] .tuner'),
      ).toHaveCSS('background-color', 'rgb(246, 205, 130)');
      await expect(page.locator('[data-ui-click="reference-tone"]')).toHaveCSS(
        'background-color',
        'rgb(166, 44, 33)',
      );
      const live = page.locator('.tuner-section[data-live-practice] .scorebar');
      for (const state of ['low', 'correct', 'high']) {
        await page.locator('#sessionShell').evaluate((element, range) => {
          (element as HTMLElement).dataset.range = range;
        }, state);
        await expect(live.locator('.' + state)).toHaveCSS(
          'animation-name',
          'vintage-lamp-on',
        );
        await expect(live.locator('.' + state)).toHaveCSS(
          'color',
          'rgb(32, 29, 22)',
        );
        await expect(live.locator('.' + state)).toHaveCSS(
          'background-image',
          /radial-gradient/,
        );
      }
      await live.locator('.low').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(live.locator('.high')).toBeFocused();
      await expect(live.locator('.high')).toHaveCSS('outline-style', 'solid');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(live.locator('.high')).toHaveCSS('animation-name', 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.screenshot({
        path: testInfo.outputPath(`vintage-audio-${width}.png`),
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
        .click();
      await expect(page.locator('#studentIdentity')).toContainText('Lucas');
      // Recorded results retain an illuminated lens on an inactive card.
      await page.getByRole('button', { name: /^class view$/i }).click();
      await page.locator('.tuner-section[data-live-practice] .correct').click();
      await dismissFeedback(page);
      await page
        .getByRole('button', { name: 'Next student', exact: true })
        .click();
      const recorded = page
        .locator('.inactive-practice [data-last-result="correct"]')
        .first();
      await expect(recorded.locator('.correct')).toHaveCSS('opacity', '1');
      await expect(recorded.locator('.correct')).toHaveCSS(
        'animation-name',
        'none',
      );
      await expect(recorded.locator('.correct')).toHaveCSS(
        'background-image',
        /radial-gradient/,
      );
      await expect(page.locator('.selected .session-target')).toHaveCSS(
        'background-color',
        'rgb(246, 205, 130)',
      );
      for (const selector of ['.session-target', '.tuner']) {
        await expect(
          page.locator('.inactive-practice ' + selector).first(),
        ).toHaveCSS('background-image', 'none');
        await expect(
          page.locator('.inactive-practice ' + selector).first(),
        ).not.toHaveCSS('background-color', 'rgb(246, 205, 130)');
      }
      await expect(page.locator('.selected')).toHaveCSS(
        'border-color',
        'rgb(255, 211, 129)',
      );
      await expect(page.locator('.selected')).toHaveCSS('box-shadow', /inset/);
      await page.screenshot({
        path: testInfo.outputPath('vintage-class.png'),
        fullPage: true,
      });
      await page.getByRole('button', { name: /^student view$/i }).click();
      await expect(page.locator('.current-display')).toBeVisible();
      await picker.selectOption('big-button', { force: true });
      await expect(
        page.locator('.tuner-section[data-live-practice] .tuner'),
      ).toHaveCSS('background-color', 'rgb(0, 84, 189)');
      await picker.selectOption('vintage-audio', { force: true });
      await page.reload();
      await expect(picker).toHaveValue('vintage-audio');
    });
  });
}
