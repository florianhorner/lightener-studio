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
  return { entityId, friendlyName: entityId, controlPoints: points, color: '#fff' };
}

type MockHass = Hass & { callService: ReturnType<typeof vi.fn> };

function makeHass(
  states: Hass['states'] = Object.fromEntries(
    ['a', 'b'].map((id) => [`light.${id}`, { state: 'on', attributes: { brightness: 120 } }])
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

it('does not restore a light that Watch never touched', async () => {
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
  it('start() pushes brightness to every curve on the first frame', async () => {
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

  it('lazily snapshots a light added mid-preview so stop() restores it', async () => {
    // Absent at start() -> skipped by the initial snapshot. Adding it + scrub
    // drives it; stop() must still restore its true pre-preview brightness,
    // not leave it stuck at the preview value.
    const hass = makeHass({
      'light.a': { state: 'on', attributes: { brightness: 200 } },
      'light.b': { state: 'on', attributes: { brightness: 40 } },
    });
    const host = makeHost(hass, [makeCurve('light.a')]);
    const ctrl = newController(host);
    ctrl.start(); // snapshots light.a only (light.b not yet a member)
    await flushRaf();

    // Add light.b, then an all-lights refresh drives it to a preview value.
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

describe('silent restoration and reservations', () => {
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
    let authorized = true,
      barrier = false;
    host.canDispatch = () => authorized;
    host.restoreBlocked = () => barrier;
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
      barrier: (value: boolean) => {
        barrier = value;
      },
      curves: (value: LightCurve[]) => {
        host.curves = value;
      },
      getCurves: () => host.curves,
    };
  }
  beforeEach(() => vi.useFakeTimers());

  it.each(['off', 'on', 17] as const)('puts a light back to %s when Watch ends', async (before) => {
    const h = harness();
    h.hass.states['light.a'] =
      before === 'off'
        ? { state: 'off', attributes: {} }
        : { state: 'on', attributes: typeof before === 'number' ? { brightness: before } : {} };
    h.controller.start();
    await frame();
    expect(h.controller.blocked).toBe(true);
    expect(await h.controller.stop()).toBe(true);
    expect(lightValue(h.hass, 'light.a')).toBe(before);
    expect(h.controller.blocked).toBe(false);
    expect(h.controller.sessions).toEqual([]);
  });
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
  it('quick on→off with HA state arriving after the reply does not block Watch', async () => {
    const h = harness(),
      later: Array<() => void> = [];
    h.hass.callService.mockImplementation(async (_domain, service, data = {}) => {
      later.push(() => h.apply(service, data));
      return receipt;
    });
    h.controller.start();
    await frame();
    const stopped = h.controller.stop();
    expect(await stopped).toBe(true);
    for (const apply of later.splice(0)) apply();
    h.controller.observe();
    expect(h.controller.blocked).toBe(false);
    expect(h.effects.map((effect) => effect.data.brightness)).toEqual([128, 70]);
    h.controller.start();
    expect(h.controller.active).toBe(true);
  });
  it('an on/off-only light is switched back without blocking Watch', async () => {
    const h = harness();
    h.hass.states['light.a'] = { state: 'on', attributes: {} };
    h.hass.callService.mockImplementation(async (_domain, service, data = {}) => {
      h.effects.push({ service, data });
      return receipt;
    });
    h.controller.start();
    await frame();
    expect(await h.controller.stop()).toBe(true);
    expect(h.effects.at(-1)).toEqual({
      service: 'turn_on',
      data: { entity_id: 'light.a', transition: 0.25 },
    });
    expect(h.controller.blocked).toBe(false);
  });
  it('waits for a preview in flight, then restores once', async () => {
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
    const stopped = h.controller.stop();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.controller.blocked).toBe(true);
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
  it.each(['rejected', 'silent'])(
    'a %s command releases the lock and Watch can start again',
    async (kind) => {
      const h = harness();
      h.controller.start();
      await frame();
      if (kind === 'rejected')
        vi.mocked(h.hass.callService).mockRejectedValueOnce({
          code: 'unknown_error',
          message: 'x',
        });
      else vi.mocked(h.hass.callService).mockReturnValueOnce(new Promise(() => {}));
      const stopped = h.controller.stop();
      if (kind === 'silent') {
        await tick();
        expect(h.controller.blocked).toBe(true);
        vi.advanceTimersByTime(10_000);
      }
      expect(await stopped).toBe(true);
      expect(h.controller.blocked).toBe(false);
      h.controller.start();
      expect(h.controller.active).toBe(true);
    }
  );
  it.each(['connection', 'permission', 'principal', 'barrier'])(
    '%s loss ends Watch without sending anything more',
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
      expect(h.controller.blocked).toBe(false);
    }
  );
  it('leaving the editor still puts the lights back', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.controller.disconnect();
    await tick();
    expect(lightValue(h.hass, 'light.a')).toBe(70);
  });
  it('disconnect without restore sends nothing and leaves nothing blocked', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.controller.disconnect(false);
    await tick();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.controller.blocked).toBe(false);
  });
  it('null hass stop sends nothing and leaves nothing blocked', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.setHass(null);
    await h.controller.stop();
    h.setHass(h.hass);
    h.controller.connect();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.controller.blocked).toBe(false);
  });
  it('atomic reservation blocks overlapping groups but disjoint groups continue', async () => {
    const owner = harness();
    owner.controller.start();
    await frame();
    const overlap = harness(['light.b', 'light.a'], 'light.other');
    overlap.controller.start();
    await frame();
    expect(overlap.hass.callService).not.toHaveBeenCalled();
    expect(overlap.controller.admissionIssue).not.toBeNull();
    const disjoint = harness(['light.c'], 'light.third');
    disjoint.controller.start();
    await frame();
    expect(disjoint.hass.callService).toHaveBeenCalledTimes(1);
    await owner.controller.stop();
    overlap.controller.start();
    await frame();
    expect(overlap.hass.callService).toHaveBeenCalledTimes(2);
  });
  it('a second editor on the same group sees the other Watch and cannot start', async () => {
    const owner = harness();
    owner.controller.start();
    await frame();
    const other = new PreviewController(
      {
        ...makeHost(owner.hass, owner.getCurves()),
        getStorageEntityId: () => 'light.group',
        canDispatch: () => true,
      },
      300,
      registry
    );
    expect(other.otherWatching).toBe(true);
    other.start();
    expect(other.active).toBe(false);
    await owner.controller.stop();
    expect(other.blocked).toBe(false);
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
  it('membership changes wait for Watch and block it while they run', async () => {
    const owner = harness(['light.added'], 'light.other');
    owner.controller.start();
    await frame();
    const mutation = harness(['light.a']);
    expect(mutation.controller.beginMutation(['light.added'])).toBeNull();
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
  it('a touched light is put back after leaving the light list', async () => {
    const h = harness();
    h.controller.start();
    await frame();
    h.curves([]);
    expect(await h.controller.stop()).toBe(true);
    expect(lightValue(h.hass, 'light.a')).toBe(70);
  });
  it('queued work for a light that left the list is dropped, and the light is still put back', async () => {
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
    h.curves([]);
    held.resolve(receipt);
    await tick();
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    await h.controller.stop();
    expect(lightValue(h.hass, 'light.a')).toBe(70);
  });
  describe('async boundaries', () => {
    function withConnection(h: ReturnType<typeof harness>) {
      const listeners = new Set<() => void>();
      const connection = {
        connected: true,
        addEventListener: (_type: 'disconnected', fn: () => void) => listeners.add(fn),
        removeEventListener: (_type: 'disconnected', fn: () => void) => listeners.delete(fn),
      };
      h.hass.connection = connection;
      return {
        listeners,
        lose: () => {
          connection.connected = false;
          for (const fn of [...listeners]) fn();
        },
      };
    }
    /** Start Watch with the first preview command held, then call stop(). */
    async function stoppedWithHeldPreview(h: ReturnType<typeof harness>) {
      const held = deferred();
      vi.mocked(h.hass.callService).mockImplementationOnce(async (_domain, service, data = {}) => {
        await held.promise;
        h.apply(service, data);
        return receipt;
      });
      h.controller.start();
      await frame();
      const stopped = h.controller.stop();
      await tick();
      return { held, stopped };
    }

    it('restores after the held preview with the live hass, once', async () => {
      const h = harness();
      const { held, stopped } = await stoppedWithHeldPreview(h);
      const fresh = makeHass(h.hass.states);
      fresh.user.id = 'user';
      fresh.connected = true;
      fresh.callService.mockImplementation(async (_domain, service, data = {}) => {
        h.apply(service, data);
        return receipt;
      });
      h.setHass(fresh);
      held.resolve(receipt);
      await tick();
      expect(await stopped).toBe(true);
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
      expect(fresh.callService).toHaveBeenCalledTimes(1);
      expect(h.effects.map((e) => e.data.brightness)).toEqual([128, 70]);
      expect(h.controller.beginMutation(['light.added'])).not.toBeNull();
    });
    it.each([
      'event',
      'flag',
      'permission',
      'principal',
      'no hass',
      'disconnect(false)',
      'new connection',
    ])('a %s change while the restore waits sends no restore and frees the lock', async (kind) => {
      const h = harness();
      const link = withConnection(h);
      const { held, stopped } = await stoppedWithHeldPreview(h);
      expect(h.controller.blocked).toBe(true);
      if (kind === 'event') link.lose();
      if (kind === 'flag') h.hass.connected = false;
      if (kind === 'permission') h.hass.user.is_admin = false;
      if (kind === 'principal') h.hass.user.id = 'other-user';
      if (kind === 'no hass') h.setHass(null);
      if (kind === 'disconnect(false)') h.controller.disconnect(false);
      if (kind === 'new connection')
        h.hass.connection = { ...h.hass.connection!, connected: true } as Hass['connection'];
      held.resolve(receipt);
      await tick();
      expect(await stopped).toBe(true);
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
      expect(h.effects.map((e) => e.data.brightness)).toEqual([128]);
      h.setHass(h.hass);
      expect(h.controller.blocked).toBe(false);
      h.hass.connected = true;
      h.hass.user.is_admin = true;
      h.hass.user.id = 'user';
      (h.hass.connection as { connected: boolean }).connected = true;
      expect(h.controller.beginMutation(['light.added'])).not.toBeNull();
    });
    it('a scheduled frame that finds the editor unauthorized sends no restore', async () => {
      const h = harness();
      h.controller.start();
      await frame();
      h.controller.previewLights(90, true);
      h.authorize(false);
      await frame();
      await tick();
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
      expect(h.controller.active).toBe(false);
      expect(h.controller.blocked).toBe(false);
    });
    it('connection loss with a command in flight still tells the editor when the lock frees', async () => {
      const h = harness(),
        held = deferred(),
        changed = vi.fn();
      withConnection(h);
      (h.controller as unknown as { _host: PreviewControllerHost })._host.restorationChanged =
        changed;
      vi.mocked(h.hass.callService).mockReturnValueOnce(held.promise);
      h.controller.connect();
      h.controller.start();
      await frame();
      const link = h.hass.connection as unknown as { connected: boolean };
      link.connected = false;
      h.controller.observe();
      h.controller.observe();
      changed.mockClear();
      expect(h.controller.blocked).toBe(true);
      held.resolve(receipt);
      await tick();
      expect(h.controller.blocked).toBe(false);
      expect(changed).toHaveBeenCalled();
    });
    it('a hung preview times out at 10 s, then the restore goes out once', async () => {
      const h = harness();
      vi.mocked(h.hass.callService).mockReturnValueOnce(new Promise(() => {}));
      h.controller.start();
      await frame();
      const stopped = h.controller.stop();
      vi.advanceTimersByTime(9_999);
      await tick();
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
      expect(h.controller.blocked).toBe(true);
      vi.advanceTimersByTime(1);
      await tick();
      expect(h.hass.callService).toHaveBeenCalledTimes(2);
      expect(await stopped).toBe(true);
      expect(h.effects.map((e) => e.data.brightness)).toEqual([70]);
    });
    it('a late reply from an earlier session cannot touch a newer one', async () => {
      const h = harness(),
        held = deferred();
      vi.mocked(h.hass.callService).mockImplementationOnce(() => held.promise);
      h.controller.start();
      await frame();
      const stopped = h.controller.stop();
      vi.advanceTimersByTime(10_000);
      await tick();
      expect(await stopped).toBe(true);
      h.controller.start();
      await frame();
      const calls = vi.mocked(h.hass.callService).mock.calls.length;
      held.resolve(receipt);
      await tick();
      expect(vi.mocked(h.hass.callService).mock.calls.length).toBe(calls);
      expect(h.controller.active).toBe(true);
      expect(h.controller.blocked).toBe(true);
      expect(await h.controller.stop()).toBe(true);
    });
    it('repeated stop and disconnect restore each touched light once', async () => {
      const h = harness();
      const { held, stopped } = await stoppedWithHeldPreview(h);
      const again = h.controller.stop();
      h.controller.disconnect();
      h.controller.disconnect();
      held.resolve(receipt);
      await tick();
      expect(await stopped).toBe(true);
      expect(await again).toBe(false);
      expect(h.effects.map((e) => e.data.brightness)).toEqual([128, 70]);
    });
    const restoring = (controller: PreviewController) =>
      (controller as unknown as { _restoring: Set<unknown> })._restoring;
    it('repeated Watch cycles keep no finished restores', async () => {
      const h = harness();
      for (let i = 0; i < 3; i++) {
        h.controller.start();
        await frame();
        expect(await h.controller.stop()).toBe(true);
      }
      expect(h.effects.map((e) => e.data.brightness)).toEqual([128, 70, 128, 70, 128, 70]);
      expect(restoring(h.controller).size).toBe(0);
    });
    it('a restore that finishes after leaving the editor is released on return', async () => {
      const h = harness();
      h.controller.start();
      await frame();
      h.controller.disconnect();
      await tick();
      expect(lightValue(h.hass, 'light.a')).toBe(70);
      h.controller.connect();
      expect(restoring(h.controller).size).toBe(0);
    });
    it('a runtime barrier raised while a restore waits sends nothing', async () => {
      const h = harness();
      const { held, stopped } = await stoppedWithHeldPreview(h);
      h.barrier(true);
      held.resolve(receipt);
      await tick();
      expect(await stopped).toBe(true);
      expect(h.effects.map((e) => e.data.brightness)).toEqual([128]);
    });
    it('a runtime barrier up when Watch stops sends no restore', async () => {
      const h = harness();
      h.controller.start();
      await frame();
      h.barrier(true);
      expect(await h.controller.stop()).toBe(true);
      expect(h.effects.map((e) => e.data.brightness)).toEqual([128]);
    });
    it.each(['group switch', 'remount', 'detached update'])(
      'a %s with a command in flight still restores',
      async (kind) => {
        const h = harness();
        withConnection(h);
        h.controller.connect();
        const held = deferred();
        vi.mocked(h.hass.callService).mockImplementationOnce(
          async (_domain, service, data = {}) => {
            await held.promise;
            h.apply(service, data);
            return receipt;
          }
        );
        h.controller.start();
        await frame();
        h.controller.disconnect();
        if (kind === 'group switch')
          (h.controller as unknown as { _host: TestHost })._host.storageEntityId = 'light.other';
        if (kind === 'detached update') h.controller.observe();
        else h.controller.connect();
        held.resolve(receipt);
        await tick();
        expect(h.effects.map((e) => e.data.brightness)).toEqual([128, 70]);
        expect(h.controller.blocked).toBe(false);
      }
    );
    it.each(['throws', 'rejects'])('a restore that %s still frees the lock', async (kind) => {
      const h = harness();
      h.controller.start();
      await frame();
      if (kind === 'throws')
        vi.mocked(h.hass.callService).mockImplementationOnce(() => {
          throw new Error('boom');
        });
      else vi.mocked(h.hass.callService).mockRejectedValueOnce(new Error('boom'));
      expect(await h.controller.stop()).toBe(true);
      expect(h.controller.beginMutation(['light.added'])).not.toBeNull();
    });
  });
});
