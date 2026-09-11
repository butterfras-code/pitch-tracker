import type { Locator, Page } from '@playwright/test';

export async function setSlider(slider: Locator, value: string) {
  await slider.evaluate((element, next) => {
    (element as HTMLInputElement).value = next;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
export async function selectTarget(
  page: Page,
  instrument: string,
  pitch: string,
) {
  await page
    .getByLabel(`${instrument} note`, { exact: true })
    .selectOption(pitch.replace(/[0-8]$/, ''));
  await page
    .getByLabel(`${instrument} octave`, { exact: true })
    .selectOption(pitch.match(/[0-8]$/)?.[0] ?? '');
}
