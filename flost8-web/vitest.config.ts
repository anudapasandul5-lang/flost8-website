import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // apps-script/*.test.cjs are plain node scripts (run with `node`), not vitest suites.
    exclude: [...configDefaults.exclude, 'apps-script/**'],
  },
})
