import { validateThemes, type ThemeDefinition } from './contract';
import feedback from './feedback.json';
import { validateFeedbackCatalog } from './feedback';
// Eager glob: included at build time, never fetched by the standalone release.
const modules = import.meta.glob<{ default: ThemeDefinition }>('./*.theme.ts', {
  eager: true,
});
export const THEME_REGISTRY = validateThemes(
  Object.values(modules).map((module) => module.default),
);
export const DEFAULT_THEME = 'cel-mech';
export const FEEDBACK_CATALOG = validateFeedbackCatalog(
  feedback,
  THEME_REGISTRY.map((theme) => theme.id),
);
if (!THEME_REGISTRY.some((theme) => theme.id === DEFAULT_THEME))
  throw new Error('Default theme missing');
