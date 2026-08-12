import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const trackedDistEntryPattern =
  /\s*<script type="module" crossorigin src="\/VST-NJ8_CAT_Written\/dist\/assets\/index-[^"]+\.js"><\/script>/
const trackedDistStylePattern =
  /\s*<link rel="stylesheet" crossorigin href="\/VST-NJ8_CAT_Written\/dist\/assets\/index-[^"]+\.css">/

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'use-source-entry-during-vite-build',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html
            .replace(trackedDistEntryPattern, '')
            .replace(trackedDistStylePattern, '')
            .replace(
              '</body>',
              '    <script type="module" src="/src/main.tsx"></script>\n  </body>',
            )
        },
      },
    },
    react(),
  ],
  base: '/VST-NJ8_CAT_Written/',
})
