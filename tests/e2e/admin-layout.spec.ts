import { expect, test } from '@playwright/test';
import { classroomPage } from '../fixtures/classroom-page';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Classes and Settings scroll within the viewport at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await classroomPage(page, 80);
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('button', { name: 'Edit class' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Edit Band', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Manage class')).toBeVisible();
    const main = page.locator('main');
    expect(await main.evaluate((el) => el.scrollTop)).toBe(0);
    await main.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    expect(await main.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(
      page.getByRole('button', { name: 'Settings', exact: true }),
    ).toBeInViewport();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    for (const section of ['Instruments', 'Detection', 'Defaults']) {
      await page.getByRole('button', { name: section, exact: true }).click();
      await expect(
        page.getByRole('heading', { name: section, exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Manage class')).toHaveCount(0);
      await expect(page.locator('#configTable')).toHaveCount(
        section === 'Instruments' ? 1 : 0,
      );
      const bounds = await main.evaluate((el) => ({
        bottom: el.getBoundingClientRect().bottom,
        scroll: el.scrollTop,
        documentHeight: document.documentElement.scrollHeight,
        viewport: innerHeight,
      }));
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport + 0.001);
      expect(bounds.documentHeight).toBe(bounds.viewport);
      expect(bounds.scroll).toBe(0);
      // The pane owns overflow; navigation and draft actions remain reachable.
      await page.locator('.settings-pane-scroll').evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(
        page.getByRole('button', { name: section, exact: true }),
      ).toBeInViewport();
      if (section === 'Instruments')
        await expect(
          page.getByRole('button', { name: 'Save settings', exact: true }),
        ).toBeInViewport();
      else if (section === 'Detection')
        await expect(
          page.getByRole('slider', { name: /Noise gate/ }),
        ).toBeInViewport();
      else await expect(page.getByLabel('Starting view')).toBeInViewport();
    }
  });
}
