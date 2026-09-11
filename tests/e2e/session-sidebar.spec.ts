import { expect, test } from '@playwright/test';
import { classroomPage } from '../fixtures/classroom-page';

for (const [width, height] of [
  [1440, 900],
  [390, 844],
  [844, 390],
]) {
  test(`session panels stay inside the viewport across themes at ${width}x${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await classroomPage(page, 80);
    for (const theme of ['cel-mech', 'pitch-press']) {
      await page.evaluate((id) => {
        const select =
          document.querySelector<HTMLSelectElement>('#themeSelect')!;
        select.value = id;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, theme);
      for (const view of ['Student', 'Split', 'Class']) {
        await page
          .getByRole('button', { name: view + ' view', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Hide controls', exact: true })
          .click();
        await expect(page.locator('#sessionSidebar')).toBeHidden();
        const bounds = await page.evaluate(() => {
          const panels = [
            ...document.querySelectorAll<HTMLElement>(
              '.current-display, .roster-area, #cards',
            ),
          ].filter((el) => el.getClientRects().length);
          return (
            panels.every((el) => {
              const rect = el.getBoundingClientRect();
              return (
                rect.bottom <= innerHeight + 1 &&
                rect.right <= innerWidth + 1 &&
                rect.height > 0
              );
            }) &&
            document.documentElement.scrollHeight <= innerHeight + 1 &&
            document.documentElement.scrollWidth <= innerWidth
          );
        });
        expect(bounds, `${theme} ${view}`).toBe(true);
        if (view === 'Class') {
          expect(
            await page
              .locator('#cards')
              .evaluate((el) => el.scrollHeight > el.clientHeight),
          ).toBe(true);
          await page.locator('#cards').evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          expect(await page.evaluate(() => scrollY)).toBe(0);
        }
        if (theme === 'pitch-press' && view === 'Student') {
          await page.screenshot({
            path: testInfo.outputPath(`session-${width}.png`),
          });
        }
        await page
          .getByRole('button', { name: 'Show controls', exact: true })
          .click();
        await expect(
          page.getByRole('button', { name: 'Next student', exact: true }),
        ).toBeVisible();
      }
    }
    await page
      .getByRole('button', { name: 'Full screen', exact: true })
      .click();
    if (await page.evaluate(() => !!document.fullscreenElement)) {
      await expect(page.locator('body > header')).toBeHidden();
      await page
        .getByRole('button', { name: 'Hide controls', exact: true })
        .click();
      await expect(page.locator('#cards')).toBeInViewport();
      await page.evaluate(() => document.exitFullscreen());
      await expect(page.locator('body > header')).toBeVisible();
    }
  });
}

test('the two canonical themes share session content and retain active controls', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await classroomPage(page);
  expect(await page.locator('#themeSelect option').allTextContents()).toEqual(
    expect.arrayContaining(['Cel-Shaded Mech', 'Pitch Press']),
  );
  await page.getByRole('button', { name: 'Student view', exact: true }).click();
  const student = await page.locator('.current-display').elementHandle();
  const signatures = [];
  for (const theme of ['cel-mech', 'pitch-press']) {
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption(theme);
    await expect(page.locator('.target-pitch')).toHaveText('A4');
    await expect(page.locator('.target-frequency')).toHaveText('440.0 Hz');
    await expect(
      page.getByRole('button', { name: 'Hear current target', exact: true }),
    ).toBeVisible();
    signatures.push(
      await page.locator('.current-display').evaluate((el) =>
        [...el.children].map((child) => {
          const css = getComputedStyle(child);
          return [child.id || child.className, css.display, css.order];
        }),
      ),
    );
    expect(await student!.evaluate((el) => el.isConnected)).toBe(true);
    await page
      .getByRole('button', { name: 'Hide controls', exact: true })
      .click();
    await page.screenshot({
      path: testInfo.outputPath(`${theme}-student.png`),
    });
    await page
      .getByRole('button', { name: 'Show controls', exact: true })
      .click();
  }
  expect(signatures[0]).toEqual(signatures[1]);
  await page.getByRole('button', { name: 'Next student', exact: true }).click();
  await expect(page.locator('#studentIdentity h2')).toHaveText('Lucas');
});

test('metadata sits in the panel margin; show control restores keyboard focus', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await classroomPage(page, 30);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect(page.locator('.session-top')).toHaveCount(0);
  await expect(page.locator('.current-display .session-meta')).toContainText(
    'Rehearsal',
  );
  await expect(page.locator('.current-display #roundLabel')).toContainText(
    '30 played',
  );
  await expect(page.locator('#sessionSidebar #hideControls')).toBeVisible();
  const top = await page
    .locator('.session-workspace')
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(
    await page
      .locator('.current-display')
      .evaluate((el) => el.getBoundingClientRect().top),
  ).toBeCloseTo(top, 0);
  await page.screenshot({ path: testInfo.outputPath('controls-visible.png') });
  await page.locator('#hideControls').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#sessionSidebar')).toBeHidden();
  await expect(page.locator('#showControls')).toBeFocused();
  await expect(page.locator('#showControls')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  const placement = await page.evaluate(() => {
    const show = document
      .querySelector('#showControls')!
      .getBoundingClientRect();
    const panel = document
      .querySelector('.current-display')!
      .getBoundingClientRect();
    const name = document
      .querySelector('.student-heading')!
      .getBoundingClientRect();
    return (
      show.left >= panel.left &&
      show.left - panel.left <= 24 &&
      show.top >= panel.top &&
      show.bottom <= name.top
    );
  });
  expect(placement).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('controls-hidden.png') });
  await page.keyboard.press('Enter');
  await expect(page.locator('#hideControls')).toBeFocused();
  await expect(page.locator('#showControls')).toBeHidden();
  await expect(page.locator('#sessionSidebar')).toBeVisible();
});
