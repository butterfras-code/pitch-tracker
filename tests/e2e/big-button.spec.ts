import { expect, test } from '@playwright/test';
import { classroomPage, saved } from '../fixtures/classroom-page';

for (const width of [390, 1440]) {
  test(`toy theme preserves session geometry and selection at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await classroomPage(page);
    // Mobile hides the picker during sessions; use its normal change event.
    const picker = page.locator('#themeSelect');
    const student = page.locator('.current-display');
    const geometry = () =>
      student.evaluate((element) => {
        const style = getComputedStyle(element);
        return [
          style.width,
          style.height,
          style.padding,
          style.gap,
          style.gridTemplateColumns,
        ];
      });
    const before = await geometry();
    const data = await saved(page);
    await student.evaluate((element) =>
      element.setAttribute('data-retained', 'yes'),
    );
    await picker.selectOption('big-button', { force: true });
    await expect(page.locator('html')).toHaveAttribute('data-treatment', 'toy');
    expect(await geometry()).toEqual(before);
    await expect(student).toHaveAttribute('data-retained', 'yes');
    expect(await saved(page)).toEqual(data);
    await expect(page.locator('.tuner')).toHaveCSS(
      'background-color',
      'rgb(10, 35, 75)',
    );
    await expect(page.locator('.session-target')).toHaveCSS(
      'color',
      'rgb(255, 242, 207)',
    );
    await expect(page.locator('.target-playback')).toHaveCSS(
      'background-color',
      'rgb(201, 33, 19)',
    );
    await page.screenshot({
      path: testInfo.outputPath(`big-button-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(picker).toHaveValue('big-button');
    await picker.selectOption('pitch-press', { force: true });
    await expect(page.locator('.session-target')).not.toHaveCSS(
      'color',
      'rgb(255, 242, 207)',
    );
    await picker.selectOption('big-button', { force: true });
    await page
      .getByRole('button', { name: 'Next student', exact: true })
      .click();
    await expect(page.locator('#studentIdentity')).toContainText('Lucas');
  });
}
