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
    await page.getByRole('button', { name: 'Session', exact: true }).click();
    await page
      .getByRole('button', { name: 'Student view', exact: true })
      .click();
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
      .locator('.student-actions [data-ui-click="next-student"]')
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
    await page.getByRole('button', { name: 'Session', exact: true }).click();
    await page.getByRole('button', { name: 'Class view', exact: true }).click();
    await expect(page.locator('.session-target')).toBeHidden();
    await expect(page.locator('#cards')).toBeVisible();
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
