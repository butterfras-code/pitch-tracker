import type { Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { trackerFixture } from './tracker';
import { installAudioDevice } from './audio-device';
import type { TrackerData } from '../../src/domain/tracker';
export const key = 'mouthpiece.pitchtracker.v1';
export async function classroomPage(page: Page, count = 3) {
  await installAudioDevice(page);
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  const data = trackerFixture(),
    s = data.sessions[0];
  s.roster = Array.from({ length: count }, (_, i) => ({
    ...s.roster[0],
    id: 'student-' + (i + 1),
    name: ['Maya', 'Lucas', 'Sofia'][i] ?? 'Student ' + (i + 1),
  }));
  data.classes[0].students = structuredClone(s.roster);
  s.attempts = [];
  s.notes = {};
  s.note = '';
  data.settings = { ...data.settings, hold: 0.5, advance: false };
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key, data },
  );
  await page.reload();
  await page.clock.install();
  await page.evaluate(() => {
    window.syntheticAudio.amplitude = 0;
    window.syntheticAudio.frequency = 440;
  });
  return data;
}
export function saved(page: Page): Promise<TrackerData> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
}
export async function settings(page: Page) {
  await dismissFeedback(page);
  const panel = page.locator('#behaviorSettings');
  if (!(await panel.isVisible()))
    await page
      .getByRole('button', {
        name: 'Session behavior settings',
        exact: true,
      })
      .click();
  await panel.waitFor({ state: 'visible' });
}
export async function closeSettings(page: Page) {
  const panel = page.locator('#behaviorSettings');
  if (await panel.isVisible())
    await page.getByRole('button', { name: 'Close settings' }).click();
  await panel.waitFor({ state: 'hidden' });
}
/** Continue after a recorded-attempt popup, if it has not already expired. */
export async function dismissFeedback(page: Page): Promise<void> {
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>(
      '#pitchFeedback[open] .feedback-continue',
    );
    button?.click();
  });
}
export async function sound(page: Page, frequency: number, duration = 700) {
  await page.evaluate((f) => {
    window.syntheticAudio.frequency = f;
    window.syntheticAudio.amplitude = f ? 0.2 : 0;
    window.syntheticAudio.noise = false;
  }, frequency);
  await page.clock.runFor(duration);
}
export async function claps(page: Page, count: number) {
  await sound(page, 0);
  for (let i = 0; i < count; i++) {
    await page.evaluate(() => {
      window.syntheticAudio.noise = true;
    });
    await page.clock.runFor(80);
    await page.evaluate(() => {
      window.syntheticAudio.noise = false;
    });
    await page.clock.runFor(240);
  }
  await page.clock.runFor(650);
}
