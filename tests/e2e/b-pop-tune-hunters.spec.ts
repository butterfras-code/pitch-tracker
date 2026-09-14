import { expect, test } from '@playwright/test';
import {
  classroomPage,
  dismissFeedback,
  saved,
} from '../fixtures/classroom-page';
import { sessionControl } from '../fixtures/session-controls';

const themeId = 'b-pop-tune-hunters';
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]) {
  test.describe(`B Pop Tune Hunters ${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      contextOptions: { screen: { width, height } },
    });
    test('bundled stage art, feedback and theme switching preserve the session', async ({
      page,
    }, testInfo) => {
      const requests: string[] = [];
      page.on('request', (request) => {
        if (/^https?:/.test(request.url())) requests.push(request.url());
      });
      await classroomPage(page, 30);
      const picker = page.locator('#themeSelect');
      await picker.selectOption('vintage-audio', { force: true });
      await sessionControl(page, 'Split View');
      if (width > 390) {
        await sessionControl(page, 'Full screen');
        await expect
          .poll(() => page.evaluate(() => !!document.fullscreenElement))
          .toBe(true);
      }
      const stage = page.locator('.current-display');
      const geometry = () =>
        stage.evaluate((element) => {
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
      await picker.selectOption(themeId, { force: true });
      await page.evaluate(() => document.fonts.ready);
      expect(await geometry()).toEqual(before);
      expect(await shell!.evaluate((element) => element.isConnected)).toBe(
        true,
      );
      expect(await saved(page)).toEqual(data);
      const target = page.locator('.session-target[data-live-practice]');
      expect(
        await target.evaluate(async (element) => {
          const url =
            getComputedStyle(element).backgroundImage.match(
              /url\("?([^")]+)/,
            )?.[1];
          if (!url?.startsWith('data:image/png;base64,')) return false;
          const image = new Image();
          image.src = url;
          await image.decode();
          return image.naturalWidth > 1000;
        }),
      ).toBe(true);
      await expect(target.locator('.target-pitch')).toHaveText('A4');
      await expect(target).toHaveCSS('color', 'rgb(185, 247, 255)');
      await expect(page.locator('#sessionUndo')).toBeDisabled();
      await page.screenshot({
        path: testInfo.outputPath('split.png'),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width > 390) {
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight,
          ),
        ).toBe(true);
        const roster = page.locator('.roster-scroll');
        await roster.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        expect(
          await roster.evaluate((element) => element.scrollTop),
        ).toBeGreaterThan(0);
      }
      const live = page.locator('.tuner-section[data-live-practice] .scorebar');
      for (const [state, color] of [
        ['low', 'rgb(128, 233, 255)'],
        ['correct', 'rgb(255, 218, 119)'],
        ['high', 'rgb(255, 154, 204)'],
      ]) {
        await page.locator('#sessionShell').evaluate((element, state) => {
          (element as HTMLElement).dataset.range = state;
        }, state);
        await expect(live.locator('.' + state)).toHaveCSS(
          'background-color',
          color,
        );
        await expect(live.locator('.' + state)).toHaveCSS(
          'color',
          'rgb(8, 7, 19)',
        );
      }
      await live.locator('.low').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(live.locator('.high')).toBeFocused();
      await expect(live.locator('.high')).toHaveCSS('outline-style', 'solid');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(live.locator('.high')).toHaveCSS('animation-name', 'none');
      await sessionControl(page, 'Class View');
      for (const state of ['low', 'correct', 'high']) {
        await page
          .locator('.tuner-section[data-live-practice] .' + state)
          .click();
        if (state === 'correct') {
          await page.screenshot({
            path: testInfo.outputPath('feedback.png'),
            fullPage: true,
          });
        }
        await dismissFeedback(page);
        await sessionControl(page, 'Next student');
        const recorded = page
          .locator(`.inactive-practice [data-last-result='${state}']`)
          .first();
        await expect(recorded.locator('.' + state)).toHaveCSS('opacity', '1');
        await expect(recorded.locator('.' + state)).toHaveCSS(
          'color',
          'rgb(8, 7, 19)',
        );
      }
      await expect(
        page.locator('.inactive-practice .session-target').first(),
      ).toHaveCSS('background-image', 'none');
      await page.screenshot({
        path: testInfo.outputPath('class.png'),
        fullPage: true,
      });
      await sessionControl(page, 'Student View');
      await page.locator('#studentIdentity h2').evaluate((element) => {
        element.textContent = 'Alexandria Montgomery-Santiago';
      });
      await stage.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({
        path: testInfo.outputPath('student-long-name.png'),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const recordedData = await saved(page);
      await picker.selectOption('vintage-audio', { force: true });
      await expect(target).toHaveCSS('background-color', 'rgb(246, 205, 130)');
      await expect(target).not.toHaveCSS('background-image', /url\(/);
      await page.screenshot({
        path: testInfo.outputPath('vintage-long-name-baseline.png'),
        fullPage: true,
      });
      await picker.selectOption(themeId, { force: true });
      expect(await saved(page)).toEqual(recordedData);
      if (width > 390) await sessionControl(page, 'Exit full screen');
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const draft = page.getByRole('slider', {
        name: 'Flute target adjustment',
        exact: true,
      });
      await draft.fill('18');
      const staff = page.locator('.pitch-staff').first();
      const artwork = await staff.innerHTML();
      await picker.selectOption('vintage-audio');
      await picker.selectOption(themeId);
      await expect(draft).toHaveValue('18');
      expect(await staff.innerHTML()).toBe(artwork);
      await page.screenshot({
        path: testInfo.outputPath('settings.png'),
        fullPage: true,
      });
      await page.reload();
      await expect(picker).toHaveValue(themeId);
      expect(requests).toEqual([]);
    });
  });
}
