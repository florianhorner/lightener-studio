#!/usr/bin/env node
/**
 * Scenecast runner — the project-agnostic capture engine.
 *
 * Owns the clock + screenshots: for each scene beat it loops progress t 0→1,
 * tells capture.html to render that frame (window.__SCENECAST__.seek), and
 * screenshots at deviceScaleFactor 2. Assembles forward+reverse frames into a
 * seamless-loop GIF (gifski if present, ffmpeg palettegen fallback) and writes
 * a demo-meta.json sidecar stamped with the source SHA.
 *
 * Zero card knowledge lives here — all of that is in capture.html + the scene.
 *
 * Usage:
 *   node runner.mjs <scene.mjs>            # capture → write GIF + demo-meta.json
 *   node runner.mjs <scene.mjs> --check    # rot guard: assert per-beat state,
 *                                          # print FRAMEHASH (determinism), no write
 */
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const JS_DIR = resolve(HERE, '../..');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const framesOutIdx = args.indexOf('--frames-out');
const FRAMES_OUT = framesOutIdx >= 0 ? args[framesOutIdx + 1] : null;
const sceneArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--frames-out');
if (!sceneArg) {
  console.error('usage: runner.mjs <scene.mjs> [--check]');
  process.exit(2);
}

function log(...m) {
  console.log('[scenecast]', ...m);
}
// die() THROWS (does not exit) so main()'s finally always runs cleanup
// (browser.close + vite kill). The top-level .catch() does the process.exit.
function die(msg) {
  throw new Error(msg);
}
// Ephemeral free port — avoids a TIME_WAIT bind race when --check runs
// back-to-back (the integration test runs two captures in sequence).
function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

// --- Locate a binary, preferring gifski for the canonical encode ---
function has(bin) {
  try {
    execFileSync('sh', ['-c', `command -v ${bin}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// --- Boot a vite server rooted at the repo so capture.html can import .ts ---
async function startVite(port) {
  const bin = join(JS_DIR, 'node_modules', '.bin', 'vite');
  const proc = spawn(bin, [REPO_ROOT, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: JS_DIR,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  // Capture stderr so a real boot failure (strictPort bind race, bad config,
  // missing module) surfaces its actual cause instead of an opaque timeout.
  let stderr = '';
  proc.stderr.on('data', (d) => (stderr += d.toString()));
  let exited = false;
  proc.on('exit', () => (exited = true));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error(`vite exited early on port ${port}:\n${stderr.slice(-600)}`);
    try {
      const r = await fetch(`${base}/`, { method: 'GET' });
      if (r.ok || r.status === 404) return { proc, base };
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill('SIGKILL');
  throw new Error(`vite did not start on port ${port} within 10s:\n${stderr.slice(-600)}`);
}

function sourceSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  const scene = (await import(pathToFileURL(resolve(process.cwd(), sceneArg)).href)).default;
  const { frame, fps, beats } = scene;
  const port = await freePort();
  const framesDir = mkdtempSync(join(tmpdir(), 'scenecast-'));
  let vite, browser;

  try {
    log(`scene "${scene.name}": ${beats.length} beats @ ${fps}fps, frame ${frame.w}x${frame.h}`);
    ({ proc: vite } = await startVite(port));
    const base = `http://127.0.0.1:${port}`;
    // Determinism is STRUCTURAL (STATEHASH over logical card state), not
    // byte-pixel — so the aggressive raster flags this used to set are gone.
    // `--deterministic-mode` in particular can stall requestAnimationFrame in
    // headless CI (the page's rAF-based ready/settle waits never fire), hanging
    // the job. Plain launch matches the layout suite that already passes in CI.
    // --disable-gpu is the standard headless flag (faster screenshot readback,
    // CI-stable); it is NOT the rAF-stall culprit. The rest are cosmetic.
    browser = await chromium.launch({ args: ['--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb'] });
    const context = await browser.newContext({
      viewport: { width: frame.w, height: frame.h },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    page.on('pageerror', (e) => log(`page error: ${e.message}`));
    const url = `${base}/js/scripts/scenecast/capture.html?w=${frame.w}&h=${frame.h}`;
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    // Bound the ready wait so a stalled page (e.g. a font/rAF stall) fails the
    // job in seconds instead of hanging CI for hours.
    await Promise.race([
      page.evaluate(() => window.__SCENECAST_READY__),
      new Promise((_, rej) => setTimeout(() => rej(new Error('capture page never became ready (60s)')), 60_000)),
    ]);

    // --- Clock + screenshot loop ---
    const forward = []; // { path } in order
    const endStates = []; // inspect() at the end of each beat (for --check)
    let frameNo = 0;
    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];
      const nFrames = Math.max(1, Math.round((fps * (beat.ms ?? 400)) / 1000));
      for (let f = 0; f < nFrames; f++) {
        const t = nFrames === 1 ? 1 : f / (nFrames - 1);
        // capture.html owns the render; runner only sequences + shoots.
        try {
          await page.evaluate(({ b, idx, tt }) => window.__SCENECAST__.seek(b, idx, tt), {
            b: beats,
            idx: i,
            tt: t,
          });
        } catch (err) {
          die(`beat ${i} (${beat.kind}) seek threw at t=${t.toFixed(2)}: ${err.message}`);
        }
        const p = join(framesDir, `f_${String(frameNo).padStart(5, '0')}.png`);
        await page.screenshot({ path: p });
        forward.push(p);
        frameNo++;
      }
      endStates.push(await page.evaluate(() => window.__SCENECAST__.inspect()));
    }
    log(`captured ${forward.length} forward frames`);

    if (FRAMES_OUT) {
      mkdirSync(FRAMES_OUT, { recursive: true });
      forward.forEach((p, idx) => copyFileSync(p, join(FRAMES_OUT, `f_${String(idx).padStart(5, '0')}.png`)));
      log(`dumped ${forward.length} frames to ${FRAMES_OUT}`);
    }

    // --- Seamless loop: forward + reverse(middle) ---
    const ordered = forward.concat(forward.slice(1, -1).reverse());

    // --- Determinism / dimensions checks (the rot guard premise) ---
    const expectW = frame.w * 2;
    const expectH = frame.h * 2;
    const firstPng = readFileSync(forward[0]);
    // PNG IHDR width/height are big-endian uint32 at byte 16 and 20.
    const gotW = firstPng.readUInt32BE(16);
    const gotH = firstPng.readUInt32BE(20);
    if (gotW !== expectW || gotH !== expectH) {
      die(`frame dims ${gotW}x${gotH} != expected ${expectW}x${expectH} (2× of ${frame.w}x${frame.h})`);
    }

    if (CHECK) {
      // Per-beat card-state assertions (catches broken visual state, not just "ran").
      const exp = scene.expect ?? [];
      for (let i = 0; i < beats.length; i++) {
        const got = endStates[i];
        const want = exp[i] ?? {};
        if (got.cancelAnimating) die(`beat ${i}: card is in cancel-animation (timer leak)`);
        if (got.previewActive) die(`beat ${i}: preview is active (timer leak)`);
        if ('selectedCurveId' in want && got.selectedCurveId !== want.selectedCurveId)
          die(`beat ${i}: selectedCurveId=${got.selectedCurveId} want ${want.selectedCurveId}`);
        if (want.point) {
          const c = got.curves.find((c) => c.entityId === want.point.entity);
          const pt = c?.points[want.point.index];
          if (!pt || pt[0] !== want.point.equals[0] || pt[1] !== want.point.equals[1])
            die(`beat ${i}: point ${want.point.index} of ${want.point.entity} = ${JSON.stringify(pt)} want ${JSON.stringify(want.point.equals)}`);
        }
        if (want.pointCount) {
          const c = got.curves.find((c) => c.entityId === want.pointCount.entity);
          if (!c || c.pointCount !== want.pointCount.is)
            die(`beat ${i}: ${want.pointCount.entity} has ${c?.pointCount} points, want ${want.pointCount.is}`);
        }
      }
      // Determinism contract = STRUCTURAL, not byte-pixel. Browser raster has
      // sub-perceptual AA jitter on a random 1-3 reflow frames per run, so PNG
      // bytes are NOT reproducible (and gifski palette/dither isn't either).
      // What IS fully deterministic — and what actually matters — is the
      // choreography's logical state: same selection, same control points, same
      // counts every run. STATEHASH covers that; the determinism test keys on it.
      const stateHash = createHash('sha256').update(JSON.stringify(endStates.map((s) => ({
        selectedCurveId: s.selectedCurveId,
        curves: s.curves,
        scrubberPosition: s.scrubberPosition,
      })))).digest('hex');
      // Informational: how many forward frames are byte-identical run-to-run is
      // not asserted (sub-perceptual), but we report the pixel-frame signature.
      const pixelHash = createHash('sha256');
      for (const p of forward) pixelHash.update(readFileSync(p));
      console.log(`FRAMES ${forward.length}`);
      console.log(`DIMS ${gotW}x${gotH}`);
      console.log(`STATEHASH ${stateHash}`);
      console.log(`PIXELHASH ${pixelHash.digest('hex')} (informational; not a determinism contract)`);
      log('--check PASSED: per-beat state + dims OK');
      return;
    }

    // --- Encode (gifski canonical; ffmpeg palettegen fallback, non-canonical) ---
    const outPath = resolve(REPO_ROOT, scene.output);
    mkdirSync(dirname(outPath), { recursive: true });
    const gifW = scene.gifWidth ?? frame.w;
    let encoder;
    if (has('gifski')) {
      encoder = 'gifski';
      execFileSync('gifski', ['--fps', String(fps), '--width', String(gifW), '--quality', '90', '-o', outPath, ...ordered], {
        stdio: 'inherit',
      });
    } else if (has('ffmpeg')) {
      encoder = 'ffmpeg (NON-CANONICAL fallback)';
      // ffmpeg needs sequential input; symlink the ordered frames.
      const seqDir = mkdtempSync(join(tmpdir(), 'scenecast-seq-'));
      ordered.forEach((src, idx) => {
        copyFileSync(src, join(seqDir, `s_${String(idx).padStart(5, '0')}.png`));
      });
      const vf = `scale=${gifW}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a`;
      execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(seqDir, 's_%05d.png'), '-vf', vf, '-loop', '0', outPath], {
        stdio: 'inherit',
      });
      rmSync(seqDir, { recursive: true, force: true });
    } else {
      die('no encoder found (install gifski, or ffmpeg for local non-canonical)');
    }

    // --- Source-SHA sidecar: the freshness gate verifies this at release ---
    const meta = {
      source_sha: sourceSha(),
      scene: scene.name,
      frames: ordered.length,
      fps,
      encoder,
      generated_for: scene.output,
    };
    writeFileSync(resolve(REPO_ROOT, '.github/assets/demo-meta.json'), JSON.stringify(meta, null, 2) + '\n');

    const bytes = readFileSync(outPath).length;
    log(`wrote ${outPath} (${(bytes / 1024).toFixed(0)} KB, ${ordered.length} frames, encoder: ${encoder})`);
    if (bytes > 1.5 * 1024 * 1024) log(`WARNING: GIF is ${(bytes / 1024 / 1024).toFixed(2)} MB — over the 1.5 MB budget`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (vite) vite.kill('SIGKILL');
    rmSync(framesDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error('[scenecast] FAIL:', e.message);
  process.exit(1);
});
