// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://josevieira.dev',
  output: 'static',
  integrations: [mdx(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
