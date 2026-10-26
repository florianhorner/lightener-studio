import { testLightService } from '../test-guarded-backend.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewController, type PreviewControllerHost } from './preview-controller.js';
import { lightValue, PreviewSessionRegistry } from './preview-session.js';
import type { ControlPoint, Hass, LightCurve } from './types.js';

const LINEAR: ControlPoint[] = [
  { lightener: 0, target: 0 },
  { lightener: 100, target: 100 },
];

function makeCurve(entityId: string, points: ControlPoint[] = LINEAR): LightCurve {
  return { entityId, friendlyName: entityId, controlPoints: points, visible: true, color: '#fff' };
}

type MockHass = Hass & { callService: ReturnType<typeof vi.fn> };

function makeHass(
  states: Hass['states'] = Object.fromEntries(
    ['a', 'b', 'shown', 'hidden'].map((id) => [
      `light.${id}`,
      { state: 'on', attributes: { brightness: 120 } },
    ])
  )
): MockHass {
  return {
    user: { is_admin: true, id: 'user' },
    callWS: vi.fn(),
    callApi: vi.fn(),
    callService: vi.fn(testLightService(states)),
    states,
  } as unknown as MockHass;
}

interface TestHost extends PreviewControllerHost {
  hass: Hass | null;
  curves: LightCurve[];
  storageEntityId: string | undefined;
  scrubber: number | null;
  previewActive: boolean;
  persisted: Array<[string, number]>;
}

function makeHost(hass: Hass | null, curves: LightCurve[] = []): TestHost {
  const host: TestHost = {
    hass,
    curves,
    storageEntityId: 'light.group',
    scrubber: null,
    previewActive: false,
    persisted: [],
    getHass: () => host.hass,
    getCurves: () => host.curves,
    getScrubberPosition: () => host.scrubber,
    setScrubberPosition: (p: number) => {
      host.scrubber = p;
    },
    getStorageEntityId: () => host.storageEntityId,
    persistScrubberPosition: (e: string, p: number) => {
      host.persisted.push([e, p]);
    },
    setPreviewActive: (a: boolean) => {
      host.previewActive = a;
    },
  };
  return host;
}

// Drives requestAnimationFrame synchronously: each frame's callback is queued
// here and only runs when flushRaf() is called, so throttle/RAF tests can
// inspect state between scheduling and execution.
let registry = new PreviewSessionRegistry();
function newController(host: PreviewControllerHost, interval = 300): PreviewController {
  return new PreviewController(host, interval, registry);
}
let rafQueue: FrameRequestCallback[] = [];
async function flushRaf(microtasks = 2): Promise<void> {
  const cbs = rafQueue;
  rafQueue = [];
  cbs.forEach((cb) => cb(0));
  for (let i = 0; i < microtasks; i++) await Promise.resolve();
}

beforeEach(() => {
  registry = new PreviewSessionRegistry();
  vi.stubGlobal('location', { origin: 'http://test' });
  rafQueue = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('does not restore a visible light that Watch never touched', async () => {
  const hass = makeHass({ 'light.a': { state: 'on', attributes: { brightness: 73 } } });
  const controller = newController(makeHost(hass, [makeCurve('light.a')]));
  controller.start();
  await controller.stop();
  await flushRaf();
  expect(hass.callService).not.toHaveBeenCalled();
});

describe('PreviewController — lifecycle', () => {
  it('start() is a no-op when hass is null', async () => {
    const host = makeHost(null, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    expect(ctrl.active).toBe(false);
    expect(host.previewActive).toBe(false);
  });

  it('start() activates, defaults the scrubber to 50, and persists it', async () => {
    const host = makeHost(makeHass(), [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    expect(ctrl.active).toBe(true);
    expect(host.previewActive).toBe(true);
    expect(host.scrubber).toBe(50);
    expect(host.persisted).toContainEqual(['light.group', 50]);
  });

  it('start() keeps an existing scrubber position', async () => {
    const host = makeHost(makeHass(), [makeCurve('light.a')]);
    host.scrubber = 20;
    const ctrl = newController(host);
    ctrl.start();
    expect(host.scrubber).toBe(20);
    expect(host.persisted).toHaveLength(0);
  });

  it('start() is a no-op when already active', async () => {
    const host = makeHost(makeHass(), [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    host.persisted = [];
    host.scrubber = 80;
    ctrl.start();
    // Second start did not re-default the scrubber or re-persist.
    expect(host.scrubber).toBe(80);
    expect(host.persisted).toHaveLength(0);
  });

  it('stop() restores off / on-no-brightness / numeric brightness', async () => {
    const hass = makeHass({
      'light.off': { state: 'off', attributes: {} },
      'light.on': { state: 'on', attributes: {} },
      'light.dim': { state: 'on', attributes: { brightness: 120 } },
    });
    const host = makeHost(hass, [
      makeCurve('light.off'),
      makeCurve('light.on'),
      makeCurve('light.dim'),
    ]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    await ctrl.stop();
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_off',
      {
        entity_id: 'light.off',
        transition: 0.25,
      },
      undefined,
      false
    );
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.on',
        transition: 0.25,
      },
      undefined,
      false
    );
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.dim',
        brightness: 120,
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  it('stop() with a null hass still deactivates and stays restartable', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    expect(ctrl.active).toBe(true);

    // hass disappears (card lost its hass), then preview stops.
    host.hass = null;
    await ctrl.stop();
    expect(ctrl.active).toBe(false);
    expect(host.previewActive).toBe(false);

    // The controller must be restartable once hass returns.
    host.hass = hass;
    ctrl.start();
    expect(ctrl.active).toBe(true);
  });

  it('disconnect() with a null hass still deactivates', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();

    host.hass = null;
    ctrl.disconnect();
    expect(ctrl.active).toBe(false);
    expect(host.previewActive).toBe(false);
  });

  it('stop() is a no-op when the controller is not active', async () => {
    const hass = makeHass();
    const ctrl = newController(makeHost(hass, [makeCurve('light.a')]));
    expect(() => ctrl.stop()).not.toThrow();
    expect(hass.callService).not.toHaveBeenCalled();
  });
});

describe('PreviewController — throttle / RAF / dedupe', () => {
  it('start() pushes brightness to every visible curve on the first frame', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a'), makeCurve('light.b')]);
    newController(host).start();
    await flushRaf();
    // Scrubber defaults to 50 -> linear curve -> brightness 128.
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 128,
        transition: 0.25,
      },
      undefined,
      false
    );
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.b',
        brightness: 128,
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  it('coalesces rapid previewLights() calls behind a single trailing update', async () => {
    vi.useFakeTimers();
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    // A call within the throttle interval schedules a trailing timer only —
    // no immediate frame, no service call yet.
    ctrl.previewLights(90);
    expect(rafQueue).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();

    // After the interval elapses the trailing update runs.
    vi.advanceTimersByTime(300);
    await flushRaf();
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 230,
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  it('does not re-send an unchanged brightness', async () => {
    vi.useFakeTimers();
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    // Same position again -> same brightness -> deduped away.
    vi.advanceTimersByTime(300);
    ctrl.previewLights(50);
    await flushRaf();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('turns a light off when the curve samples to zero brightness', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    ctrl.previewLights(0, true);
    await flushRaf();
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_off',
      {
        entity_id: 'light.a',
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  // The card used to round the sample to a whole percent before converting to
  // 0-255, which put its off threshold at <0.5% while the backend's real one is
  // <0.196% (it interpolates directly on the 0-255 scale and never rounds in
  // percent space). Samples in that gap made the card turn the light off and
  // print "0%" while the saved curve left it at brightness 1.
  it('keeps a sub-percent sample on at brightness 1 instead of turning it off', async () => {
    const hass = makeHass();
    // 0 -> 0, 100 -> 10, so position 4 samples to 0.4%. That is under a whole
    // percent, but round(0.4 / 100 * 255) === 1 on the scale the light uses.
    const host = makeHost(hass, [
      makeCurve('light.a', [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 10 },
      ]),
    ]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    ctrl.previewLights(4, true);
    await flushRaf();
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 1,
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  it('still turns off below the real 0-255 off threshold', async () => {
    const hass = makeHass();
    // position 1 samples to 0.1%, and round(0.1 / 100 * 255) === 0, so it is off
    // on the light's own scale too and must stay a turn_off.
    const host = makeHost(hass, [
      makeCurve('light.a', [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 10 },
      ]),
    ]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    ctrl.previewLights(1, true);
    await flushRaf();
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_off',
      {
        entity_id: 'light.a',
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  // The exact crossing, pinned from both sides. round(level / 100 * 255) first
  // reaches 1 at level 0.5 / 2.55 = 0.19607...%, so 0.19 is the last level that
  // is genuinely off and 0.20 is the first that is not. Both sit inside the
  // [0.196, 0.5) band the old whole-percent rounding swallowed, so restoring
  // that Math.round turns the 0.20 case back into a turn_off and fails here.
  it.each([
    { position: 1.9, level: '0.19%', call: 'turn_off' as const },
    { position: 2.0, level: '0.20%', call: 'turn_on' as const },
  ])('treats $level as $call at the 0-255 crossing', async ({ position, call }) => {
    const hass = makeHass();
    // 0 -> 0, 100 -> 10, so the sampled target is position / 10.
    const host = makeHost(hass, [
      makeCurve('light.a', [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 10 },
      ]),
    ]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    ctrl.previewLights(position, true);
    await flushRaf();
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      call,
      call === 'turn_off'
        ? { entity_id: 'light.a', transition: 0.25 }
        : { entity_id: 'light.a', brightness: 1, transition: 0.25 },
      undefined,
      false
    );
  });

  it('a frame scheduled before stop() does nothing when it later runs', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    // A frame is pending from start(); stop() bumps the frame generation.
    await ctrl.stop();
    hass.callService.mockClear();
    await flushRaf();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('skips hidden curves', async () => {
    const hass = makeHass();
    const hidden = { ...makeCurve('light.hidden'), visible: false };
    const host = makeHost(hass, [makeCurve('light.shown'), hidden]);
    newController(host).start();
    await flushRaf();
    const touched = hass.callService.mock.calls.map(
      (c) => (c[2] as { entity_id: string }).entity_id
    );
    expect(touched).toContain('light.shown');
    expect(touched).not.toContain('light.hidden');
  });

  it('does not restore hidden curves that preview never touched', async () => {
    const hass = makeHass({
      'light.shown': { state: 'on', attributes: { brightness: 120 } },
      'light.hidden': { state: 'on', attributes: { brightness: 80 } },
    });
    const hidden = { ...makeCurve('light.hidden'), visible: false };
    const host = makeHost(hass, [makeCurve('light.shown'), hidden]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    await ctrl.stop();
    const restored = hass.callService.mock.calls.map(
      (c) => (c[2] as { entity_id: string }).entity_id
    );
    expect(restored).toContain('light.shown');
    expect(restored).not.toContain('light.hidden');
  });

  it('refresh() re-applies the current position while active and is inert when inactive', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);

    // Inactive: refresh is a no-op.
    ctrl.refresh(true);
    await flushRaf();
    expect(hass.callService).not.toHaveBeenCalled();

    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();
    ctrl.refresh(true);
    await flushRaf();
    expect(hass.callService).toHaveBeenCalled();
  });
});

describe('PreviewController — previewSingleLight (point-edit path)', () => {
  it('drives only the named light, leaving every other light untouched', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a'), makeCurve('light.b')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf(); // both lights land at 128 (scrubber 50, linear)
    hass.callService.mockClear();

    // User drags light.a's point to x=100 -> that light alone goes to full.
    ctrl.previewSingleLight('light.a', 100, true);
    await flushRaf();

    const calls = hass.callService.mock.calls.map(
      (c) => c[2] as { entity_id: string; brightness?: number; transition: number }
    );
    expect(calls).toEqual([{ entity_id: 'light.a', brightness: 255, transition: 0.25 }]);
  });

  it('drives a single light to an explicit value, ignoring the curve sample', async () => {
    // Origin dim-floor curve: sampleCurveAt(curve, 0) === 0 (off), because a
    // non-zero floor only applies above lightener 0. Dragging the origin point
    // must drive the light to the dragged floor (40% -> 102), not turn it off.
    const hass = makeHass();
    const floor = makeCurve('light.a', [
      { lightener: 0, target: 40 },
      { lightener: 100, target: 100 },
    ]);
    const host = makeHost(hass, [floor]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    ctrl.previewSingleLight('light.a', 0, true, 40);
    await flushRaf();
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 102,
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  it('is a no-op when the controller is inactive', async () => {
    const hass = makeHass();
    const ctrl = newController(makeHost(hass, [makeCurve('light.a')]));
    ctrl.previewSingleLight('light.a', 100, true);
    await flushRaf();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('ignores an entity that is not a current curve', async () => {
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    ctrl.previewSingleLight('light.ghost', 100, true);
    await flushRaf();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('does not push a curve that has been hidden', async () => {
    const hass = makeHass();
    const hidden = { ...makeCurve('light.hidden'), visible: false };
    const host = makeHost(hass, [makeCurve('light.a'), hidden]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf();
    hass.callService.mockClear();

    ctrl.previewSingleLight('light.hidden', 100, true);
    await flushRaf();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('lazily snapshots a light unhidden mid-preview so stop() restores it', async () => {
    // Hidden at start() -> skipped by the initial snapshot. Unhide + scrub
    // drives it; stop() must still restore its true pre-preview brightness,
    // not leave it stuck at the preview value.
    const hass = makeHass({
      'light.a': { state: 'on', attributes: { brightness: 200 } },
      'light.b': { state: 'on', attributes: { brightness: 40 } },
    });
    const hidden = { ...makeCurve('light.b'), visible: false };
    const host = makeHost(hass, [makeCurve('light.a'), hidden]);
    const ctrl = newController(host);
    ctrl.start(); // snapshots light.a only (light.b hidden)
    await flushRaf();

    // Unhide light.b, then an all-lights refresh drives it to a preview value.
    host.curves = [makeCurve('light.a'), makeCurve('light.b')];
    ctrl.refresh(true);
    await flushRaf();
    hass.callService.mockClear();

    await ctrl.stop();
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.b',
        brightness: 40,
        transition: 0.25,
      },
      undefined,
      false
    );
  });

  it('dedupes an unchanged single-light brightness (non-force drag path)', async () => {
    vi.useFakeTimers();
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf(); // light.a at 128
    hass.callService.mockClear();

    // The drag path is non-force: re-driving light.a to the same value
    // (position 50 -> 128) is deduped away.
    ctrl.previewSingleLight('light.a', 50);
    vi.advanceTimersByTime(300);
    await flushRaf();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('a single-light force does not reset other lights’ dedupe state', async () => {
    vi.useFakeTimers();
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a'), makeCurve('light.b')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf(); // a,b at 128
    hass.callService.mockClear();

    // Edit light.a to full (scoped force resets only light.a's dedupe state).
    ctrl.previewSingleLight('light.a', 100, true);
    await flushRaf();
    hass.callService.mockClear();

    // An all-lights refresh at the same scrubber position must re-push light.a
    // (its remembered 255 != 128) but still dedupe light.b (untouched, 128).
    ctrl.previewLights(50); // non-force, scrubber still at 50
    vi.advanceTimersByTime(300);
    await flushRaf();
    const touched = hass.callService.mock.calls.map(
      (c) => (c[2] as { entity_id: string }).entity_id
    );
    expect(touched).toEqual(['light.a']);
  });

  it('a newer all-lights scrub wins over an older queued per-light edit', async () => {
    vi.useFakeTimers();
    const hass = makeHass();
    const host = makeHost(hass, [makeCurve('light.a'), makeCurve('light.b')]);
    const ctrl = newController(host);
    ctrl.start();
    await flushRaf(); // a,b at 128
    hass.callService.mockClear();

    // A per-light edit is queued behind the throttle (trailing timer only)...
    ctrl.previewSingleLight('light.a', 100);
    expect(rafQueue).toHaveLength(0);
    // ...then a whole-room scrub arrives before it fires. The newer request
    // owns _pending, so when the throttle releases it drives BOTH lights at the
    // scrub position — the stale per-light edit never reaches a light.
    ctrl.previewLights(0);
    vi.advanceTimersByTime(300);
    await flushRaf();
    const touched = hass.callService.mock.calls
      .map((c) => (c[2] as { entity_id: string }).entity_id)
      .sort();
    expect(touched).toEqual(['light.a', 'light.b']);
    // Both went to 0 -> turn_off, not light.a -> 255 from the abandoned edit.
    expect(hass.callService.mock.calls.every((c) => c[1] === 'turn_off')).toBe(true);
  });
});

describe('restoration receipts and reservations', () => {
  const receipt = { context: { id: 'correlated-ha-result' } };
  function deferred() {
    let resolve!: (value: unknown) => void, reject!: (reason: unknown) => void;
    const promise = new Promise<unknown>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    return { promise, resolve, reject };
  }
  async function tick() {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  }
  const frame = () => flushRaf(8);
  function harness(ids = ['light.a'], group = 'light.group', user = 'user') {
    const states: Hass['states'] = Object.fromEntries(
      ids.map((id) => [
        id,
        { state: 'on', attributes: { brightness: 70, friendly_name: `${id} full name` } },
      ])
    );
    const effects: Array<{ service: string; data: Record<string, unknown> }> = [];
    const apply = (service: string, data: Record<string, unknown>) => {
      effects.push({ service, data });
      const state = states[String(data.entity_id)];
      state.state = service === 'turn_off' ? 'off' : 'on';
      if (data.brightness === undefined) delete state.attributes.brightness;
      else state.attributes.brightness = Number(data.brightness);
    };
    const hass = makeHass(states);
    hass.user.id = user;
    hass.connected = true;
    hass.callService.mockImplementation(async (_domain, service, data = {}) => {
      apply(service, data);
      return receipt;
    });
    const host = makeHost(
      hass,
      ids.map((id) => makeCurve(id))
    );
    host.storageEntityId = group;
    host.scrubber = 50;
    let authorized = true;
    host.canDispatch = () => authorized;
    const controller = new PreviewController(host, 300, registry);
    return {
      controller,
      hass,
      effects,
      apply,
      setHass: (value: Hass | null) => {
        host.hass = value;
      },
      authorize: (value: boolean) => {
        authorized = value;
      },
      curves: (value: LightCurve[]) => {
        host.curves = value;
      },
      getCurves: () => host.curves,
    };
  }
  beforeEach(() => vi.useFakeTimers());

  it.each(['off', 'on', 17] as const)(
    'restores exact %s distinction only after HA receipts',
    async (before) => {
      const h = harness();
      h.hass.states['light.a'] =
        before === 'off'
          ? { state: 'off', attributes: {} }
          : { state: 'on', attributes: typeof before === 'number' ? { brightness: before } : {} };
      h.controller.start();
      await frame();
      expect(lightValue(h.hass, 'light.a')).toBe(128);
      expect(await h.controller.stop()).toBe(true);
      expect(lightValue(h.hass, 'light.a')).toBe(before);
      expect(h.controller.sessions[0].lights.get('light.a')?.outcome).toBe('restore-acknowledged');
    }
  );
  it.each([undefined, 'unknown', 'unavailable'])(
    'never commands a missing/invalid %s state',
    async (state) => {
      const h = harness();
      if (state === undefined) delete h.hass.states['light.a'];
      else h.hass.states['light.a'].state = state;
      h.controller.start();
      await frame();
      await h.controller.stop();
      expect(h.effects).toEqual([]);
    }
  );
  it('serializes pending preview before restoration and coalesces unsent preview', async () => {
    const h = harness(),
      held = deferred();
    vi.mocked(h.hass.callService).mockImplementationOnce(async (_domain, service, data = {}) => {
      await held.promise;
      h.apply(service, data);
      return receipt;
    });
    h.controller.start();
    await frame();
    h.controller.previewLights(80, true);
    await frame();
    h.controller.previewLights(90, true);
    await frame();
    const stopped = h.controller.stop();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    held.resolve(receipt);
    await tick();
    expect(await stopped).toBe(true);
    expect(h.effects.map((effect) => effect.data.brightness)).toEqual([128, 70]);
  });
  it('coalesces serialized requests while still watching', async () => {
    const h = harness(),
      held = deferred();
    vi.mocked(h.hass.callService).mockImplementationOnce(async (_domain, service, data = {}) => {
      await held.promise;
      h.apply(service, data);
      return receipt;
    });
    h.controller.start();
    await frame();
    h.controller.previewLights(80, true);
    await frame();
    h.controller.previewSingleLight('light.a', 90, true);
    await frame();
    held.resolve(receipt);
    await tick();
    expect(h.effects.map((effect) => effect.data.brightness)).toEqual([128, 230]);
  });
  it.each(['preview', 'restore'])(
    'retains authoritative rejected %s for explicit disposition',
    async (stage) => {
      const h = harness();
      if (stage === 'restore') {
        h.controller.start();
        await frame();
      }
      vi.mocked(h.hass.callService).mockRejectedValueOnce({
        code: 'service_validation_error',
        message: 'synthetic terminal result',
      });
      if (stage === 'preview') {
        h.controller.start();
        await frame();
      }
      await h.controller.stop();
      expect(h.controller.sessions[0].lights.get('light.a')?.pending).toBe(false);
      expect(h.controller.blocked).toBe(true);
      expect(h.controller.keepCurrent(h.controller.reviewToken())).toBe(true);
      expect(h.controller.blocked).toBe(false);
    }
  );
  it('transport rejection is not cancellation even when the effect executes later', async () => {
    const h = harness();
    vi.mocked(h.hass.callService).mockImplementationOnce(async (_domain, service, data = {}) => {
      setTimeout(() => h.apply(service, data), 500);
      throw { error: { code: 3 } };
    });
    h.controller.start();
    await frame();
    await h.controller.stop();
    const token = h.controller.reviewToken();
    h.controller.keepCurrent(token);
    expect(h.controller.blocked).toBe(true);
    h.controller.start();
    await frame();
    vi.advanceTimersByTime(500);
    await tick();
    expect(lightValue(h.hass, 'light.a')).toBe(128);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.controller.restoreSelected(h.controller.reviewToken(), ['light.a'])).toBe(false);
  });
  it.each([
    undefined,
    new Error('transport'),
    { code: 'unrecognized', message: 'not a known receipt' },
  ])('unclassified result/rejection stays fenced: %s', async (result) => {
    const h = harness();
    if (result === undefined) vi.mocked(h.hass.callService).mockResolvedValueOnce(result);
    else vi.mocked(h.hass.callService).mockRejectedValueOnce(result);
    h.controller.start();
    await frame();
    await h.controller.stop();
    expect(h.controller.sessions[0].lights.get('light.a')?.pending).toBe(true);
    expect(h.controller.sessions[0].lights.get('light.a')?.outcome).toBe('outcome-unknown');
  });
  it.each(['success', 'error'])(
    'timeout then late %s never starts an automatic restore',
    async (kind) => {
      const h = harness(),
        held = deferred();
      vi.mocked(h.hass.callService).mockReturnValueOnce(held.promise);
      h.controller.start();
      await frame();
      const stopped = h.controller.stop();
      vi.advanceTimersByTime(10_000);
      await tick();
      expect(await stopped).toBe(false);
      if (kind === 'success') {
        h.apply('turn_on', { entity_id: 'light.a', brightness: 128 });
        held.resolve(receipt);
      } else held.reject({ code: 'not_found', message: 'terminal late error' });
      await tick();
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
      expect(h.controller.blocked).toBe(true);
      expect(h.controller.sessions[0].lights.get('light.a')?.pending).toBe(false);
    }
  );
  it('Keep current before late receipt cannot release ownership until both are present', async () => {
    const h = harness(),
      held = deferred();
    vi.mocked(h.hass.callService).mockReturnValueOnce(held.promise);
    h.controller.start();
    await frame();
    h.controller.disconnect();
    h.controller.keepCurrent(h.controller.reviewToken());
    const other = harness(['light.a'], 'light.other', 'different-user');
    other.controller.start();
    await frame();
    expect(other.hass.callService).not.toHaveBeenCalled();
    held.resolve(receipt);
    await tick();
    other.controller.start();
    await frame();
    expect(other.hass.callService).toHaveBeenCalledTimes(1);
  });
  it('account changes hide timed-out work without releasing shared lights or blocking disjoint lights', async () => {
    const nextFrame = async () => {
      await vi.advanceTimersByTimeAsync(20);
      await frame();
    };
    const first = harness(),
      held = deferred();
    vi.mocked(first.hass.callService).mockReturnValueOnce(held.promise);
    first.controller.start();
    await nextFrame();
    expect(first.hass.callService).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    await tick();

    const other = harness(['light.a'], 'light.other', 'different-user');
    first.setHass(other.hass);
    first.controller.observe();
    expect(first.controller.sessions).toEqual([]);
    other.controller.start();
    await nextFrame();
    expect(other.hass.callService).not.toHaveBeenCalled();
    expect(other.controller.reviewSessions.every((session) => session.lights.size === 0)).toBe(
      true
    );
    expect(other.controller.admissionIssue).toMatch(/active|unconfirmed/);
    expect(other.controller.admissionIssue).not.toMatch(/review/i);
    expect(other.controller.beginMutation(['light.a'])).toBeNull();

    const disjoint = harness(['light.b'], 'light.disjoint', 'different-user');
    disjoint.controller.start();
    await nextFrame();
    expect(disjoint.hass.callService).toHaveBeenCalledTimes(1);

    first.apply('turn_on', { entity_id: 'light.a', brightness: 128 });
    held.resolve(receipt);
    await tick();
    other.controller.start();
    await nextFrame();
    expect(other.hass.callService).not.toHaveBeenCalled();
    expect(other.controller.beginMutation(['light.a'])).toBeNull();
    expect(first.hass.callService).toHaveBeenCalledTimes(1);

    const returning = harness();
    returning.controller.connect();
    expect(returning.controller.keepCurrent(returning.controller.reviewToken())).toBe(true);
    expect(returning.hass.callService).not.toHaveBeenCalled();
    const commit = other.controller.beginMutation(['light.a']);
    expect(commit).not.toBeNull();
    commit!();
    other.controller.start();
    await nextFrame();
    expect(other.hass.callService).toHaveBeenCalledTimes(1);
  });
  it('detach retains a clean editor receipt across true owner replacement with no new restore', async () => {
    const h = harness(),
      held = deferred();
    vi.mocked(h.hass.callService).mockReturnValueOnce(held.promise);
    h.controller.start();
    await frame();
    h.controller.disconnect();
    h.controller.disconnect();
    held.resolve(receipt);
    await tick();
    const replacement = harness();
    replacement.controller.connect();
    expect(replacement.controller.sessions).toHaveLength(1);
    expect(replacement.controller.blocked).toBe(true);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(replacement.hass.callService).not.toHaveBeenCalled();
  });
  it.each(['connection', 'permission', 'principal', 'barrier'])(
    '%s loss fences queued and late commands',
    async (kind) => {
      const h = harness(),
        held = deferred();
      vi.mocked(h.hass.callService).mockReturnValueOnce(held.promise);
      h.controller.start();
      await frame();
      h.controller.previewLights(90, true);
      if (kind === 'connection') h.hass.connected = false;
      if (kind === 'permission') h.hass.user.is_admin = false;
      if (kind === 'principal') h.hass.user.id = 'other-user';
      if (kind === 'barrier') h.authorize(false);
      h.controller.observe();
      await frame();
      held.resolve(receipt);
      await tick();
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
      expect(h.controller.active).toBe(false);
      if (kind === 'principal') expect(h.controller.sessions).toEqual([]);
    }
  );
  it('null hass stop keeps touched evidence and cannot restore with a cached connection', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.setHass(null);
    await h.controller.stop();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    h.setHass(h.hass);
    h.controller.connect();
    expect(h.controller.blocked).toBe(true);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
  });
  it('atomic reservation blocks overlapping groups but disjoint groups continue', async () => {
    const owner = harness();
    owner.controller.start();
    await frame();
    const overlap = harness(['light.b', 'light.a'], 'light.other');
    overlap.controller.start();
    await frame();
    expect(overlap.hass.callService).not.toHaveBeenCalled();
    const disjoint = harness(['light.c'], 'light.third');
    disjoint.controller.start();
    await frame();
    expect(disjoint.hass.callService).toHaveBeenCalledTimes(1);
    await owner.controller.stop();
    overlap.controller.start();
    await frame();
    expect(overlap.hass.callService).toHaveBeenCalledTimes(2);
  });
  it('observed external change skips automatic restore and freezes that light during Watch', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.hass.states['light.a'].attributes.brightness = 200;
    h.controller.observe();
    h.controller.previewLights(90, true);
    await frame();
    await h.controller.stop();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(lightValue(h.hass, 'light.a')).toBe(200);
    expect(h.controller.sessions[0].lights.get('light.a')?.outcome).toBe('skipped');
    expect(h.controller.restoreSelected(h.controller.reviewToken(), [])).toBe(true);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.controller.restoreSelected(h.controller.reviewToken(), ['light.a'])).toBe(true);
    await tick();
    expect(lightValue(h.hass, 'light.a')).toBe(70);
  });
  it.each(['state', 'membership', 'principal', 'barrier', 'receipt'])(
    'obsolete review cannot command after %s change',
    async (kind) => {
      const h = harness();
      h.controller.start();
      await frame();
      h.controller.disconnect();
      const token = h.controller.reviewToken();
      if (kind === 'state') h.hass.states['light.a'].attributes.brightness = 11;
      if (kind === 'membership') h.curves([]);
      if (kind === 'principal') h.hass.user.id = 'other';
      if (kind === 'barrier') h.authorize(false);
      if (kind === 'receipt') registry.abandon(h.controller.sessions[0]);
      expect(h.controller.restoreSelected(token, ['light.a'])).toBe(false);
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
    }
  );
  it('removed members cannot be explicitly restored with a fresh review either', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.controller.disconnect();
    h.curves([]);
    expect(h.controller.restoreSelected(h.controller.reviewToken(), ['light.a'])).toBe(false);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
  });
  it('partial success retains only the rejected restoration for review', async () => {
    const h = harness(['light.a', 'light.b']);
    h.controller.start();
    await frame();
    vi.mocked(h.hass.callService)
      .mockImplementationOnce(async (_domain, service, data = {}) => {
        h.apply(service, data);
        return receipt;
      })
      .mockRejectedValueOnce({ code: 'not_found', message: 'terminal' });
    expect(await h.controller.stop()).toBe(false);
    await tick();
    expect(h.controller.sessions[0].lights.get('light.a')?.disposition).toBe(true);
    expect(h.controller.sessions[0].lights.get('light.b')?.disposition).toBe(false);
  });
  it('pending restore keeps overlap blocked after Keep current until terminal completion', async () => {
    const h = harness(),
      held = deferred();
    h.controller.start();
    await frame();
    vi.mocked(h.hass.callService).mockReturnValueOnce(held.promise);
    const stopped = h.controller.stop();
    expect(h.controller.sessions[0].lights.get('light.a')?.outcome).toBe('restore-pending');
    h.controller.keepCurrent(h.controller.reviewToken());
    expect(await stopped).toBe(false);
    expect(h.controller.blocked).toBe(true);
    held.resolve(receipt);
    await tick();
    expect(h.controller.blocked).toBe(false);
  });
  it('resource bounds retain every unresolved session and fail closed', () => {
    for (let i = 0; i < 128; i++)
      expect(registry.create('user', `group${i}`, 'owner')).not.toBeNull();
    expect(registry.create('user', 'overflow', 'owner')).toBeNull();
    expect(registry.list('user', 'group0')).toHaveLength(1);
  });
  it('resolved summaries are bounded without discarding unresolved evidence', () => {
    const unresolved = registry.create('user', 'pending', 'owner')!;
    for (let i = 0; i < 40; i++) {
      const s = registry.create('user', 'group', 'owner')!;
      registry.stop(s, true);
    }
    expect(registry.list('user', 'group').length).toBeLessThanOrEqual(16);
    expect(registry.list('user', 'pending')).toEqual([unresolved]);
  });

  it('connection event fences immediately even before the next HA snapshot', async () => {
    const h = harness();
    let lost!: () => void;
    h.hass.connection = {
      connected: true,
      addEventListener: (_type, fn) => {
        lost = fn;
      },
      removeEventListener: vi.fn(),
    };
    h.controller.start();
    await frame();
    lost();
    h.controller.previewLights(90, true);
    await frame();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.controller.active).toBe(false);
  });
  it('native connection getter prevents reconnect-queued dispatch over a stale hass.connected snapshot', async () => {
    const h = harness();
    h.hass.connection = {
      connected: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    h.controller.start();
    await frame();
    expect(h.hass.callService).not.toHaveBeenCalled();
  });
  it('late restore success after timeout still requires explicit disposition', async () => {
    const h = harness(),
      held = deferred();
    h.controller.start();
    await frame();
    vi.mocked(h.hass.callService).mockReturnValueOnce(held.promise);
    const stopped = h.controller.stop();
    vi.advanceTimersByTime(10_000);
    await tick();
    expect(await stopped).toBe(false);
    held.resolve(receipt);
    await tick();
    expect(h.controller.blocked).toBe(true);
    h.controller.keepCurrent(h.controller.reviewToken());
    expect(h.controller.blocked).toBe(false);
  });
  it('actual mutation checks old and added light reservations atomically; disjoint work continues', async () => {
    const owner = harness(['light.added'], 'light.other');
    owner.controller.start();
    await frame();
    const mutation = harness(['light.a']);
    expect(mutation.controller.beginMutation(['light.added'])).toBeNull();
    const disjoint = harness(['light.c'], 'light.third');
    disjoint.controller.start();
    await frame();
    expect(disjoint.effects).toHaveLength(1);
    await owner.controller.stop();
    const settle = mutation.controller.beginMutation(['light.added']);
    expect(settle).not.toBeNull();
    owner.controller.start();
    await frame();
    expect(owner.effects).toHaveLength(2);
    settle!();
    settle!(); // The same ownership-bound release is idempotent.
    owner.controller.start();
    await frame();
    expect(owner.effects).toHaveLength(3);
  });
  it('an unresolved membership mutation retains an opaque lease even after losing its owner', async () => {
    const h = harness(),
      settle = h.controller.beginMutation(['light.new']);
    expect(settle).not.toBeNull();
    // Unknown completion deliberately withholds the release capability.
    h.controller.disconnect();
    const next = harness(['light.new'], 'light.other', 'new-principal');
    next.controller.start();
    await frame();
    expect(next.hass.callService).not.toHaveBeenCalled();
    h.controller.start();
    await frame();
    expect(h.hass.callService).not.toHaveBeenCalled();
  });
  it('a touched light remains eligible for restoration after being hidden', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.curves(h.getCurves().map((curve) => ({ ...curve, visible: false })));
    expect(await h.controller.stop()).toBe(true);
    expect(lightValue(h.hass, 'light.a')).toBe(70);
  });
  it.each(['hidden', 'removed'])(
    'receipt-drained queued work rechecks a now %s light',
    async (change) => {
      const h = harness(),
        held = deferred();
      vi.mocked(h.hass.callService).mockImplementationOnce(async (_domain, service, data = {}) => {
        await held.promise;
        h.apply(service, data);
        return receipt;
      });
      h.controller.start();
      await frame();
      h.controller.previewLights(90, true);
      await frame();
      h.curves(
        change === 'removed' ? [] : h.getCurves().map((curve) => ({ ...curve, visible: false }))
      );
      held.resolve(receipt);
      await tick();
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
      expect(h.controller.sessions[0].lights.get('light.a')?.before).toBe(70);
      await h.controller.stop();
      expect(h.hass.callService).toHaveBeenCalledTimes(change === 'hidden' ? 2 : 1);
    }
  );
  it('inactive same-group editor cannot commandeer another owner active Watch', async () => {
    const owner = harness();
    owner.controller.start();
    await frame();
    const other = harness();
    other.controller.connect();
    expect(other.controller.otherWatching).toBe(true);
    expect(other.controller.reviewSessions).toEqual([]);
    expect(other.controller.restoreSelected(other.controller.reviewToken(), ['light.a'])).toBe(
      false
    );
    expect(other.controller.keepCurrent(other.controller.reviewToken())).toBe(false);
    expect(owner.controller.active).toBe(true);
    expect(other.hass.callService).not.toHaveBeenCalled();
    owner.controller.previewLights(90, true);
    await frame();
    expect(owner.effects).toHaveLength(2);
    const third = harness(['light.a'], 'light.third');
    third.controller.start();
    await frame();
    expect(third.hass.callService).not.toHaveBeenCalled();
  });
  it.each(['permission', 'runtime'])(
    'fresh same-principal %s review remains visible but cannot dispose evidence',
    async (kind) => {
      const h = harness();
      h.controller.start();
      await frame();
      h.controller.disconnect();
      const light = h.controller.sessions[0].lights.get('light.a')!;
      if (kind === 'permission') h.hass.user.is_admin = false;
      else h.authorize(false);
      expect(h.controller.sessions).toHaveLength(1);
      expect(h.controller.keepCurrent(h.controller.reviewToken())).toBe(false);
      expect(light.disposition).toBe(false);
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
    }
  );
});
