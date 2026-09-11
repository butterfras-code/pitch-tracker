import { expect, test } from '@playwright/test';
import {
  classroomPage,
  saved,
  sound,
  dismissFeedback,
} from '../fixtures/classroom-page';

for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
]) {
  test.describe(`${width}x${height}`, () => {
    test.use({
      viewport: { width, height },
      contextOptions: { screen: { width, height } },
    });
    test(`fullscreen split keeps the working controls in view across skins at ${width}x${height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height });
      await classroomPage(page, 30);
      await page
        .getByRole('button', { name: 'Full screen', exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => !!document.fullscreenElement))
        .toBe(true);
      await expect(page.locator('body > header')).toBeHidden();
      const signatures = [];
      const shell = await page.locator('#sessionShell').elementHandle();
      for (const theme of await page
        .locator('#themeSelect option')
        .evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        )) {
        await page.evaluate((id) => {
          const select =
            document.querySelector<HTMLSelectElement>('#themeSelect')!;
          select.value = id;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }, theme);
        await page.evaluate(() => document.fonts.ready);
        expect(await shell!.evaluate((el) => el.isConnected)).toBe(true);
        await expect(
          page.locator('[data-ui-click="reference-tone"]'),
        ).toHaveCount(1);
        await expect(
          page.locator('[data-ui-click="next-student"]'),
        ).toHaveCount(1);
        await expect(
          page.locator('[data-ui-click="previous-student"]'),
        ).toHaveCount(1);
        for (const state of ['idle', 'result', 'listening']) {
          if (state === 'result') {
            await page
              .locator('.current-display')
              .getByRole('button', { name: 'In range', exact: true })
              .click();
            await dismissFeedback(page);
          }
          if (state === 'listening') {
            await page
              .getByRole('button', { name: /^(Start|Resume) listening$/ })
              .click();
            await sound(page, 0);
            await sound(page, 440, 200);
          }
          const layout = await page.evaluate(() => {
            const current =
              document.querySelector<HTMLElement>('.current-display')!;
            const panel = current.getBoundingClientRect();
            const selectors = [
              '#studentIdentity',
              '.session-target',
              '.tuner',
              '.tuner-section > .scorebar',
              '.student-actions',
            ];
            const visible = selectors.every((selector) => {
              const r = current
                .querySelector(selector)!
                .getBoundingClientRect();
              return (
                r.width > 0 &&
                r.height > 0 &&
                r.top >= panel.top &&
                r.bottom <= panel.bottom &&
                r.left >= panel.left &&
                r.right <= panel.right
              );
            });
            const roster = document
              .querySelector('#cards')!
              .getBoundingClientRect();
            const rowsVisible = [
              ...document.querySelectorAll('.student'),
            ].filter((el) => {
              const r = el.getBoundingClientRect();
              return r.top >= roster.top && r.bottom <= roster.bottom;
            }).length;
            return {
              stacked:
                document.querySelector('.session-stage')!.clientWidth >= 1200 &&
                document.querySelector('.session-stage')!.clientHeight >= 800,
              visible,
              scroll: current.scrollTop,
              rowsVisible,
              rosterColumns: getComputedStyle(
                document.querySelector('#cards')!,
              ).gridTemplateColumns.split(' ').length,
              targetBottom: document
                .querySelector('.session-target')!
                .getBoundingClientRect().bottom,
              tunerTop: document
                .querySelector('.tuner-section')!
                .getBoundingClientRect().top,
              columns:
                getComputedStyle(current).gridTemplateColumns.split(' ').length,
            };
          });
          if (state === 'idle') {
            await page.screenshot({
              path: testInfo.outputPath(`${theme}-${width}-idle.png`),
            });
          }
          await expect(page.locator('body > header')).toBeHidden();
          expect(layout.visible, `${theme} ${state}`).toBe(true);
          expect(layout.scroll).toBe(0);
          expect(layout.rowsVisible).toBeGreaterThanOrEqual(
            layout.stacked ? 12 : 2,
          );
          if (layout.stacked) {
            expect(layout.rosterColumns).toBeGreaterThanOrEqual(3);
            expect(layout.targetBottom).toBeLessThanOrEqual(layout.tunerTop);
          }
          expect(layout.columns).toBe(layout.stacked ? 1 : 2);
          const textSizes = await page
            .locator(
              '.current-display button, .target-caption, .target-frequency, #liveCents, #checkHint, #upNext, .student .badge, .student .name, #roundLabel',
            )
            .evaluateAll((elements) =>
              elements.map((el) => parseFloat(getComputedStyle(el).fontSize)),
            );
          expect(Math.min(...textSizes)).toBeGreaterThanOrEqual(18);
          if (state === 'idle') {
            signatures.push(
              await page.locator('.session-content').evaluate((el) =>
                [...el.children].map((child) => {
                  const r = child.getBoundingClientRect();
                  return [
                    Math.round(r.x),
                    Math.round(r.y),
                    Math.round(r.width),
                    Math.round(r.height),
                  ];
                }),
              ),
            );
          }
          if (state === 'result') {
            expect(
              await page.evaluate(() => {
                const toast = document
                  .querySelector('#toast')!
                  .getBoundingClientRect();
                const footer = document
                  .querySelector('.tuner-section > .scorebar')!
                  .getBoundingClientRect();
                return (
                  toast.bottom <= footer.top ||
                  toast.left >= footer.right ||
                  toast.right <= footer.left
                );
              }),
            ).toBe(true);
            await page.mouse.move(0, 0);
            await page.screenshot({
              path: testInfo.outputPath(`${theme}-${width}-result.png`),
            });
          }
        }
        await page
          .getByRole('button', { name: 'Pause listening', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Next student', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Previous student', exact: true })
          .click();
      }
      for (const signature of signatures.slice(1))
        expect(signature).toEqual(signatures[0]);
      expect((await saved(page)).activeStudent).toBe('student-1');
      await page
        .locator('.student[data-student-id="student-30"] .name')
        .click();
      await expect(page.locator('#studentIdentity h2')).toHaveText(
        'Student 30',
      );
      await page
        .getByRole('button', { name: 'Previous student', exact: true })
        .click();
      await expect(
        page.locator('.student[data-student-id="student-29"]'),
      ).toBeInViewport();
      await page
        .getByRole('button', { name: 'Class view', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Split view', exact: true })
        .click();
      await expect(page.locator('#studentIdentity h2')).toHaveText(
        'Student 29',
      );
    });
  });
}

test('large split stacks target and grows roster; shorter window restores side-by-side', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await classroomPage(page, 30);
  const layout = () =>
    page.evaluate(() => {
      const target = document
        .querySelector('.session-target')!
        .getBoundingClientRect();
      const tuner = document
        .querySelector('.tuner-section')!
        .getBoundingClientRect();
      return {
        stacked: target.bottom <= tuner.top,
        columns: getComputedStyle(
          document.querySelector('#cards')!,
        ).gridTemplateColumns.split(' ').length,
        scroll: document.querySelector('.current-display')!.scrollTop,
      };
    });
  expect((await layout()).stacked).toBe(true);
  expect((await layout()).columns).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: testInfo.outputPath('large-stacked.png') });
  await page.locator('.student[data-student-id="student-30"] .name').click();
  await expect(page.locator('#studentIdentity h2')).toHaveText('Student 30');
  await page.setViewportSize({ width: 1920, height: 768 });
  expect((await layout()).stacked).toBe(false);
  await expect(page.locator('#studentIdentity h2')).toHaveText('Student 30');
  await page.setViewportSize({ width: 1920, height: 1200 });
  expect((await layout()).stacked).toBe(true);
  expect((await layout()).scroll).toBe(0);
});
