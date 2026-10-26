// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FirstUseInvitation,
  INVITATION_CUE_PAUSE_MS,
  hasDefaultShapes,
  hasInvitationProgress,
  recordInvitationProgress,
} from './first-use-invitation.js';
import { FIRST_USE_TIMING } from './motion.js';
import type { LightCurve } from './types.js';

const curve: LightCurve = {
  entityId: 'light.test',
  friendlyName: 'Test Light',
  color: '#42a5f5',
  visible: true,
  controlPoints: [
    { lightener: 0, target: 0 },
    { lightener: 1, target: 1 },
    { lightener: 100, target: 100 },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('first-use presentation ownership', () => {
  it('adds a grab-ready middle point without changing the original configuration', () => {
    const original = structuredClone(curve);
    const invitation = new FirstUseInvitation(() => {});
    invitation.start(curve, false);
    expect(invitation.curve?.controlPoints.find((p) => p.lightener === 50)?.target).toBe(20);
    expect(curve).toEqual(original);
    invitation.clear();
    expect(invitation.curve).toBeNull();
  });

  it('uses production stagger timing and freezes canonical points with no trailing frame', () => {
    vi.useFakeTimers();
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((fn) => {
        callback = fn;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const invitation = new FirstUseInvitation(() => {});
    invitation.start(curve, true);
    expect(invitation.curve?.controlPoints.map((p) => p.lightener)).toEqual([0, 1, 25, 50, 100]);
    vi.advanceTimersByTime(INVITATION_CUE_PAUSE_MS);
    callback(performance.now() + 560);
    const shown = structuredClone(invitation.curve);
    expect(shown?.controlPoints.every((p) => Number.isInteger(p.target))).toBe(true);
    invitation.freeze();
    callback(performance.now() + 400);
    expect(invitation.curve).toEqual(shown);
    expect(invitation.moving).toBe(false);
    expect(invitation.cueAnimating).toBe(false);
    invitation.clear();
  });

  it('slows the invitation by ten percent and holds the settled circle context', () => {
    vi.useFakeTimers();
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((fn) => {
        callback = fn;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const invitation = new FirstUseInvitation(() => {});
    invitation.start(curve, true);
    expect(invitation.showInstruction).toBe(true);
    expect(invitation.moving).toBe(false);
    vi.advanceTimersByTime(INVITATION_CUE_PAUSE_MS - 1);
    expect(invitation.curve?.controlPoints[3].target).toBe(50);
    expect(invitation.moving).toBe(false);
    vi.advanceTimersByTime(1);
    const start = performance.now();
    callback(start + 380);
    expect(invitation.moving).toBe(true);
    expect(invitation.curve?.controlPoints[3].target).toBeGreaterThan(20);
    callback(start + 1672);
    expect(invitation.moving).toBe(false);
    expect(invitation.curve?.controlPoints[3].target).toBe(20);
    expect(invitation.cueAnimating).toBe(true);
    vi.advanceTimersByTime(FIRST_USE_TIMING.context - 1);
    expect(invitation.showInstruction).toBe(true);
    vi.advanceTimersByTime(1);
    expect(invitation.showInstruction).toBe(false);
    expect(invitation.cueAnimating).toBe(false);
    expect(invitation.curve).not.toBeNull();
    invitation.clear();
  });

  it('shows the selected example preset before any curve movement and retains it on arrival', () => {
    vi.useFakeTimers();
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((fn) => {
        callback = fn;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const invitation = new FirstUseInvitation(() => {});
    invitation.start(curve, true);
    vi.advanceTimersByTime(1099);
    expect(invitation.presetHighlighted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(invitation.presetHighlighted).toBe(true);
    expect(invitation.moving).toBe(false);
    expect(invitation.curve?.controlPoints[3].target).toBe(50);
    vi.advanceTimersByTime(439);
    expect(invitation.moving).toBe(false);
    vi.advanceTimersByTime(1);
    expect(invitation.moving).toBe(true);
    callback(performance.now() + 1672);
    vi.advanceTimersByTime(5500);
    expect(invitation.presetHighlighted).toBe(true);
    expect(invitation.showInstruction).toBe(false);
    invitation.clear();
    expect(invitation.presetHighlighted).toBe(false);
  });

  it.each(['freeze', 'clear'] as const)(
    'cancels the cue pause on %s with no late motion',
    (action) => {
      vi.useFakeTimers();
      const frame = vi.fn();
      vi.stubGlobal('requestAnimationFrame', frame);
      const invitation = new FirstUseInvitation(() => {});
      invitation.start(curve, true);
      vi.advanceTimersByTime(400);
      invitation[action]();
      vi.advanceTimersByTime(INVITATION_CUE_PAUSE_MS + 2000);
      expect(frame).not.toHaveBeenCalled();
      expect(invitation.presetHighlighted).toBe(false);
      expect(invitation.moving).toBe(false);
      expect(invitation.curve?.controlPoints[3].target ?? null).toBe(
        action === 'freeze' ? 50 : null
      );
      invitation.clear();
    }
  );

  it('fades only wording after the context hold, retaining the same static handles', () => {
    vi.useFakeTimers();
    const invitation = new FirstUseInvitation(() => {});
    invitation.start(curve, false);
    const points = invitation.curve?.controlPoints;
    vi.advanceTimersByTime(6000);
    expect(invitation.showInstruction).toBe(false);
    expect(invitation.curve?.controlPoints).toBe(points);
    invitation.clear();
  });

  it('admits only default groups and retains page progress when storage is blocked', () => {
    expect(hasDefaultShapes([curve])).toBe(true);
    expect(hasDefaultShapes([])).toBe(false);
    expect(
      hasDefaultShapes([
        {
          ...curve,
          controlPoints: [
            { lightener: 1, target: 1 },
            { lightener: 100, target: 45 },
          ],
        },
      ])
    ).toBe(false);
    const key = 'light.blocked_progress';
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    recordInvitationProgress(key, 'completed');
    expect(hasInvitationProgress(key)).toBe(true);
    spy.mockRestore();
  });
});

it('replay on another light rejects old animation callbacks without changing either saved curve', () => {
  vi.useFakeTimers();
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const other = { ...structuredClone(curve), entityId: 'light.other', friendlyName: 'Other light' };
  const before = structuredClone([curve, other]),
    invitation = new FirstUseInvitation(() => {});
  invitation.start(curve, true);
  vi.advanceTimersByTime(INVITATION_CUE_PAUSE_MS);
  const stale = frames[0];
  invitation.clear();
  invitation.start(other, false);
  const shown = structuredClone(invitation.curve);
  stale(performance.now() + 1000);
  expect(invitation.curve).toEqual(shown);
  expect([curve, other]).toEqual(before);
  invitation.clear();
  vi.advanceTimersByTime(6000);
  expect(invitation.curve).toBeNull();
});
