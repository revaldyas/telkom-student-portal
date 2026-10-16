import path from 'node:path'
import { defineConfig } from 'vitest/config'

const root = (p: string) => path.resolve(__dirname, p)

export default defineConfig({
  resolve: { alias: { '@payload-config': root('payload.config.ts'), '@': root('.') } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Semua test memakai satu database; jalankan file satu per satu agar transaksi tidak saling berebut koneksi.
    fileParallelism: false,
  },
})
