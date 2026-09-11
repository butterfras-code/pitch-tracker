import { expect, test } from '@playwright/test';
import { classroomPage } from '../fixtures/classroom-page';

test('session settings open from the side navigation in a light-dismissible popover', async ({
  page,
}) => {
  await classroomPage(page);
  const trigger = page.getByRole('button', {
    name: 'Session behavior settings',
    exact: true,
  });
  const popover = page.locator('#behaviorSettings');

  await expect(popover).toHaveAttribute('popover', 'auto');
  await expect(popover).toBeHidden();
  await trigger.click();
  await expect(popover).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(popover).toHaveCSS('position', 'fixed');

  await popover.getByRole('button', { name: 'Close settings' }).click();
  await expect(popover).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await trigger.click();
  await expect(popover).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
