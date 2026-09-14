import { expect, test } from '@playwright/test';
import {
  classroomPage,
  dismissFeedback,
  saved,
  sound,
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
              /url\("([^"]+)"\)/,
            )?.[1];
          if (!url?.startsWith('data:image/svg+xml,')) return false;
          const image = new Image();
          image.src = url;
          await image.decode();
          return image.naturalWidth > 0;
        }),
      ).toBe(true);
      await expect(target.locator('.target-pitch')).toHaveText('A4');
      await expect(target).toHaveCSS('color', 'rgb(215, 255, 255)');
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
      await expect(stage).toHaveCSS(
        'background-clip',
        'padding-box, padding-box, border-box',
      );
      await expect(page.locator('.student .name').first()).toHaveCSS(
        'font-family',
        '"Pitch Press", Impact, sans-serif',
      );
      await expect(page.locator('[data-ui-click="reference-tone"]')).toHaveCSS(
        'background-image',
        /linear-gradient/,
      );
      await page
        .getByRole('button', { name: 'Start listening', exact: true })
        .click();
      await expect
        .poll(() =>
          stage.evaluate(
            (element) => getComputedStyle(element, '::after').animationName,
          ),
        )
        .toBe('b-pop-sigil-pulse');
      const meter = page.locator('.tuner-section[data-live-practice] .meter');
      await expect(meter).toHaveCSS('animation-name', 'b-pop-laser-sweep');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(meter).toHaveCSS('animation-name', 'none');
      await expect
        .poll(() =>
          stage.evaluate(
            (element) => getComputedStyle(element, '::after').animationName,
          ),
        )
        .toBe('none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page
        .getByRole('button', { name: 'Pause listening', exact: true })
        .click();
      await expect(meter).toHaveCSS('animation-name', 'none');
      await expect
        .poll(() =>
          stage.evaluate(
            (element) => getComputedStyle(element, '::after').animationName,
          ),
        )
        .toBe('none');
      for (const [state, color] of [
        ['low', 'rgb(102, 236, 255)'],
        ['correct', 'rgb(154, 255, 105)'],
        ['high', 'rgb(255, 139, 213)'],
      ]) {
        await page.locator('#sessionShell').evaluate((element, state) => {
          (element as HTMLElement).dataset.range = state;
        }, state);
        await expect(live.locator('.' + state)).toHaveCSS(
          'animation-name',
          'b-pop-key-sheen',
        );
        if (state === 'correct') {
          await expect(stage).toHaveCSS('box-shadow', /154, 255, 105/);
          await page.screenshot({
            path: testInfo.outputPath('split-in-range.png'),
            fullPage: true,
          });
        }
        await expect(live.locator('.' + state)).toHaveCSS(
          'background-color',
          color,
        );
        await expect(live.locator('.' + state)).toHaveCSS(
          'color',
          'rgb(5, 8, 14)',
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
      await expect(page.locator('.inactive-practice .meter').first()).toHaveCSS(
        'background-image',
        'none',
      );
      await expect(
        page.locator('.inactive-practice .needle').first(),
      ).toHaveCSS('box-shadow', 'none');
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
          'animation-name',
          'none',
        );
        await expect(recorded.locator('.' + state)).toHaveCSS(
          'color',
          'rgb(5, 8, 14)',
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

test('stage lighting follows actual pitch detection and resets for the next performer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await classroomPage(page);
  await page.locator('#themeSelect').selectOption(themeId);
  await sessionControl(page, 'Full screen');
  const stage = page.locator('.current-display');
  await page
    .getByRole('button', { name: 'Start listening', exact: true })
    .click();
  await sound(page, 0, 3200);
  await sound(page, 440, 800);
  await expect(page.locator('#sessionShell')).toHaveAttribute(
    'data-result',
    'correct',
  );
  await dismissFeedback(page);
  await expect(stage).toHaveCSS('box-shadow', /154, 255, 105/);
  expect((await saved(page)).sessions[0].attempts.at(-1)?.status).toBe(
    'correct',
  );
  await page.screenshot({
    path: testInfo.outputPath('detected-in-range.png'),
    fullPage: true,
  });
  // A previous success must not keep the stage green during a new low/high reading.
  // Freeze the detector while exercising the appearance boundary independently.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  for (const range of ['low', 'high']) {
    await page.locator('#sessionShell').evaluate((element, range) => {
      (element as HTMLElement).dataset.range = range;
    }, range);
    await expect(stage).not.toHaveCSS('box-shadow', /154, 255, 105/);
  }
  await page.locator('#sessionShell').evaluate((element) => {
    (element as HTMLElement).dataset.range = '';
  });
  await expect(stage).toHaveCSS('box-shadow', /154, 255, 105/);
  const liveNode = await page.locator('#liveNote').elementHandle();
  await page
    .locator('#themeSelect')
    .selectOption('lisa-lives', { force: true });
  await expect(stage).not.toHaveCSS('box-shadow', /154, 255, 105/);
  expect(
    await stage.evaluate(
      (element) => getComputedStyle(element, '::after').content,
    ),
  ).toBe('none');
  await expect(
    page.locator('.tuner-section[data-live-practice] .meter'),
  ).toHaveCSS('animation-name', 'none');
  await page.locator('#themeSelect').selectOption(themeId, { force: true });
  expect(await liveNode!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.locator('#pauseListening')).toHaveAttribute(
    'data-microphone',
    'on',
  );
  await sound(page, 0, 3500);
  await sessionControl(page, 'Next student');
  await expect(page.locator('#sessionShell')).toHaveAttribute(
    'data-result',
    '',
  );
  await expect(stage).not.toHaveCSS('box-shadow', /154, 255, 105/);
  await sessionControl(page, 'Class View');
  const selected = page.locator('.student.selected');
  await expect
    .poll(() =>
      selected.evaluate(
        (element) => getComputedStyle(element, '::after').animationName,
      ),
    )
    .toBe('b-pop-sigil-pulse');
  const recorded = page.locator('.student:has([data-last-result="correct"])');
  await expect(recorded).toHaveCSS(
    'background-image',
    /color\(srgb 0\.60392\d* 1 0\.41176\d* \/ 0\.17\)/,
  );
  expect(
    await recorded.evaluate(
      (element) => getComputedStyle(element, '::after').content,
    ),
  ).toBe('none');
  await page
    .getByRole('button', { name: 'Pause listening', exact: true })
    .click();
  await expect
    .poll(() =>
      selected.evaluate(
        (element) => getComputedStyle(element, '::after').animationName,
      ),
    )
    .toBe('none');
});
