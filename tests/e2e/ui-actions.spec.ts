import { sessionControl, teacherDetails } from '../fixtures/session-controls';
import { setSlider, selectTarget } from '../fixtures/settings-controls';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  closeSettings,
  dismissFeedback,
  settings,
} from '../fixtures/classroom-page';

test.beforeEach(async ({ page }) => {
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
});

async function startSession(page: Page) {
  await page.getByRole('button', { name: 'Start session' }).first().click();
  await page.getByLabel('Session name').fill('UI rehearsal');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await page
    .getByRole('button', { name: 'Session options', exact: true })
    .click();
  await teacherDetails(page, true);
  await closeSettings(page);
}

test('class, student and settings forms retain their behavior', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  await page.getByLabel('Class name').fill('New band');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(
    page.locator('[aria-label="Manage class"] option:checked'),
  ).toHaveCount(0);
  await page
    .getByRole('article', { name: 'New band', exact: true })
    .getByRole('button', { name: 'Edit class' })
    .click();
  await expect(
    page.locator('[aria-label="Manage class"] option:checked'),
  ).toHaveText('New band');
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByLabel('Class name').fill('Concert band');
  // Enter submits forms through the same path as clicking Save.
  await page.getByLabel('Class name').press('Enter');
  await expect(
    page.locator('[aria-label="Manage class"] option:checked'),
  ).toHaveText('Concert band');
  await page.getByRole('button', { name: 'Add students', exact: true }).click();
  await page
    .getByLabel('Students', { exact: true })
    .fill('Alex, Trumpet\nSam, Clarinet');
  await page.getByRole('button', { name: 'Add to roster' }).click();
  let row = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'Alex', exact: true }) });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Alex Rivera');
  await page.locator('#studentInstrument').selectOption('Flute');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  row = page.getByRole('row').filter({
    has: page.getByRole('cell', { name: 'Alex Rivera', exact: true }),
  });
  await expect(row).toContainText('Flute');
  await row.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(row).toContainText('Archived');
  await row.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(row).toContainText('Active');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept('Custom brass'));
  await page.getByRole('button', { name: 'Add instrument' }).click();
  await selectTarget(page, 'Custom brass', 'Bb3');
  await setSlider(page.getByLabel('A4 reference (Hz)'), '442');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#toast')).toContainText('Pitch settings saved');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByLabel('Custom brass note', { exact: true }),
  ).toHaveValue('Bb');
  await expect(
    page.getByLabel('Custom brass octave', { exact: true }),
  ).toHaveValue('3');
  await expect(page.getByLabel('A4 reference (Hz)')).toHaveValue('442');
});

test('dynamic session controls, notes and history editing work after rerenders', async ({
  page,
}) => {
  await startSession(page);
  const focus = page.locator('.focus');
  await sessionControl(page, 'Student view');
  await expect(page.locator('.roster-area')).toBeHidden();
  await sessionControl(page, 'Split view');
  await page.getByLabel('Search students').fill('Lucas');
  await expect(page.locator('#cards .student')).toHaveCount(1);
  await expect(page.locator('#activeOutsideFilter')).toContainText('Maya');
  await page
    .locator('.student')
    .getByRole('button', { name: 'Lucas', exact: true })
    .click();
  await page
    .locator('.student')
    .getByRole('button', { name: 'In range' })
    .click();
  await expect(page.locator('.student')).toContainText('1 tries');
  await dismissFeedback(page);
  await page.getByLabel('Search students').fill('');
  await page.getByLabel('Filter roster').selectOption('not tested');
  await expect(page.locator('#cards .student')).toHaveCount(9);
  await page.getByLabel('Filter roster').selectOption('all');
  await settings(page);
  await focus.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByLabel('Notes for this session').fill('Keep the air steady');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save notes' })
    .click();
  await settings(page);
  await page
    .getByRole('button', { name: 'Session notes', exact: true })
    .click();
  await page
    .getByLabel('Session notes', { exact: true })
    .fill('Good rehearsal');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save notes' })
    .click();
  await settings(page);
  await page.getByLabel('Auto Advance', { exact: true }).check();
  await page.getByLabel('Advance mode').selectOption('one-and-done');
  await closeSettings(page);
  await focus.getByRole('button', { name: 'Next student' }).click();
  const selected = await focus.getByRole('heading', { level: 2 }).textContent();
  // Scoring from the current student display must dispatch exactly one score.
  await focus.locator('.current-display button.high').click();
  await dismissFeedback(page);
  await expect(focus.getByRole('heading', { level: 2 })).not.toHaveText(
    selected!,
  );
  await settings(page);
  await focus.getByRole('button', { name: 'Random', exact: true }).click();
  await closeSettings(page);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Finish session' }).click();
  await expect(page.getByText('Good rehearsal', { exact: true })).toBeVisible();
  await page.getByText('Student summary & attempts', { exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.locator('#editResult').selectOption('correct');
  await page.getByRole('button', { name: 'Save correction' }).click();
  await page.getByText('Student summary & attempts', { exact: true }).click();
  await expect(
    page.getByText('corrected · target', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete attempt' }).click();
  await page.getByLabel('Student history').selectOption({ label: 'Lucas' });
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  expect((await csv).suggestedFilename()).toBe('pitch-tracker-results.csv');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByText('UI rehearsal', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'History & progress', exact: true })
    .click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByText('Completed sessions and student progress will appear here.'),
  ).toBeVisible();
});

test('keyboard scoring ignores typing and dialogs, and listeners do not duplicate', async ({
  page,
}) => {
  await startSession(page);
  await page.getByLabel('Search students').fill('1');
  await page.getByLabel('Search students').fill('');
  await expect(page.locator('.student').first()).toContainText('0 tries');
  await settings(page);
  await page
    .getByRole('button', { name: 'Session notes', exact: true })
    .click();
  await page.getByLabel('Session notes', { exact: true }).press('2');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel' })
    .click();
  await closeSettings(page);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('button', { name: 'Resume session' }).click();
  }
  await page.locator('#studentIdentity h2').click();
  await page.keyboard.press('2');
  await expect(page.locator('.student').first()).toContainText('1 tries');
  await dismissFeedback(page);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.student').first()).toContainText('0 tries');
  await page.locator('.current-display button.correct').click();
  await expect(page.locator('.student').first()).toContainText('1 tries');
});

test('backup buttons, file picker and unreadable-data download remain connected', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const backup = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download JSON backup', exact: true })
    .click();
  expect((await backup).suggestedFilename()).toMatch(
    /^pitch-tracker-backup-.*\.json$/,
  );
  const picker = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: 'Restore JSON backup', exact: true })
    .click();
  await (
    await picker
  ).setFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.locator('#toast')).toContainText('Restore failed:');
  await page.evaluate(() =>
    localStorage.setItem('mouthpiece.pitchtracker.v1', '{broken'),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const raw = page.waitForEvent('download');
  await page
    .getByRole('button', {
      name: 'Download unreadable stored data',
      exact: true,
    })
    .click();
  expect((await raw).suggestedFilename()).toBe('pitch-tracker-unreadable.json');
});

test('only registered actions execute, and disabled controls stay inactive', async ({
  page,
}) => {
  await startSession(page);
  await page.locator('.student').first().getByLabel('Absent').click();
  const attemptsBefore = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('mouthpiece.pitchtracker.v1')!)
        .sessions[0].attempts.length,
  );
  // Synthetic events can bubble from disabled controls; the dispatcher still
  // must not run the action. Unknown names must never become executable code.
  await page
    .locator('.student')
    .first()
    .locator('[data-ui-click="record"].correct')
    .dispatchEvent('click');
  await page.evaluate(() => {
    for (const name of ['constructor', 'record("correct")']) {
      const button = document.createElement('button');
      button.dataset.uiClick = name;
      document.body.append(button);
      button.click();
      button.remove();
    }
  });
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('mouthpiece.pitchtracker.v1')!)
          .sessions[0].attempts.length,
    ),
  ).toBe(attemptsBefore);
});
