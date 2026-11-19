import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  define: {
    // Mesmo define do vite.config.ts (lá vem do package.json; aqui um valor fixo
    // basta pros testes — o vitest.config não herda o vite.config).
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
  },
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
      // Mede tudo que tem lógica: motor, hooks (fluxo da carreira) e telas. Antes só
      // engine/utils/services entravam — hooks e telas ficavam fora do número (56% / 39%).
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts', 'src/data/**', 'src/test-setup.ts', 'src/main.tsx'],
    },
  },
})
