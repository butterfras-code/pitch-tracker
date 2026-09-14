import { expect, test } from '@playwright/test';
import { classroomPage, saved } from '../fixtures/classroom-page';

test('session controls live in the toolbar and microphone options stay separate', async ({
  page,
}) => {
  await classroomPage(page);
  await expect(
    page.getByRole('button', { name: 'Session options' }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Session notes' })).toHaveCount(
    0,
  );
  await expect(page.getByLabel('Class', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Advance', { exact: true })).toHaveValue(
    'manual',
  );
  await expect(
    page.getByRole('button', { name: 'Shuffle student order' }),
  ).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Microphone options' });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Microphone input')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Turn microphone off' }),
  ).toBeHidden();
  expect(await page.evaluate(() => window.syntheticAudio.requests)).toBe(0);
});

test('shuffle changes temporary student order without changing the active student or roster', async ({
  page,
}) => {
  await classroomPage(page);
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  const before = await saved(page);
  await page.getByRole('button', { name: 'Shuffle student order' }).click();
  expect((await saved(page)).activeStudent).toBe(before.activeStudent);
  expect((await saved(page)).classes[0].students).toEqual(
    before.classes[0].students,
  );
  expect((await saved(page)).sessions[0].attempts).toEqual([]);
  await expect(page.locator('#cards .name')).toHaveText([
    'Lucas',
    'Sofia',
    'Maya',
  ]);
  await expect(page.getByText('Student order shuffled.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo last change' }).click();
  await expect(page.locator('#cards .name')).toHaveText([
    'Maya',
    'Lucas',
    'Sofia',
  ]);
});

test('advance selector maps all policies without rewriting defaults', async ({
  page,
}) => {
  const original = await classroomPage(page);
  const advance = page.getByLabel('Advance', { exact: true });
  await advance.selectOption('when-correct');
  expect((await saved(page)).settings.advance).toBe(true);
  await advance.selectOption('after-attempt');
  await expect(advance).toHaveValue('after-attempt');
  await advance.selectOption('manual');
  expect((await saved(page)).settings.advance).toBe(false);
  expect((await saved(page)).sessionDefaults).toEqual(original.sessionDefaults);
});

test('clap toggle retains focus and dismisses its fixed toast', async ({
  page,
}) => {
  await classroomPage(page);
  const clap = page.getByRole('button', { name: 'Clap navigation' });
  await clap.click();
  await expect(clap).toBeFocused();
  await expect(clap).toHaveAttribute('aria-pressed', 'true');
  await expect(clap).toHaveAttribute('data-listening-required', 'true');
  await expect(page.locator('#clapInstructions')).toContainText(
    '2 claps Forward',
  );
  await page.clock.runFor(1500);
  await expect(page.locator('#clapInstructions')).toBeHidden();
  await clap.click();
  await expect(clap).toHaveAttribute('aria-pressed', 'false');
});

test('toolbar and target listening controls stay synchronized', async ({
  page,
}) => {
  await classroomPage(page);
  const toolbar = page.locator('#toolbarListening');
  const target = page.locator('#pauseListening');
  await toolbar.click();
  await expect(toolbar).toHaveAccessibleName('Pause listening');
  await expect(target).toHaveAccessibleName('Pause listening');
  await target.click();
  await expect(toolbar).toHaveAccessibleName('Resume listening');
  await toolbar.click();
  await page.getByRole('button', { name: 'Microphone options' }).click();
  await page.getByRole('button', { name: 'Turn microphone off' }).click();
  await expect(toolbar).toHaveAccessibleName('Start listening');
  await expect(target).toHaveAccessibleName('Start listening');
});

test('class navigation treats the active class as a no-op and does not create sessions', async ({
  page,
}) => {
  await classroomPage(page);
  await page.evaluate(() => {
    const key = 'mouthpiece.pitchtracker.v1';
    const data = JSON.parse(localStorage.getItem(key)!);
    data.classes.push({
      id: 'empty-class',
      name: 'A very long empty class name for navigation',
      students: [],
    });
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await page.locator('#toolbarListening').click();
  const before = await saved(page);
  await page.getByLabel('Class', { exact: true }).dispatchEvent('change');
  expect((await saved(page)).activeStudent).toBe(before.activeStudent);
  await expect(page.locator('#toolbarListening')).toHaveAccessibleName(
    'Pause listening',
  );
  await page.getByLabel('Class', { exact: true }).selectOption('empty-class');
  await expect(page.getByRole('region', { name: 'Classes' })).toBeVisible();
  expect((await saved(page)).activeSession).toBeNull();
  expect((await saved(page)).sessions).toHaveLength(before.sessions.length);
});
