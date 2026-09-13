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
    await sessionControl(page, 'Student view');
    await expect(page.locator('.press-brand')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Pitch Tracker', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.target-pitch')).toHaveText('A4');
    await expect(page.locator('.target-frequency')).toHaveText('440.0 Hz');
    await expect(page.locator('.session-target')).toBeVisible();
    await page.locator('.target-playback').click();
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
    await theme.selectOption('cel-mech');
    await expect(page.locator('.session-target')).toBeVisible();
    await expect(page.locator('.press-brand')).toBeHidden();
    await expect(page.locator('.standard-brand')).toBeVisible();
    await expect(page.locator('#studentIdentity h2')).toHaveText('Lucas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await theme.selectOption('pitch-press');
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('button', { name: 'Resume session' }).click();
    await sessionControl(page, 'Class view');
    await expect(page.locator('.selected .target-readout')).toBeVisible();
    await expect(page.locator('#pauseListening')).toBeVisible();
    await expect(page.locator('#cards')).toBeVisible();
    await sessionControl(page, 'Student view');
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
      await sessionControl(page, 'Split view');
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
      await expect(page.locator('.session-target')).toHaveCSS(
        'background-color',
        'rgb(21, 21, 21)',
      );
      await expect(page.locator('.session-target')).toHaveCSS(
        'color',
        'rgb(255, 249, 234)',
      );
      await expect(page.locator('.target-frequency')).toHaveCSS(
        'color',
        'rgb(255, 249, 234)',
      );
      await expect(page.locator('.current-display')).toHaveCSS(
        'background-color',
        'rgb(255, 249, 234)',
      );
      await expect(page.locator('.student.selected')).toHaveCSS(
        'background-color',
        'rgb(255, 230, 0)',
      );
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
      await picker.selectOption('cel-mech', { force: true });
      await expect(page.locator('.session-target')).not.toHaveCSS(
        'background-color',
        'rgb(21, 21, 21)',
      );
      await picker.selectOption('pitch-press', { force: true });
      expect(await saved(page)).toEqual(data);
      await page.keyboard.press('Tab');
      await page.locator('.target-playback').focus();
      await expect(page.locator('.target-playback')).toHaveCSS(
        'outline-style',
        'solid',
      );
      await expect(page.locator('.target-playback')).toHaveCSS(
        'outline-color',
        'rgb(255, 230, 0)',
      );
    });
  });
}
