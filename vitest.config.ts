import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    dir: './test',
    environment: 'node',
  },
})
