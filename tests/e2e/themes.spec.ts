import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { classroomPage } from '../fixtures/classroom-page';
import type { ThemeTokens } from '../../src/themes/contract';

const appearanceOverrides: Partial<ThemeTokens> = {
  'card-ink': '#162b40',
  'control-ink': '#65253b',
  'display-bg': '#171717',
  'display-ink': '#ffd180',
  'data-font': 'monospace',
  'label-font': 'Georgia, serif',
  'heading-weight': '900',
  'label-weight': '700',
  'label-tracking': '1px',
  'label-transform': 'uppercase',
  'display-shadow': 'inset 0 3px 8px #000',
  'button-pressed-shadow': 'inset 0 2px 3px #0004',
};

for (const width of [390, 1440]) {
  test(`appearance tokens reach their consumers without restyling semantic controls at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await classroomPage(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const themePicker = page.getByRole('combobox', {
      name: 'Theme',
      exact: true,
    });
    await themePicker.selectOption('big-button');
    const staff = page.locator('.pitch-staff').first();
    const originalSize = await staff.evaluate((el) => [
      getComputedStyle(el).width,
      getComputedStyle(el).height,
    ]);
    const draft = page.getByRole('slider', {
      name: 'Flute target adjustment',
      exact: true,
    });
    await draft.fill('18');
    const draftArtwork = await staff.innerHTML();

    // Supply values at the same root-variable boundary used by applyTheme.
    // No test-only theme or application global is shipped in the release.
    const applyOverrides = () =>
      page.evaluate((tokens) => {
        for (const [key, value] of Object.entries(tokens))
          document.documentElement.style.setProperty('--' + key, value);
      }, appearanceOverrides);
    await applyOverrides();
    await expect(page.locator('.panel').first()).toHaveCSS(
      'color',
      'rgb(22, 43, 64)',
    );
    const button = page.getByRole('button', {
      name: 'Add instrument',
      exact: true,
    });
    await expect(button).toHaveCSS('color', 'rgb(101, 37, 59)');
    await expect(page.locator('.note-name').first()).toHaveCSS(
      'color',
      'rgb(101, 37, 59)',
    );
    const label = page.locator('.note-selectors label').first();
    await expect(label).toHaveCSS('font-family', 'Georgia, serif');
    await expect(label).toHaveCSS('font-weight', '700');
    await expect(label).toHaveCSS('letter-spacing', '1px');
    await expect(label).toHaveCSS('text-transform', 'uppercase');
    await expect(page.locator('.note-name').first()).toHaveCSS(
      'text-transform',
      'none',
    );
    await expect(page.locator('.note-name').first()).toHaveCSS(
      'letter-spacing',
      'normal',
    );
    await expect(page.locator('.note-name').first()).toHaveCSS(
      'font-family',
      '"Trebuchet MS", system-ui, sans-serif',
    );
    await expect(page.locator('h1')).toHaveCSS('font-weight', '900');
    await expect(page.locator('.range-readouts b').first()).toHaveCSS(
      'font-family',
      'monospace',
    );
    await expect(page.locator('.danger').first()).toHaveCSS(
      'color',
      'rgb(163, 32, 21)',
    );
    await expect(page.locator('.primary').first()).toHaveCSS(
      'color',
      'rgb(255, 252, 240)',
    );
    expect(await staff.innerHTML()).toBe(draftArtwork);
    expect(
      await staff.evaluate((el) => [
        getComputedStyle(el).width,
        getComputedStyle(el).height,
      ]),
    ).toEqual(originalSize);

    await button.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(button).toHaveCSS('outline-style', 'solid');
    await expect(button).toHaveCSS('outline-color', 'rgb(163, 32, 21)');
    await button.hover();
    await page.mouse.down();
    await expect(button).toHaveCSS('box-shadow', /inset/);
    await page.mouse.move(1, 1);
    await page.mouse.up();
    await expect(button).toHaveCSS('box-shadow', /inset/);

    await themePicker.selectOption('pitch-press');
    await expect(draft).toHaveValue('18');
    await expect(label).toHaveCSS('text-transform', 'uppercase');
    await expect(label).toHaveCSS('letter-spacing', '0.52px');
    await expect(label).toHaveCSS('font-weight', '800');
    await expect(page.locator('h1')).toHaveCSS('font-weight', '400');
    await expect(button).toHaveCSS('color', 'rgb(21, 21, 21)');
    await themePicker.selectOption('big-button');
    await applyOverrides();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Detection', exact: true }).click();
    await expect(page.locator('.detection-control output').first()).toHaveCSS(
      'font-family',
      'monospace',
    );
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('button', { name: 'Resume session' }).click();
    await expect(page.locator('.current-display')).toHaveCSS(
      'color',
      'rgb(22, 43, 64)',
    );
    await expect(
      page.locator('.tuner-section[data-live-practice] .tuner'),
    ).toHaveCSS('background-color', 'rgb(23, 23, 23)');
    await expect(
      page.locator('.tuner-section[data-live-practice] .tuner'),
    ).toHaveCSS('box-shadow', /inset/);
    await expect(page.locator('#liveNote')).toHaveCSS(
      'color',
      'rgb(255, 209, 128)',
    );
    await expect(page.locator('#liveHz')).toHaveCSS(
      'color',
      'rgb(255, 209, 128)',
    );
    await expect(page.locator('#liveHz')).toHaveCSS('font-family', 'monospace');
    await expect(page.locator('#liveCents')).toHaveCSS(
      'font-family',
      'monospace',
    );
    await expect(
      page.locator('.tuner-section[data-live-practice] .needle'),
    ).toHaveCSS('background-color', 'rgb(255, 209, 128)');
    for (const [status, color] of [
      ['low', 'rgb(0, 91, 205)'],
      ['correct', 'rgb(0, 117, 46)'],
      ['high', 'rgb(189, 32, 24)'],
    ]) {
      await expect(
        page.locator(`.current-display .scorebar .${status}`),
      ).toHaveCSS('color', color);
    }
    const disabled = page.locator('#sessionUndo');
    await expect(disabled).toBeDisabled();
    await disabled.hover();
    await page.mouse.down();
    await expect(disabled).toHaveCSS('box-shadow', /inset/);
    await page.mouse.up();
    await page.screenshot({
      path: testInfo.outputPath(`token-consumers-${width}.png`),
      fullPage: true,
    });
  });

  test(`theme files change appearance and preserve settings artwork/drafts at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(pathToFileURL(resolve('dist/index.html')).href);
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption('big-button');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const slider = page.getByRole('slider', {
      name: 'Flute target adjustment',
      exact: true,
    });
    await slider.fill('18');
    const staff = page.locator('.pitch-staff').first();
    const artwork = await staff.innerHTML();
    const dimensions = await staff.evaluate((el) => ({
      width: getComputedStyle(el).width,
      height: getComputedStyle(el).height,
    }));
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption('pitch-press');
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(232, 223, 201)',
    );
    await expect(page.locator('.settings-pane')).toHaveCSS(
      'border-radius',
      '0px',
    );
    expect(await staff.innerHTML()).toBe(artwork);
    expect(
      await staff.evaluate((el) => ({
        width: getComputedStyle(el).width,
        height: getComputedStyle(el).height,
      })),
    ).toEqual(dimensions);
    await expect(slider).toHaveValue('18');
    await page.screenshot({
      path: `test-results/theme-pitch-press-${width}-${test.info().project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption('big-button');
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption('big-button');
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(232, 227, 210)',
    );
    await expect(page.locator('h1')).toHaveCSS(
      'text-shadow',
      /rgb\(255, 249, 231\)/,
    );
    await expect(page.locator('.panel').first()).toHaveCSS(
      'background-image',
      /linear-gradient/,
    );
    await expect(slider).toHaveValue('18');
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption('pitch-press');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'pitch-press',
    );
  });
}

test('retired saved theme falls back to the default', async ({ page }) => {
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page.evaluate(() =>
    localStorage.setItem('mouthpiece.pitchtracker.theme.v1', 'cel-mech'),
  );
  await page.reload();
  await expect(
    page.locator('#themeSelect option[value="cel-mech"]'),
  ).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    'big-button',
  );
});
