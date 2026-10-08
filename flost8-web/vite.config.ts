import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const config: ReturnType<typeof defineConfig> = {
    plugins: [react()],
  }

  if (env.APPS_SCRIPT_URL) {
    const u = new URL(env.APPS_SCRIPT_URL)

    config.server = {
      proxy: {
        '/api/script': {
          target: `${u.protocol}//${u.host}`,
          changeOrigin: true,
          followRedirects: true, // Apps Script 302-redirects to script.googleusercontent.com
          rewrite: (path: string) => path.replace(/^\/api\/script/, u.pathname),
        },
      },
    }
  }

  return config
})
