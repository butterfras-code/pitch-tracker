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
    for (const name of ['Classes', 'Settings']) {
      await page.getByRole('button', { name, exact: true }).click();
      if (name === 'Classes')
        await page.getByRole('button', { name: 'Edit class' }).first().click();
      await expect(
        page.getByRole('heading', {
          name: name === 'Classes' ? 'Edit Band' : name,
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByLabel('Manage class')).toHaveCount(
        name === 'Classes' ? 1 : 0,
      );
      await expect(page.locator('#configTable')).toHaveCount(
        name === 'Settings' ? 1 : 0,
      );
      expect(
        await page.locator('main').evaluate((main) => main.scrollTop),
      ).toBe(0);
      const bounds = await page.locator('main').evaluate((main) => {
        main.scrollTop = main.scrollHeight;
        return {
          bottom: main.getBoundingClientRect().bottom,
          scroll: main.scrollTop,
          documentHeight: document.documentElement.scrollHeight,
          viewport: innerHeight,
        };
      });
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport + 0.001);
      expect(bounds.documentHeight).toBe(bounds.viewport);
      expect(bounds.scroll).toBeGreaterThan(0);
      await expect(
        page.getByRole('button', { name, exact: true }),
      ).toBeInViewport();
      if (name === 'Settings')
        await expect(
          page.getByRole('button', { name: 'Save session defaults' }),
        ).toBeInViewport();
    }
  });
}
