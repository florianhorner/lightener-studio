# Dependency tooling validation

Local validation recorded on 2026-10-17 with Node 24.22.0, npm 11.19.1 and
Python 3.13.2, against baseline `fc8a8a1`.

The batch updates Vite to 8.3.4, ESLint to 10.12.0, Vitest and its V8 coverage
provider to 5.0.4, the pre-commit floor to 4.7.0, and two workflow pins.
Production sources and the integration manifest match the baseline. Both committed
card bundles have identical bytes.
Home Assistant runtime and physical devices were not exercised.

## Results

| Check | Result |
|---|---|
| Clean `npm ci` and `npm audit` | Passed; audit reports zero vulnerabilities |
| `npm run test:coverage` | 1,193 frontend tests in 39 files, plus 22 Node guard tests, passed |
| Coverage comparison | Same 29 files, per-file totals and covered lines as the baseline |
| Coverage floors | Unchanged: lines 90%, branches 81%, functions 90%, statements 88% |
| `npm run test:browser` | 167 Chromium tests passed against the built bundles |
| `npm run demo:check` | Six beats and 117 forward frames passed state and dimension checks |
| Backend coverage | 324 passed, one existing skip; 98.51% coverage |
| ESLint, Prettier, TypeScript and Ruff | Passed |
| Mypy | Passed both in preflight and a clean Python 3.12 environment with mypy 2.4.0 |
| Workflow lint and repository guards | Passed |
| Dependabot grouping fixtures and diagnostics | 29/29 passed |

The subsequent Dependabot guard correction was revalidated with its fixtures,
Ruff and ShellCheck. The frontend, backend and browser results above are from
the original batch validation.

Frontend coverage remained at 94.40% statements, 89.08% branches, 95.63%
functions and 96.38% lines. Expanded discovery kept the same test count in each
file. Fourteen parameterized titles changed only in Vitest 5's quote, truncation
or signed-zero formatting; test sources and skips are unchanged.

## Regression guards

The coverage command now rejects missing instrumentation or zero covered lines
for either the card or the external panel. Its 12 fixture tests include missing
reports, both missing entrypoints and unrelated files with the same names.

The Dependabot guard requires the installed Vitest family to stay together for
major, minor and patch version updates. Fixtures cover missing membership,
exclusions, security-only groups, omitted versus empty name patterns, mixed
dependency types and earlier groups intercepting a family member. Diagnostic
checks cover incomplete groups without claiming another group exists.
Security-update grouping is outside this guard's guarantee.

## Artifact identity

Both committed card bundles have SHA-256 `683894df3ba3fd0e07e375d499813f14d93768a9c1ba86dd64c246d69742cab2`.

Tooling fingerprint: `9a74e6c5a537297c365fcdc77d2481177126e31f09a507510bdd30c561efecc6`. For the sorted paths below, concatenate
each UTF-8 path, a NUL byte and its binary SHA-256 digest, then hash the result.
This excludes this report and other prose.

```text
.github/dependabot.yml
.github/workflows/checkout-credentials.yml
.github/workflows/validate.yml
js/package-lock.json
js/package.json
js/scripts/check-coverage-scope.itest.mjs
js/scripts/check-coverage-scope.mjs
js/vitest.config.ts
requirements.txt
scripts/lint-dependabot
scripts/test-lint-dependabot
```
