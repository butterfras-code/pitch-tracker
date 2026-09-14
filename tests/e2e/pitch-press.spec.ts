import { sessionControl } from '../fixtures/session-controls';
import { expect, test } from '@playwright/test';
import { classroomPage, saved, sound } from '../fixtures/classroom-page';

for (const width of [390, 1440]) {
  test(`Pitch Press poster works offline and resets cleanly at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await classroomPage(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
    await theme.selectOption('pitch-press');
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('button', { name: 'Resume session' }).click();
    await sessionControl(page, 'Student View');
    await expect(page.locator('.press-brand')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Pitch Tracker', exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.session-target[data-live-practice] .target-pitch'),
    ).toHaveText('A4');
    await expect(
      page.locator('.session-target[data-live-practice] .target-frequency'),
    ).toHaveText('440.0 Hz');
    await expect(
      page.locator('.session-target[data-live-practice]'),
    ).toBeVisible();
    await page.locator('[data-ui-click="reference-tone"]').click();
    await expect
      .poll(() =>
        page.evaluate(() => window.syntheticAudio.oscillatorFrequency),
      )
      .toBe(440);
    await page
      .getByRole('button', { name: 'Start listening', exact: true })
      .click();
    await sound(page, 0, 3200);
    await sound(page, 440, 800);
    await expect(page.locator('#sessionShell')).toHaveAttribute(
      'data-result',
      'correct',
    );
    expect((await saved(page)).sessions[0].attempts.at(-1)?.status).toBe(
      'correct',
    );
    await sound(page, 0, 3500);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`press-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator('.student-heading [data-ui-click="next-student"]')
      .click();
    await expect(page.locator('#studentIdentity h2')).toHaveText('Lucas');
    await expect(page.locator('#sessionShell')).toHaveAttribute(
      'data-result',
      '',
    );
    await theme.selectOption('big-button');
    await expect(
      page.locator('.session-target[data-live-practice]'),
    ).toBeVisible();
    await expect(page.locator('.press-brand')).toBeHidden();
    await expect(page.locator('.standard-brand')).toBeVisible();
    await expect(page.locator('#studentIdentity h2')).toHaveText('Lucas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await theme.selectOption('pitch-press');
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('button', { name: 'Resume session' }).click();
    await sessionControl(page, 'Class View');
    await expect(page.locator('.selected .target-readout')).toBeVisible();
    await expect(page.locator('#pauseListening')).toBeVisible();
    await expect(page.locator('#cards')).toBeVisible();
    await sessionControl(page, 'Student View');
    await page
      .getByRole('button', { name: 'Next student', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Next student', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Another round', exact: true })
      .click();
    await expect(page.locator('#studentIdentity h2')).toHaveText('Maya');
    await expect(page.locator('#sessionShell')).toHaveAttribute(
      'data-result',
      '',
    );
    expect((await saved(page)).sessions[0].attempts.at(-1)?.status).toBe(
      'correct',
    );
  });
}

for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]) {
  test.describe(`Pitch Press split ${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      contextOptions: { screen: { width, height } },
    });
    test('paper hierarchy stays readable offline without changing the workspace', async ({
      page,
    }, testInfo) => {
      await classroomPage(page, 30);
      await sessionControl(page, 'Split View');
      if (width > 390) {
        await sessionControl(page, 'Full screen');
        await expect
          .poll(() => page.evaluate(() => !!document.fullscreenElement))
          .toBe(true);
      }
      const picker = page.locator('#themeSelect');
      await picker.selectOption('pitch-press', { force: true });
      await page.evaluate(() => document.fonts.ready);
      const data = await saved(page);
      await expect(
        page.locator('.session-target[data-live-practice]'),
      ).toHaveCSS('background-color', 'rgb(21, 21, 21)');
      await expect(
        page.locator('.session-target[data-live-practice]'),
      ).toHaveCSS('color', 'rgb(255, 249, 234)');
      await expect(
        page.locator('.session-target[data-live-practice] .target-frequency'),
      ).toHaveCSS('color', 'rgb(255, 249, 234)');
      await expect(page.locator('.current-display')).toHaveCSS(
        'background-color',
        'rgb(255, 249, 234)',
      );
      await expect(page.locator('.student.selected')).toHaveCSS(
        'background-color',
        'rgb(21, 21, 21)',
      );
      await expect(page.locator('#studentIdentity h2')).toHaveCSS(
        'font-family',
        '"Press Wood", "Press Slab", Georgia, serif',
      );
      await expect(page.locator('.student.selected')).toHaveCSS(
        'border-style',
        'double',
      );
      await expect(page.locator('.student.selected')).toHaveCSS(
        'border-width',
        '4px',
      );
      await expect(page.locator('#liveHz')).toHaveCSS(
        'font-family',
        '"Courier New", Courier, monospace',
      );
      expect(
        await page.evaluate(() => document.fonts.check('18px "Press Wood"')),
      ).toBe(true);
      expect(
        await page.evaluate(async () => {
          const material = getComputedStyle(
            document.documentElement,
          ).getPropertyValue('--press-grain');
          const url = material
            .trim()
            .slice(4, -1)
            .replace(/^["']|["']$/g, '');
          const image = new Image();
          image.src = url;
          await image.decode();
          return image.naturalWidth > 0 && url.startsWith('data:');
        }),
      ).toBe(true);
      await expect(page.locator('.current-display')).toHaveCSS(
        'background-image',
        /url\("data:image/,
      );
      await expect(
        page.locator('.view-picker [aria-pressed="true"]'),
      ).toHaveCSS('color', 'rgb(255, 249, 234)');

      await expect(page.locator('.session-toolbar button').first()).toHaveCSS(
        'font-family',
        '"Press Wood", Georgia, serif',
      );
      expect(
        await page.evaluate(
          () => getComputedStyle(document.body, '::after').content,
        ),
      ).toContain('PLATE 04-B');
      expect(
        await page.evaluate(
          () => getComputedStyle(document.body, '::before').pointerEvents,
        ),
      ).toBe('none');
      const live = page.locator('.tuner-section[data-live-practice] .scorebar');
      await expect(live.locator('.low')).toHaveCSS(
        'background-color',
        'rgb(21, 21, 21)',
      );
      for (const [state, color] of [
        ['low', 'rgb(147, 47, 34)'],
        ['correct', 'rgb(41, 75, 50)'],
        ['high', 'rgb(24, 59, 96)'],
      ]) {
        await page.locator('#sessionShell').evaluate((element, range) => {
          (element as HTMLElement).dataset.range = range;
        }, state);
        await expect(live.locator('.' + state)).toHaveCSS(
          'background-color',
          color,
        );
        await expect(live.locator('.' + state)).toHaveCSS(
          'color',
          'rgb(255, 249, 234)',
        );
        await expect(live.locator('.' + state)).toHaveCSS(
          'animation-name',
          'press-strike',
        );
      }
      if (width === 1920) {
        await page.screenshot({
          path: testInfo.outputPath('press-live-high.png'),
          fullPage: true,
        });
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(live.locator('.high')).toHaveCSS('animation-name', 'none');
      await page.keyboard.press('Tab');
      await live.locator('.high').focus();
      await expect(live.locator('.high')).toHaveCSS('outline-style', 'solid');
      await page.locator('#sessionShell').evaluate((element) => {
        (element as HTMLElement).dataset.range = '';
      });
      await live
        .locator('.high')
        .evaluate((element) => (element as HTMLElement).blur());
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.screenshot({
        path: testInfo.outputPath(`press-split-${width}.png`),
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
        const cards = page.locator('.roster-scroll');
        await cards.evaluate((e) => {
          e.scrollTop = e.scrollHeight;
        });
        expect(await cards.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
      }
      await picker.selectOption('big-button', { force: true });
      await expect(
        page.locator('.session-target[data-live-practice]'),
      ).not.toHaveCSS('background-color', 'rgb(21, 21, 21)');
      expect(
        await page.evaluate(
          () => getComputedStyle(document.body, '::after').content,
        ),
      ).toBe('none');
      await picker.selectOption('pitch-press', { force: true });
      expect(await saved(page)).toEqual(data);
      await page.keyboard.press('Tab');
      await page.locator('[data-ui-click="reference-tone"]').focus();
      await expect(page.locator('[data-ui-click="reference-tone"]')).toHaveCSS(
        'outline-style',
        'solid',
      );
      await expect(page.locator('[data-ui-click="reference-tone"]')).toHaveCSS(
        'outline-color',
        'rgb(255, 249, 234)',
      );
    });
  });
}
