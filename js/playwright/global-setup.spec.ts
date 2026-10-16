import { expect, test, type FullConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createServer, type RequestListener } from 'node:http';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import globalSetup from './global-setup';

const IDENTITY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'server-identity');

async function withServer(handler: RequestListener, check: (baseURL: string) => Promise<void>) {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address');
  try {
    await check(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function setupAt(baseURL: string): Promise<void> {
  return globalSetup({ projects: [{ use: { baseURL } }] } as FullConfig);
}

test.describe('dev-server identity', () => {
  // globalSetup writes to one identity directory. Override fullyParallel so
  // these browser-free checks cannot replace one another's token mid-request.
  test.describe.configure({ mode: 'default' });
  let previousSkipBuild: string | undefined;

  test.beforeAll(() => {
    previousSkipBuild = process.env.PLAYWRIGHT_SKIP_BUILD;
    process.env.PLAYWRIGHT_SKIP_BUILD = '1';
  });

  test.afterAll(() => {
    if (previousSkipBuild === undefined) delete process.env.PLAYWRIGHT_SKIP_BUILD;
    else process.env.PLAYWRIGHT_SKIP_BUILD = previousSkipBuild;
  });

  test('accepts the token served from this checkout', async () => {
    await withServer(
      (request, response) => {
        response.end(readFileSync(resolve(IDENTITY_DIR, basename(request.url!)), 'utf8'));
      },
      async (baseURL) => {
        await expect(setupAt(baseURL)).resolves.toBeUndefined();
      }
    );
  });

  test('rejects a different token with the port-collision diagnostic', async () => {
    await withServer(
      (_request, response) => response.end('another-checkout'),
      async (baseURL) => {
        await expect(setupAt(baseURL)).rejects.toThrow(
          `the server at ${baseURL} is not serving this checkout`
        );
      }
    );
  });

  for (const stage of ['headers', 'body'] as const) {
    test(`bounds a response stalled before completing its ${stage}`, async () => {
      test.setTimeout(15_000);
      let fallback: ReturnType<typeof setTimeout> | undefined;
      try {
        await withServer(
          (request, response) => {
            const token = readFileSync(resolve(IDENTITY_DIR, basename(request.url!)), 'utf8');
            if (stage === 'body') {
              response.writeHead(200, { 'Content-Type': 'text/plain' });
              response.write(token.slice(0, 1));
            }
            // Bound the regression test itself: without the abort signal the
            // server eventually returns the correct token, which must fail.
            fallback = setTimeout(() => {
              response.end(stage === 'body' ? token.slice(1) : token);
            }, 10_000);
          },
          async (baseURL) => {
            const started = performance.now();
            await expect(setupAt(baseURL)).rejects.toThrow(
              /not serving this checkout:.*PLAYWRIGHT_PORT=<port>/
            );
            expect(performance.now() - started).toBeLessThan(9_000);
          }
        );
      } finally {
        clearTimeout(fallback);
      }
    });
  }
});
