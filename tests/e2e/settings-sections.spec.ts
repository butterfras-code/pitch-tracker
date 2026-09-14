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
  return page.locator('[data-ui-submit="session-defaults"]');
}

test('settings shades preserve drafts when toggled by mouse and keyboard', async ({
  page,
}) => {
  await classroomPage(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Flute note', { exact: true }).selectOption('B');
  await setSlider(page.getByLabel('Steady hold (seconds)'), '3');
  for (const name of ['Pitch targets', 'Detection', 'Session defaults']) {
    const shade = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: name }) });
    await shade.locator('summary').click();
    await expect(shade).not.toHaveAttribute('open');
    await shade.locator('summary').press('Enter');
    await expect(shade).toHaveAttribute('open');
  }
  await expect(page.getByLabel('Flute note', { exact: true })).toHaveValue('B');
  await expect(page.getByLabel('Steady hold (seconds)')).toHaveValue('3');
  await page.locator('summary', { hasText: 'Pitch targets' }).click();
  await page.locator('summary', { hasText: 'Detection' }).click();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  expect((await saved(page)).configs.Flute.pitch).toBe('B4');
  expect((await saved(page)).settings.hold).toBe(3);
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
  await form.getByRole('button', { name: 'Save session defaults' }).click();
  expect((await saved(page)).schema).toBe(3);
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
  await page.getByLabel('Session name').fill('Defaults rehearsal');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
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
  await form.getByLabel('Clap navigation').check();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await form.getByRole('button', { name: 'Save session defaults' }).click();
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
  await form.getByRole('button', { name: 'Save session defaults' }).click();
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
