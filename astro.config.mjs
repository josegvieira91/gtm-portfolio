// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://josevieira.dev',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
