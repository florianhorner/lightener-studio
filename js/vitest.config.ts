import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['playwright/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      // Rooted at the repo, with allowExternal, so lightener-panel.js counts.
      // That file is hand-authored and shipped straight out of custom_components
      // (rollup only builds the card), so a js/-relative include never saw it —
      // 1300 lines of production frontend were measured by nothing.
      root: '..',
      allowExternal: true,
      include: ['js/src/**/*.ts', 'custom_components/lightener_studio/frontend/lightener-panel.js'],
      exclude: ['js/src/**/*.test.ts', 'js/src/**/*.bench.ts'],
      reporter: ['text', 'html', 'lcov'],
      // Floor, not ratchet. Baseline after the wiring/touch/editor coverage PR
      // is 92.25/85.82/94.21/94.35 (statements/branches/functions/lines), now
      // that lightener-curve-card.ts and the panel are both INCLUDED — the card
      // used to be exempt, so nothing guarded the largest file in the tree.
      // Set ~4pp below to allow legitimate refactor churn; raise when the
      // baseline moves.
      thresholds: {
        lines: 90,
        branches: 81,
        functions: 90,
        statements: 88,
      },
    },
  },
});
