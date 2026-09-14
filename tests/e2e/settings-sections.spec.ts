import { expect, test } from '@playwright/test';
import {
  classroomPage,
  closeSettings,
  saved,
  settings,
  claps,
  sound,
} from '../fixtures/classroom-page';
import { setSlider } from '../fixtures/settings-controls';

async function openDefaults(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Defaults', exact: true }).click();
  return page.locator('[data-ui-submit="session-defaults"]');
}

test('settings navigation warns before discarding a pitch draft and detection autosaves', async ({
  page,
}) => {
  await classroomPage(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Flute note', { exact: true }).selectOption('B');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Detection', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Instruments' }),
  ).toBeVisible();
  await expect(page.getByLabel('Flute note', { exact: true })).toHaveValue('B');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Detection', exact: true }).click();
  await setSlider(page.getByLabel('Steady hold (seconds)'), '3');
  await expect.poll(async () => (await saved(page)).settings.hold).toBe(3);
  expect((await saved(page)).configs.Flute.pitch).toBe('A4');
});

test('adding an instrument stays in the current draft until save and can be discarded', async ({
  page,
}) => {
  await classroomPage(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const save = page.getByRole('button', { name: 'Save settings', exact: true });
  const discard = page.getByRole('button', { name: 'Revert changes' });
  await expect(discard).toBeDisabled();
  await expect(page.locator('#settingsDraftStatus')).toHaveText(
    'All changes saved',
  );

  await page.getByLabel('Flute note', { exact: true }).selectOption('B');
  await save.click();
  page.once('dialog', (dialog) => dialog.accept('Piccolo'));
  await page.getByRole('button', { name: 'Add instrument' }).click();
  await expect(page.locator('tr[data-instrument="Piccolo"]')).toBeVisible();
  await expect(discard).toBeEnabled();
  await expect(page.locator('#settingsDraftStatus')).toHaveText(
    'Unsaved changes',
  );
  expect((await saved(page)).configs.Piccolo).toBeUndefined();

  page.once('dialog', (dialog) => dialog.accept());
  await discard.click();
  await expect(page.locator('tr[data-instrument="Piccolo"]')).toHaveCount(0);
  await expect(page.getByLabel('Flute note', { exact: true })).toHaveValue('B');

  page.once('dialog', (dialog) => dialog.accept('Piccolo'));
  await page.getByRole('button', { name: 'Add instrument' }).click();
  await page.getByLabel('Piccolo note', { exact: true }).selectOption('B');
  await save.click();
  await expect(discard).toBeDisabled();
  expect((await saved(page)).configs).toMatchObject({
    Flute: { pitch: 'B4' },
    Piccolo: { pitch: 'B' },
  });
});

test('instrument selector shows one editor and assigned instruments cannot be deleted', async ({
  page,
}) => {
  await classroomPage(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(
    await page.evaluate(() => {
      const main = document.querySelector('main')!;
      return {
        documentFits: document.documentElement.scrollHeight <= innerHeight,
        mainFits: main.scrollHeight <= main.clientHeight,
        editorOwnsOverflow:
          document.querySelector('.settings-pane-scroll')!.scrollHeight >=
          document.querySelector('.settings-pane-scroll')!.clientHeight,
      };
    }),
  ).toEqual({
    documentFits: true,
    mainFits: true,
    editorOwnsOverflow: true,
  });
  await expect(page.locator('#configTable tbody tr')).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept('Piccolo'));
  await page.getByRole('button', { name: 'Add instrument' }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByLabel('Edit instrument').selectOption('Flute');
  await expect(page.locator('#configTable tbody tr')).toHaveAttribute(
    'data-instrument',
    'Flute',
  );
  await page.getByRole('button', { name: 'Delete instrument' }).click();
  await expect(page.locator('#toast')).toContainText(
    'cannot be deleted while it is assigned to a student',
  );
  expect((await saved(page)).configs.Flute).toBeDefined();
});

test('defaults leave the active session alone, then initialize reopened and new sessions', async ({
  page,
}) => {
  await classroomPage(page);
  const form = await openDefaults(page);
  await form.getByLabel('Auto Advance', { exact: true }).check();
  await form.getByLabel('Advance mode').selectOption('one-and-done');
  await form.getByLabel('Clap navigation').check();
  await form.getByLabel('Starting view').selectOption('class');
  await expect.poll(async () => (await saved(page)).schema).toBe(3);
  expect((await saved(page)).settings.advance).toBe(false);
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await expect(page.getByLabel('Advance', { exact: true })).toHaveValue(
    'manual',
  );
  await expect(
    page.getByRole('button', { name: 'Clap navigation' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Teacher details')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#sessionShell')).toHaveAttribute(
    'data-view',
    'class',
  );
  await expect(page.getByLabel('Advance', { exact: true })).toHaveValue(
    'after-attempt',
  );
  await expect(
    page.getByRole('button', { name: 'Clap navigation' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Teacher details')).toHaveCount(0);
  await expect(page.locator('#toolbarListening')).toBeVisible();
  await page.getByLabel('Advance', { exact: true }).selectOption('manual');
  await page.getByRole('button', { name: 'Clap navigation' }).click();
  expect((await saved(page)).sessionDefaults?.advance).toBe(true);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start session', exact: true })
    .first()
    .click();
  await expect(page.getByLabel('Advance', { exact: true })).toHaveValue(
    'after-attempt',
  );
  await expect(
    page.getByRole('button', { name: 'Clap navigation' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Teacher details')).toHaveCount(0);
  await page.locator('#toolbarListening').click();
  await page.locator('.student.selected .tuner-section button.low').click();
  expect((await saved(page)).activeStudent).toBe('student-2');
  // The saved clap default drives the real listener only after microphone activation.
  await sound(page, 0, 1000);
  await claps(page, 2);
  expect((await saved(page)).activeStudent).toBe('student-3');
});

test('failed default saves keep the previous defaults and report the failure', async ({
  page,
}) => {
  await classroomPage(page);
  const form = await openDefaults(page);
  const before = await saved(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await form.getByLabel('Clap navigation').check();
  await expect(page.locator('#sessionDefaultsError')).toContainText(
    'could not be saved',
  );
  expect(await saved(page)).toEqual(before);
});

test('restored defaults survive pitch saves and apply on resume', async ({
  page,
}) => {
  await classroomPage(page);
  const form = await openDefaults(page);
  await form.getByLabel('Starting view').selectOption('student');
  await expect
    .poll(async () => (await saved(page)).sessionDefaults?.view)
    .toBe('student');
  await page.getByRole('button', { name: 'Instruments', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  const data = await saved(page);
  expect(data.schema).toBe(3);
  expect(data.sessionDefaults?.teacher).toBe(false);
  page.once('dialog', (d) => d.accept());
  await page.locator('#importFile').setInputFiles({
    name: 'defaults.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.locator('#toast')).toHaveText('Backup restored.');
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Resume session' }).click();
  await settings(page);
  await expect(page.getByLabel('Teacher details')).toHaveCount(0);
  await expect(page.locator('#sessionShell')).toHaveAttribute(
    'data-view',
    'student',
  );
  await closeSettings(page);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await settings(page);
  await expect(page.getByLabel('Teacher details')).toHaveCount(0);
  const invalid = {
    ...data,
    sessionDefaults: { ...data.sessionDefaults, mode: 'invalid' },
  };
  const before = await saved(page);
  await page.locator('#importFile').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await expect(page.locator('#toast')).toContainText('Restore failed:');
  expect(await saved(page)).toEqual(before);
});
