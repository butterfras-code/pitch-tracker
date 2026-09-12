import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { trackerFixture } from '../fixtures/tracker';
import { key, saved } from '../fixtures/classroom-page';

async function overview(page: Page) {
  const db = trackerFixture();
  db.activeSession = null;
  db.activeStudent = null;
  db.sessions[0].ended = 3000;
  const next = structuredClone(db.sessions[0]);
  next.id = 'latest';
  next.started = Date.UTC(2026, 8, 10, 12);
  next.ended = next.started + 60000;
  next.attempts = [
    { ...next.attempts[0], id: 'low', status: 'low' },
    { ...next.attempts[0], id: 'high', status: 'high' },
  ];
  db.sessions.push(next);
  db.classes.push(
    {
      id: 'second',
      name: 'Strings <Advanced>',
      students: [
        { ...db.classes[0].students[0], id: 'second-student', name: 'Alex' },
      ],
    },
    { id: 'empty', name: 'New beginners', students: [] },
  );
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page.evaluate(
    ({ key, db }) => localStorage.setItem(key, JSON.stringify(db)),
    { key, db },
  );
  await page.reload();
  return db;
}

test('class cards show both periods, empty states and refresh after a finished session', async ({
  page,
}) => {
  await overview(page);
  await expect(
    page.getByRole('button', { name: 'Classes', exact: true }),
  ).toHaveClass(/on/);
  await expect(
    page.getByRole('button', { name: 'Session', exact: true }),
  ).toHaveCount(0);
  const band = page.getByRole('article', { name: 'Band', exact: true });
  await expect(band.getByRole('row', { name: 'Total correct' })).toHaveText(
    'Total correct10',
  );
  await expect(band.getByRole('row', { name: 'Correct %' })).toHaveText(
    'Correct %33%0%',
  );
  await expect(band.getByRole('row', { name: 'Students checked' })).toHaveText(
    'Students checked1 of 11 of 1',
  );
  await expect(band.locator('time')).toContainText('September 10, 2026');
  const strings = page.getByRole('article', {
    name: 'Strings <Advanced>',
    exact: true,
  });
  await expect(strings).toContainText('No sessions yet');
  await expect(strings.getByRole('row', { name: 'Correct %' })).toHaveText(
    'Correct %——',
  );
  await expect(
    page
      .getByRole('article', { name: 'New beginners' })
      .getByRole('button', { name: 'Start session' }),
  ).toBeDisabled();
  await strings.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Strings <Advanced> · 1 students',
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start session' })
    .click();
  await expect(page.locator('#studentIdentity')).toContainText('Alex');
  await page.getByRole('button', { name: 'Back to classes' }).click();
  await expect(
    strings.getByRole('button', { name: 'Resume session' }),
  ).toBeVisible();
  expect((await saved(page)).activeSession).toBeTruthy();
  await strings.getByRole('button', { name: 'Resume session' }).click();
  await expect(page.locator('#studentIdentity')).toContainText('Alex');
  await page
    .getByRole('button', { name: 'In range', exact: true })
    .first()
    .click();
  await page
    .locator('#pitchFeedback')
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.locator('[data-tab="classes"]').click();
  await expect(strings.getByRole('row', { name: 'Correct %' })).toHaveText(
    'Correct %100%100%',
  );
  await expect(
    strings.getByRole('row', { name: 'Students checked' }),
  ).toHaveText('Students checked1 of 11 of 1');
  await page.reload();
  await expect(strings.getByRole('row', { name: 'Total correct' })).toHaveText(
    'Total correct11',
  );
});

test('edit selects the card class and add class creates a usable empty card', async ({
  page,
}) => {
  await overview(page);
  await page
    .getByRole('article', { name: 'Strings <Advanced>' })
    .getByRole('button', { name: 'Edit class' })
    .click();
  await expect(page.getByLabel('Manage class')).toHaveValue('second');
  await expect(page.locator('#main tbody')).toContainText('Alex');
  await page.locator('[data-tab="classes"]').click();
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  await page.getByLabel('Class name').fill('New ensemble');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  const card = page.getByRole('article', { name: 'New ensemble', exact: true });
  await expect(card).toContainText('0 students');
  await card.getByRole('button', { name: 'Edit class' }).click();
  await page.getByRole('button', { name: 'Add students', exact: true }).click();
  await page.getByLabel('Students', { exact: true }).fill('Taylor, Flute');
  await page.getByRole('button', { name: 'Add to roster' }).click();
  await page.locator('[data-tab="classes"]').click();
  await expect(
    card.getByRole('button', { name: 'Start session' }),
  ).toBeEnabled();
});

test('an unfinished session in another class resumes without creating a duplicate', async ({
  page,
}) => {
  const db = await overview(page);
  db.sessions[0].ended = null;
  db.classId = 'second';
  await page.evaluate(
    ({ key, db }) => localStorage.setItem(key, JSON.stringify(db)),
    { key, db },
  );
  await page.reload();
  await page
    .getByRole('article', { name: 'Band', exact: true })
    .getByRole('button', { name: 'Resume session' })
    .click();
  await expect(page.locator('#sessionTitle')).toHaveText('Rehearsal');
  expect((await saved(page)).sessions).toHaveLength(2);
  expect((await saved(page)).activeSession).toBe('session-1');
});

test('cards fit phone and desktop widths across all themes', async ({
  page,
}) => {
  await overview(page);
  const themes = await page
    .locator('#themeSelect option')
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value),
    );
  for (const width of [390, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of themes) {
      await page.getByLabel('Theme').selectOption(theme);
      await expect(
        page
          .getByRole('article', { name: 'Band', exact: true })
          .getByRole('button', { name: 'Start session' }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const fits = await page
        .locator('.class-card')
        .evaluateAll((cards) =>
          cards.every((card) => card.scrollWidth <= card.clientWidth),
        );
      expect(fits).toBe(true);
    }
  }
});
