import { test, expect } from '@playwright/test';
import { classroomPage } from '../fixtures/classroom-page';

test('Alt+Enter toggles fullscreen from a focused session control without changing split view', async ({
  page,
}) => {
  await classroomPage(page);
  await page.getByRole('button', { name: 'Split view', exact: true }).focus();
  await page.keyboard.down('Alt');
  await page.keyboard.down('Enter');
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.down('Enter'); // Holding the shortcut must not toggle again.
  await expect(
    page.getByRole('button', { name: 'Exit full screen', exact: true }),
  ).toBeVisible();
  await page.keyboard.up('Enter');
  await page.keyboard.up('Alt');
  await page.keyboard.press('Alt+Enter');
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await expect(page.locator('#sessionShell')).toHaveAttribute(
    'data-view',
    'split',
  );
});

test('Alt+Enter handles unavailable fullscreen and ignores dialogs and other modifiers', async ({
  page,
}) => {
  await classroomPage(page);
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () =>
      Promise.reject(new Error('Unavailable'));
  });
  await page.keyboard.press('Control+Alt+Enter');
  await expect(page.locator('#viewMessage')).not.toContainText('unavailable');
  await page.evaluate(() =>
    (document.getElementById('modal') as HTMLDialogElement).showModal(),
  );
  await page.keyboard.press('Alt+Enter');
  await expect(page.locator('#viewMessage')).not.toContainText('unavailable');
  await page.evaluate(() =>
    (document.getElementById('modal') as HTMLDialogElement).close(),
  );
  await page.keyboard.press('Alt+Enter');
  await expect(page.locator('#viewMessage')).toContainText('unavailable');
});
