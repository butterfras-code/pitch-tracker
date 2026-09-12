import { expect, test } from '@playwright/test';
import { classroomPage } from '../fixtures/classroom-page';

test('help starts with the microphone enhancements warning', async ({
  page,
}) => {
  await classroomPage(page);
  await page.getByRole('button', { name: 'Help', exact: true }).click();

  const helpPanel = page.locator('main > .panel');
  await expect(helpPanel.locator(':scope > :first-child')).toContainText(
    'Warning: turn off microphone enhancements',
  );
  await expect(helpPanel.locator('.notice')).toContainText(
    'find the microphone or audio-input settings in your operating system',
  );
});

for (const width of [390, 900, 1366, 1920]) {
  test(`header keeps navigation and utilities accessible at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await classroomPage(page);
    const header = page.getByRole('banner');
    const picker = page.getByRole('combobox', { name: 'Theme', exact: true });
    const themes = await picker
      .locator('option')
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );
    for (const theme of themes) {
      await picker.selectOption(theme);
      const geometry = await header.evaluate((el) => {
        const controls = [...el.querySelectorAll('button, select, h1')].map(
          (control) => control.getBoundingClientRect(),
        );
        return {
          height: el.getBoundingClientRect().height,
          contained: controls.every(
            (rect) => rect.left >= 0 && rect.right <= innerWidth,
          ),
          separated: controls.every((rect, i) =>
            controls
              .slice(i + 1)
              .every(
                (other) =>
                  rect.right <= other.left + 1 ||
                  other.right <= rect.left + 1 ||
                  rect.bottom <= other.top + 1 ||
                  other.bottom <= rect.top + 1,
              ),
          ),
        };
      });
      expect(geometry.contained, theme).toBe(true);
      expect(geometry.separated, theme).toBe(true);
      expect(geometry.height, theme).toBeLessThan(width >= 1200 ? 90 : 190);
      await expect(picker).toBeVisible();
      await expect(header.locator('#saveStatus')).toBeVisible();
      if (['big-button', 'pitch-press'].includes(theme)) {
        await page.screenshot({
          path: testInfo.outputPath(`header-${theme}-${width}.png`),
        });
      }
    }
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Help', exact: true }),
    ).toHaveClass('on');
    await expect(picker).toBeVisible();
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('button', { name: 'Resume session' }).click();
    await page
      .getByRole('button', { name: 'Full screen', exact: true })
      .click();
    if (await page.evaluate(() => !!document.fullscreenElement)) {
      await expect(header).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
      await page.evaluate(() => document.exitFullscreen());
      await expect(header).toBeVisible();
    }
  });
}
