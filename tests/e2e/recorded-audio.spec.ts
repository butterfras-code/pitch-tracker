import { setSlider, selectTarget } from '../fixtures/settings-controls';
import { expect, test } from '@playwright/test';
import { classroomPage, saved } from '../fixtures/classroom-page';
import { recordedAudio, recordings } from '../fixtures/recorded-audio';

for (const recording of recordings) {
  for (const useLabel of [false, true]) {
    test(`${recording.file}: saves measured audio against ${useLabel ? 'the filename target' : 'its sounding note'}`, async ({
      page,
    }) => {
      await classroomPage(page, 1);
      const target = useLabel ? recording.label : recording.sounding;
      await page
        .getByRole('button', { name: 'Classes & settings', exact: true })
        .click();
      await selectTarget(page, 'Flute', target);
      await setSlider(page.getByLabel('Steady hold (seconds)'), '2');
      await page
        .getByRole('button', { name: 'Save settings', exact: true })
        .click();
      await page.getByRole('button', { name: 'Session', exact: true }).click();
      await page
        .getByRole('button', { name: 'Start listening', exact: true })
        .click();
      const samples = recordedAudio(recording.file);
      await page.evaluate((samples) => {
        window.syntheticAudio.recording = {
          samples,
          started: performance.now(),
        };
      }, Array.from(samples));
      await page.clock.runFor((samples.length / 48000) * 1000 + 1000);
      const attempts = (await saved(page)).sessions[0].attempts;
      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        status: useLabel ? 'high' : 'correct',
        source: 'microphone',
        target: { pitch: target },
      });
      expect(
        Math.abs(1200 * Math.log2(attempts[0].frequency! / recording.hz)),
      ).toBeLessThan(10);
    });
  }
}
