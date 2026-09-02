import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['playwright/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      // lightener-panel.js is hand-authored and shipped straight out of
      // custom_components (rollup only builds the card), so it sits outside this
      // package. allowExternal lets it count; Vitest matches include patterns
      // against the loaded file's full path, so the repo-relative pattern below
      // finds it. Vitest has no coverage.root option: patterns for files under
      // src/ stay relative to js/ so never-imported source files are still
      // globbed and reported as untested.
      allowExternal: true,
      include: ['src/**/*.ts', 'custom_components/lightener_studio/frontend/lightener-panel.js'],
      exclude: ['src/**/*.test.ts', 'src/**/*.bench.ts'],
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
