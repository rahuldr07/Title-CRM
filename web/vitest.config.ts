import { defineConfig, mergeConfig } from 'vitest/config'
import vite from './vite.config'

export default mergeConfig(
  vite,
  defineConfig({
    test: {
      include: ['tests/repo/**/*.test.ts'],
      environment: 'node',
      fileParallelism: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/shared/lib/**', 'src/shared/ui/*.ts', 'src/app/*.ts', 'src/domain/**', 'src/features/**/*.ts', 'server/**'],
        exclude: ['**/*.tsx', '**/*.test.ts', 'src/shared/hooks/**', 'src/app/use*.ts', 'server/db/seed.ts', 'server/db/reset.ts'],
      },
    },
  }),
)
