import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [viteSingleFile()],
});
