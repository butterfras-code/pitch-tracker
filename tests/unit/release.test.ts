import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('standalone release contract', () => {
  it('ships exactly one HTML file with no external script or stylesheet tags', () => {
    const directory = resolve('dist');
    expect(readdirSync(directory)).toEqual(['index.html']);
    const html = readFileSync(resolve(directory, 'index.html'), 'utf8');
    expect(html).toMatch(/<script\b/);
    expect(html).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
    expect(html).not.toMatch(
      /<link\b[^>]*\brel\s*=\s*["'](?:stylesheet|modulepreload)["']/i,
    );
    expect(html).not.toMatch(/\bon(?:click|change|input|submit)\s*=/i);
  });
});
