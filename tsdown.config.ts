import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/express.ts',
    './src/hono.ts',
    './src/fastify.ts',
  ],
  outDir: './build',
  format: 'esm',
  platform: 'node',
  dts: true,
  clean: true,
  tsconfig: './tsconfig.src.json',
})
