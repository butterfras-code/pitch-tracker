import { sessionControl } from '../fixtures/session-controls';
import { expect, test } from '@playwright/test';
import {
  classroomPage,
  dismissFeedback,
  saved,
} from '../fixtures/classroom-page';

for (const width of [390, 1440]) {
  test(`toy theme preserves session geometry and selection at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await classroomPage(page);
    // Mobile hides the picker during sessions; use its normal change event.
    const picker = page.locator('#themeSelect');
    const student = page.locator('.current-display');
    const geometry = () =>
      student.evaluate((element) => {
        const style = getComputedStyle(element);
        return [
          style.width,
          style.height,
          style.padding,
          style.gap,
          style.gridTemplateColumns,
        ];
      });
    const before = await geometry();
    const data = await saved(page);
    await student.evaluate((element) =>
      element.setAttribute('data-retained', 'yes'),
    );
    await picker.selectOption('big-button', { force: true });
    await expect(picker.locator('option:checked')).toHaveText('Pithcer-Frice');
    await expect(page.locator('html')).toHaveAttribute('data-treatment', 'toy');
    expect(await geometry()).toEqual(before);
    await expect(student).toHaveAttribute('data-retained', 'yes');
    expect(await saved(page)).toEqual(data);
    await expect(
      page.locator('.tuner-section[data-live-practice] .tuner'),
    ).toHaveCSS('background-color', 'rgb(0, 84, 189)');
    await expect(page.locator('.session-target[data-live-practice]')).toHaveCSS(
      'color',
      'rgb(255, 252, 240)',
    );
    await expect(page.locator('[data-ui-click="reference-tone"]')).toHaveCSS(
      'background-color',
      'rgb(226, 35, 26)',
    );
    await page.screenshot({
      path: testInfo.outputPath(`big-button-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(picker).toHaveValue('big-button');
    await picker.selectOption('pitch-press', { force: true });
    await expect(
      page.locator('.session-target[data-live-practice]'),
    ).not.toHaveCSS('color', 'rgb(255, 252, 240)');
    await picker.selectOption('big-button', { force: true });
    await page
      .getByRole('button', { name: 'Next student', exact: true })
      .click();
    await expect(page.locator('#studentIdentity')).toContainText('Lucas');
  });
}

for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]) {
  test.describe(`toy split ${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      contextOptions: { screen: { width, height } },
    });
    test('grille stays behind readable panels and resets on theme switch', async ({
      page,
    }, testInfo) => {
      await classroomPage(page, 32);
      await sessionControl(page, 'Split View');
      if (width > 390) {
        await sessionControl(page, 'Full screen');
        await expect
          .poll(() => page.evaluate(() => !!document.fullscreenElement))
          .toBe(true);
      }
      const picker = page.locator('#themeSelect');
      await picker.selectOption('big-button', { force: true });
      await expect(page.locator('body')).toHaveCSS(
        'background-size',
        '8px 8px, 8px 8px',
      );
      await expect(page.locator('body')).toHaveCSS(
        'background-image',
        /radial-gradient/,
      );
      await expect(page.locator('.student.selected')).toHaveCSS(
        'background-color',
        'rgb(255, 224, 0)',
      );
      await page.screenshot({
        path: testInfo.outputPath(`toy-split-${width}.png`),
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
        await page.locator('.roster-scroll').evaluate((e) => {
          e.scrollTop = e.scrollHeight;
        });
        expect(
          await page.locator('.roster-scroll').evaluate((e) => e.scrollTop),
        ).toBeGreaterThan(0);
      }
      const data = await saved(page);
      await picker.selectOption('pitch-press', { force: true });
      await expect(page.locator('body')).not.toHaveCSS(
        'background-size',
        '8px 8px, 8px 8px',
      );
      await picker.selectOption('big-button', { force: true });
      expect(await saved(page)).toEqual(data);
      await page.locator('[data-ui-click="reference-tone"]').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-ui-click="reference-tone"]')).toHaveCSS(
        'outline-style',
        'solid',
      );
      await sessionControl(page, 'Class View');
      await expect(page.locator('.selected .target-readout')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Start listening', exact: true }),
      ).toBeVisible();
      await expect(page.locator('#cards')).toBeVisible();
      const inactive = page.locator('.inactive-practice');
      await expect(inactive.locator('.tuner').first()).toHaveCSS(
        'background-color',
        'rgb(220, 233, 244)',
      );
      await expect(inactive.locator('.session-target').first()).toHaveCSS(
        'background-image',
        'none',
      );
      await expect(inactive.locator('.meter').first()).toHaveCSS(
        'background-image',
        'none',
      );
      for (const state of ['low', 'correct', 'high']) {
        await page
          .locator('.tuner-section[data-live-practice] .' + state)
          .click();
        await dismissFeedback(page);
        await sessionControl(page, 'Next student');
        const result = inactive
          .locator(`[data-last-result='${state}']`)
          .first();
        await expect(result.locator('.' + state)).toHaveCSS(
          'animation-name',
          'none',
        );
        await expect(result.locator('.' + state)).toHaveCSS('opacity', '1');
        expect(
          await result.evaluate(
            (el) => getComputedStyle(el, '::before').content,
          ),
        ).toBe('none');
      }
      await page.screenshot({
        path: testInfo.outputPath('toy-class-off.png'),
        fullPage: true,
      });
    });
  });
}
