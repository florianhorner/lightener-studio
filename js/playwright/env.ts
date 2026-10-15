import { createHash } from 'node:crypto';

/**
 * The dev-server port range: 4173-4572. It stays below 5000, which macOS uses
 * for AirPlay, and below 5173, vite's own default.
 */
export const PORT_BASE = 4173;
export const PORT_SPAN = 400;

/** Only an explicit yes skips the build. Unset, empty or anything else builds. */
const SKIP_VALUES = new Set(['1', 'true', 'yes']);

/** True when the caller has already built the bundle this run will test. */
export function buildSkipRequested(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.PLAYWRIGHT_SKIP_BUILD;
  return flag !== undefined && SKIP_VALUES.has(flag.trim().toLowerCase());
}

/**
 * The dev-server port for the checkout at `root`, derived from its path so
 * parallel worktrees rarely share one (served-bundle-identity.spec.ts catches
 * the collisions that remain).
 *
 * PLAYWRIGHT_PORT overrides it. It must be a plain decimal port: anything else
 * throws, because falling back silently would send the suite to a port nobody
 * asked for.
 */
export function derivePort(root: string, env: NodeJS.ProcessEnv = process.env): number {
  const override = env.PLAYWRIGHT_PORT?.trim();
  if (override) {
    const port = Number(override);
    if (!/^\d+$/.test(override) || port < 1 || port > 65535) {
      throw new Error(
        `PLAYWRIGHT_PORT must be a port number from 1 to 65535, got ${JSON.stringify(env.PLAYWRIGHT_PORT)}`
      );
    }
    return port;
  }
  const digest = createHash('sha256').update(root).digest();
  return PORT_BASE + (digest.readUInt16BE(0) % PORT_SPAN);
}
