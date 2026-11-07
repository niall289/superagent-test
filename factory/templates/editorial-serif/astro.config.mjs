// @ts-check
import { readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// The site origin lives in one place: the site content file. Canonicals, OG
// URLs, JSON-LD and the sitemap all derive from it.
const site = JSON.parse(readFileSync(new URL('./src/content/site/site.json', import.meta.url), 'utf8'))

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404/') && !page.endsWith('/404'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
