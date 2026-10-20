// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachController, type CoachControllerHost } from './coach-controller.js';
import type { PresetDef } from './presets.js';

let visibility: DocumentVisibilityState;
let reducedMotion: boolean;
const controllers: CoachController[] = [];

function setup(firstRun = false, ready = true) {
  const host = {
    isReady: vi.fn(() => ready),
    setTrial: vi.fn<(preset: PresetDef) => void>(),
    clearTrial: vi.fn<() => void>(),
    requestUpdate: vi.fn<() => void>(),
  } satisfies CoachControllerHost;
  const coach = new CoachController(host);
  controllers.push(coach);
  const target = document.createElement('div');
  const add = vi.spyOn(target, 'addEventListener');
  coach.configure(firstRun, true);
  coach.connect(target);
  return { coach, host, target, add };
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = 'visible';
  reducedMotion = false;
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
});

afterEach(() => {
  for (const coach of controllers.splice(0)) coach.disconnect();
  delete (document as unknown as { visibilityState?: unknown }).visibilityState;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('coaching phases', () => {
  it('opens ordinary tips from current edits and requests updates only for phase changes', () => {
    const { coach, host } = setup();
    expect(coach.phase).toBe('inactive');
    expect(host.requestUpdate).not.toHaveBeenCalled();
    coach.afterEdit();
    coach.afterClean();
    coach.afterSave();
    expect(coach.phase).toBe('inactive');
    coach.toggle(false);
    expect(coach.phase).toBe('choose_shape');
    coach.afterSave();
    expect(coach.phase).toBe('choose_shape');
    coach.afterEdit();
    expect(coach.phase).toBe('ready_to_save');
    coach.afterEdit();
    coach.afterClean();
    expect(coach.phase).toBe('choose_shape');
    coach.afterEdit();
    coach.afterSave();
    expect(coach.phase).toBe('complete');
    coach.afterClean();
    expect(coach.phase).toBe('complete');
    coach.afterEdit();
    expect(coach.phase).toBe('ready_to_save');
    coach.toggle(true);
    expect(coach.phase).toBe('inactive');
    coach.toggle(true);
    expect(coach.phase).toBe('ready_to_save');
    expect(host.requestUpdate).toHaveBeenCalledTimes(8);
    coach.maybeStartShimmer();
    expect(host.setTrial).not.toHaveBeenCalled();
  });

  it('enters first-run guidance on a same-entity transition only when inactive', () => {
    const { coach, host } = setup();
    coach.configure(true, false);
    expect(coach.phase).toBe('choose_shape');
    expect(host.setTrial).toHaveBeenCalledTimes(1);
    coach.dismiss();
    coach.configure(true, false);
    expect(coach.phase).toBe('inactive');
    coach.configure(false, false);
    coach.toggle(true);
    coach.configure(true, false);
    expect(coach.phase).toBe('ready_to_save');
  });

  it('resets phase and one-shot animation only on entity changes', () => {
    const { coach, host } = setup(true);
    coach.maybeStartShimmer();
    coach.afterEdit();
    coach.afterSave();
    coach.configure(true, false);
    expect(coach.phase).toBe('complete');
    coach.configure(true, true);
    expect(coach.phase).toBe('choose_shape');
    expect(host.setTrial).toHaveBeenCalledTimes(1);
    coach.maybeStartShimmer();
    expect(host.setTrial).toHaveBeenCalledTimes(2);
    coach.configure(false, true);
    expect(coach.phase).toBe('inactive');
    vi.runAllTimers();
    expect(host.setTrial).toHaveBeenCalledTimes(2);
  });
});

describe('first-run shimmer', () => {
  it('shows the three existing presets for 1350ms each, clears, and never replays', () => {
    const { coach, host } = setup(true);
    coach.maybeStartShimmer();
    expect(host.setTrial.mock.calls.map(([preset]) => preset.id)).toEqual(['dim_accent']);
    vi.advanceTimersByTime(1349);
    expect(host.setTrial).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(host.setTrial.mock.lastCall?.[0].id).toBe('late_starter');
    vi.advanceTimersByTime(1350);
    expect(host.setTrial.mock.lastCall?.[0].id).toBe('early_starter');
    vi.advanceTimersByTime(1350);
    expect(host.clearTrial).toHaveBeenCalledTimes(1);
    coach.maybeStartShimmer();
    expect(host.setTrial).toHaveBeenCalledTimes(3);
    expect(coach.phase).toBe('choose_shape');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['not ready', 'hidden', 'reduced motion'])('waits while %s', (condition) => {
    const { coach, host } = setup(true, condition !== 'not ready');
    if (condition === 'hidden') visibility = 'hidden';
    if (condition === 'reduced motion') reducedMotion = true;
    coach.maybeStartShimmer();
    expect(host.setTrial).not.toHaveBeenCalled();
    host.isReady.mockReturnValue(true);
    visibility = 'visible';
    reducedMotion = false;
    coach.maybeStartShimmer();
    expect(host.setTrial).toHaveBeenCalledTimes(1);
  });

  it('starts on returning from a hidden initial tab but stops permanently after it has played', () => {
    visibility = 'hidden';
    const { coach, host } = setup(true);
    coach.maybeStartShimmer();
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(host.setTrial).toHaveBeenCalledTimes(1);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(host.clearTrial).toHaveBeenCalledTimes(1);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.runAllTimers();
    expect(host.setTrial).toHaveBeenCalledTimes(1);
    expect(coach.phase).toBe('choose_shape');
  });

  it.each(['pointerdown', 'keydown', 'focusin'])(
    'only trusted %s consumes the animation',
    (type) => {
      const { coach, host, target, add } = setup(true);
      target.dispatchEvent(new Event(type));
      coach.maybeStartShimmer();
      expect(host.setTrial).toHaveBeenCalledTimes(1);
      // Synthetic DOM events cannot be trusted; exercise the registered callback
      // with the browser-supplied flag rather than reaching into controller state.
      const listener = add.mock.calls.find(([name]) => name === type)![1] as EventListener;
      listener({ isTrusted: true } as Event);
      expect(host.clearTrial).toHaveBeenCalledTimes(1);
      vi.runAllTimers();
      coach.maybeStartShimmer();
      expect(host.setTrial).toHaveBeenCalledTimes(1);
      expect(coach.phase).toBe('choose_shape');
    }
  );

  it('an interruption before readiness consumes animation without clearing a manual trial', () => {
    const { coach, host } = setup(true, false);
    coach.interrupt();
    host.isReady.mockReturnValue(true);
    coach.maybeStartShimmer();
    coach.stopShimmer();
    expect(host.setTrial).not.toHaveBeenCalled();
    expect(host.clearTrial).not.toHaveBeenCalled();
  });

  it.each(['stopShimmer', 'dismiss', 'afterEdit'] as const)(
    '%s cancels active animation without delayed trial writes',
    (action) => {
      const { coach, host } = setup(true);
      coach.maybeStartShimmer();
      coach[action]();
      expect(host.clearTrial).toHaveBeenCalledTimes(1);
      vi.runAllTimers();
      coach.maybeStartShimmer();
      expect(host.setTrial).toHaveBeenCalledTimes(1);
    }
  );
});

describe('connection lifecycle', () => {
  it('connects once and detaches every listener without changing phase or replaying', () => {
    const { coach, host, target, add } = setup(true);
    const remove = vi.spyOn(target, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    coach.connect(target);
    expect(add).toHaveBeenCalledTimes(3);
    coach.maybeStartShimmer();
    coach.disconnect();
    coach.disconnect();
    expect(coach.phase).toBe('choose_shape');
    for (const type of ['pointerdown', 'keydown', 'focusin']) {
      expect(remove).toHaveBeenCalledWith(type, expect.any(Function), true);
    }
    expect(remove).toHaveBeenCalledTimes(3);
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    document.dispatchEvent(new Event('visibilitychange'));
    coach.maybeStartShimmer();
    vi.runAllTimers();
    expect(host.setTrial).toHaveBeenCalledTimes(1);
    expect(host.clearTrial).toHaveBeenCalledTimes(1);
    coach.connect(target);
    coach.maybeStartShimmer();
    expect(host.setTrial).toHaveBeenCalledTimes(1);
  });

  it('a deferred post-load callback cannot start animation after disconnect', () => {
    const { coach, host } = setup(true, false);
    coach.disconnect();
    host.isReady.mockReturnValue(true);
    coach.maybeStartShimmer();
    expect(host.setTrial).not.toHaveBeenCalled();
    coach.connect(document.createElement('div'));
    coach.maybeStartShimmer();
    expect(host.setTrial).toHaveBeenCalledTimes(1);
  });
});
