import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    globals: true,
    // Worktrees de agente em .claude/worktrees/ contêm uma cópia inteira do repo —
    // sem isso o vitest roda cada arquivo de teste duas vezes, contra código velho.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
    // Testes de componente declaram `// @vitest-environment jsdom` no topo do
    // arquivo — motor/services continuam em 'node' (mais rápido, sem overhead
    // de DOM que eles não usam).
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/utils/**', 'src/services/**'],
    },
  },
})
