import type { ThemeDefinition } from './contract';

// Copy to YOUR-NAME.theme.ts in this directory to include it in the build.
// Omitted values inherit the shared defaults. See contract.ts for every supported key/default.
export default {
  id: 'your-theme',
  name: 'Your Theme',
  tokens: {
    bg: '#f5f4ef',
    card: '#ffffff',
    ink: '#24332f',
    muted: '#69766f',
    accent: '#246b55',
    radius: '14px',
    'control-radius': '9px',
    'body-font': 'system-ui, sans-serif',
    'heading-font': 'Georgia, serif',
    'panel-shadow': '0 8px 24px #24332f18',
    'surface-pattern': 'none',
    scheme: 'light',
  },
} satisfies ThemeDefinition;
