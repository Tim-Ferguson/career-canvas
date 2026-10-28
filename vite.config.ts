import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { sites } from '@openai/sites-vite-plugin'
import { existsSync } from 'node:fs'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    // OpenAI hosting needs the local, untracked .openai/hosting.json project file.
    ...(existsSync('.openai/hosting.json') ? [sites()] : []),
    react(),
  ],
})
