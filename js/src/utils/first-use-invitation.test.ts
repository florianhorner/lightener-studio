// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FirstUseInvitation,
  INVITATION_TIMELINE as T,
  hasDefaultShapes,
  hasInvitationProgress,
  recordInvitationProgress,
} from './first-use-invitation.js';
import { CURVE_PRESETS } from './presets.js';
import { drawnShape, rippleFrame, rippleSpan, DRAW_IN_POP_MS } from './motion.js';
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
const dim = CURVE_PRESETS.find((preset) => preset.id === 'dim_accent')!;

/** Drive production RAF callbacks at exact elapsed times without wall-clock waits. */
function playback(animate = true, initial: LightCurve = curve, room: number | null = 100) {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const changed = vi.fn();
  const invitation = new FirstUseInvitation(changed);
  invitation.start(initial, animate, room);
  return {
    invitation,
    changed,
    frames,
    at: (elapsed: number) => frames.at(-1)!(elapsed),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('first-use presentation ownership', () => {
  it('hands the card only frames that change the picture', () => {
    const { invitation: i, changed, at } = playback();
    const heldStart = T.presetHighlight - 300;
    at(heldStart);
    const calls = changed.mock.calls.length;
    const shown = i.curve;
    at(heldStart + 100);
    at(heldStart + 200);
    expect(changed).toHaveBeenCalledTimes(calls);
    expect(i.curve).toBe(shown);
    at(T.pointGrab + 100);
    at(T.pointGrab + 200);
    expect(changed).toHaveBeenCalledTimes(calls + 2);
  });

  it.each([
    { time: T.point, phase: 'point', message: 'lightBrighter' },
    { time: T.pointUp, phase: 'point', message: 'lightDimmer' },
    { time: T.room, phase: 'room', message: 'roomDimmer' },
    { time: T.roomHigh, phase: 'room', message: 'roomRestore' },
    { time: T.add, phase: 'add', message: 'add' },
    { time: T.remove, phase: 'remove', message: 'remove' },
    { time: T.restoreCue, phase: 'remove', message: 'restore' },
    { time: T.complete, phase: 'complete', message: 'complete' },
  ])(
    'delivers the $message transition, then deduplicates its held frames',
    ({ time, phase, message }) => {
      const { invitation, changed, at } = playback(false);
      at(time - 1);
      const calls = changed.mock.calls.length;
      at(time);
      expect(changed).toHaveBeenCalledTimes(calls + 1);
      expect(invitation.phase).toBe(phase);
      expect(invitation.message).toBe(message);
      const shown = invitation.curve;
      at(time + 16);
      at(time + 32);
      expect(changed).toHaveBeenCalledTimes(calls + 1);
      expect(invitation.curve).toBe(shown);
      invitation.clear();
    }
  );

  it('shows the original shape and preset cue before applying a real preset', () => {
    const original = structuredClone(curve);
    const { invitation: i, at } = playback();
    expect(i.phase).toBe('preset');
    expect(i.curve).toEqual(original);
    expect(i.curve).not.toBe(curve);
    expect(i.presetHighlighted).toBe(false);
    at(T.presetHighlight);
    expect(i.presetHighlighted).toBe(true);
    expect(i.curve?.controlPoints).toEqual(original.controlPoints);
    expect(i.cue).toMatchObject({ lightener: 50 });
    expect(i.curveFrame).toBeNull();
    at(T.presetApply);
    expect(i.curve?.controlPoints).toEqual(dim.controlPoints);
    expect(i.cue).toMatchObject({ lightener: 50 });
    expect(i.curveFrame).not.toBeNull();
    expect(curve).toEqual(original);
    i.clear();
  });

  it('moves only the existing middle handle vertically and returns it exactly', () => {
    const { invitation: i, at } = playback();
    for (const elapsed of [T.point, T.pointGrab + 200, T.pointUp, T.pointDown, T.pointReturn]) {
      at(elapsed);
      expect(i.phase).toBe('point');
      expect(i.curve?.controlPoints.map((point) => point.lightener)).toEqual([0, 1, 25, 50, 100]);
      expect(i.curve?.controlPoints.filter((point) => point.lightener !== 50)).toEqual(
        dim.controlPoints.filter((point) => point.lightener !== 50)
      );
      expect(i.curve?.controlPoints.every((point) => Number.isInteger(point.target))).toBe(true);
    }
    expect(i.curve?.controlPoints).toEqual(dim.controlPoints);
    expect(i.cue?.pressed).toBe(false);
    i.clear();
  });

  it('holds distinct above and below positions with no synthetic sibling motion', () => {
    const { invitation: i, at } = playback();
    at(T.pointUp);
    expect(i.cue).toMatchObject({ lightener: 50, target: 55, pressed: true });
    at(T.pointUp + 350);
    expect(i.cue?.target).toBe(55);
    at(T.pointDown);
    expect(i.cue?.target).toBe(5);
    at(T.pointDown + 350);
    expect(i.cue?.target).toBe(5);
    i.clear();
  });

  it.each([
    { selected: curve, labelAbove: true },
    { selected: { ...curve, controlPoints: dim.controlPoints }, labelAbove: false },
  ])(
    'keeps the point caption on one side throughout its travel ($labelAbove)',
    ({ selected, labelAbove }) => {
      const { invitation: i, at } = playback(true, selected);
      for (const elapsed of [T.point, T.pointGrab + 200, T.pointUp, T.pointDown, T.pointReturn]) {
        at(elapsed);
        expect(i.cue?.labelAbove).toBe(labelAbove);
      }
      i.clear();
    }
  );

  it.each([null, 0, 42, 100])('sweeps only the temporary Room value and restores %s', (room) => {
    const { invitation: i, at } = playback(true, curve, room);
    at(T.room);
    expect(i.roomPosition).toBe(room ?? 100);
    at(T.roomLow);
    const firstEnd = (room ?? 100) <= 50 ? 100 : 0;
    expect(i.roomPosition).toBe(firstEnd);
    expect(i.curve?.controlPoints).toEqual(dim.controlPoints);
    expect(i.cue).toMatchObject({ lightener: firstEnd, target: 8 });
    at(T.roomHigh);
    expect(i.roomPosition).toBe(100 - firstEnd);
    at(T.roomReturn);
    expect(i.roomPosition).toBe(room ?? 100);
    at(T.add);
    expect(i.roomPosition).toBeNull();
    at(T.complete);
    expect(i.roomPosition).toBeNull();
    expect(i.curve).toEqual(curve);
    expect(i.phase).toBe('complete');
    expect(i.cue).toBeNull();
    i.clear();
  });

  it('shows two press cues before inserting, then removes only that new point', () => {
    const { invitation: i, at } = playback();
    at(T.addFirstPress);
    expect(i.cue?.pressed).toBe(true);
    expect(i.curve?.controlPoints).toEqual(dim.controlPoints);
    at(T.addFirstPress + 180);
    expect(i.cue?.pressed).toBe(false);
    at(T.addSecondPress);
    expect(i.cue?.pressed).toBe(true);
    at(T.addInsert);
    expect(i.curve?.controlPoints).toHaveLength(dim.controlPoints.length + 1);
    expect(i.curve?.controlPoints.find((point) => point.lightener === 75)).toEqual({
      lightener: 75,
      target: 30,
    });
    at(T.removePress);
    expect(i.phase).toBe('remove');
    expect(i.cue).toMatchObject({ lightener: 75, target: 30, pressed: true });
    at(T.removeDelete);
    expect(i.curve?.controlPoints).toEqual(dim.controlPoints);
    expect(i.cue).toMatchObject({ lightener: 75, pressed: false, markerOpacity: 0 });
    at(T.complete);
    expect(i.curve).toEqual(curve);
    expect(i.presetHighlighted).toBe(false);
    i.clear();
  });

  it('chooses Early when the selected light already has Dim', () => {
    const selected = { ...curve, controlPoints: dim.controlPoints.map((point) => ({ ...point })) };
    const original = structuredClone(selected);
    const { invitation: i, at } = playback(true, selected);
    expect(i.presetId).toBe('early_starter');
    at(T.presetApply);
    expect(i.curve?.controlPoints).toEqual(
      CURVE_PRESETS.find((preset) => preset.id === 'early_starter')!.controlPoints
    );
    at(T.pointUp);
    expect(i.cue?.target).toBe(98);
    at(T.pointDown);
    expect(i.cue?.target).toBe(60);
    at(T.complete);
    expect(i.curve).toEqual(original);
    expect(selected).toEqual(original);
    i.clear();
  });

  it.each(['freeze', 'clear'] as const)('rejects late callbacks after %s', (action) => {
    const { invitation: i, at, frames, changed } = playback();
    at(T.roomLow + 400);
    i[action]();
    const shown = structuredClone(i.curve);
    const room = i.roomPosition;
    const phase = i.phase;
    const count = changed.mock.calls.length;
    frames[0](T.complete);
    expect(i.curve).toEqual(shown);
    expect(i.roomPosition).toBe(room);
    expect(i.phase).toBe(phase);
    expect(changed).toHaveBeenCalledTimes(count);
    if (action === 'freeze') expect(i.cue?.pressed).toBe(false);
    else expect(i.cue).toBeNull();
    expect(i.frozen).toBe(action === 'freeze');
    i.clear();
  });

  it('replays for another light without accepting callbacks from an older run', () => {
    const { invitation: i, at, frames } = playback();
    at(T.pointUp);
    const stale = frames[0];
    const other = { ...structuredClone(curve), entityId: 'light.other' };
    i.start(other, false);
    stale(T.complete);
    expect(i.curve).toEqual(other);
    expect(i.phase).toBe('preset');
    expect(i.frozen).toBe(false);
    at(T.presetApply);
    expect(i.curve?.entityId).toBe(other.entityId);
    at(T.complete);
    expect(i.curve).toEqual(other);
    i.clear();
  });

  it.each([false, true])(
    'uses held discrete frames when animation is disabled or reduced (%s)',
    (reduced) => {
      vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
      const { invitation: i, at } = playback(reduced);
      at(T.pointGrab + 500);
      expect(i.cue?.target).toBe(30);
      at(T.pointUp);
      expect(i.cue?.target).toBe(55);
      at(T.pointDown - 100);
      expect(i.cue?.target).toBe(55);
      at(T.pointDown);
      expect(i.cue?.target).toBe(5);
      at(T.roomLow - 100);
      expect(i.roomPosition).toBe(100);
      at(T.roomLow);
      expect(i.roomPosition).toBe(0);
      at(T.complete);
      expect(i.curve).toEqual(curve);
      i.clear();
    }
  );

  it('demonstrates Enter on the existing handle and deletes the actual inserted midpoint', () => {
    const selected = { ...curve, controlPoints: dim.controlPoints };
    const { invitation: i, at } = playback();
    i.start(selected, true, 100, 'keyboard');
    at(T.addFirstPress);
    expect(i.cue?.lightener).toBe(50);
    expect(i.cue?.target).toBe(85);
    at(T.addInsert);
    expect(i.curve?.controlPoints.find((point) => point.lightener === 58)).toEqual({
      lightener: 58,
      target: 89,
    });
    expect(i.cue?.lightener).toBe(58);
    at(T.removePress);
    expect(i.cue?.lightener).toBe(58);
    at(T.removeDelete);
    expect(i.curve?.controlPoints.some((point) => point.lightener === 58)).toBe(false);
    i.clear();
  });

  it('freezes immediately when reduced motion becomes enabled mid-playback', () => {
    let reduced = false;
    vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
    const { invitation: i, at } = playback();
    at(T.pointUp);
    const shown = structuredClone(i.curve);
    reduced = true;
    at(T.pointDown);
    expect(i.frozen).toBe(true);
    expect(i.curve).toEqual(shown);
    expect(i.cue?.pressed).toBe(false);
    at(T.complete);
    expect(i.curve).toEqual(shown);
    i.clear();
  });

  it('recognizes saved Dim shapes with an implicit origin and restores their exact point list', () => {
    const selected = {
      ...curve,
      controlPoints: dim.controlPoints.filter((point) => point.lightener !== 0),
    };
    const original = structuredClone(selected);
    const { invitation: i, at } = playback(true, selected);
    expect(i.presetId).toBe('early_starter');
    at(T.presetApply);
    expect(i.curve?.controlPoints).toEqual(
      CURVE_PRESETS.find((preset) => preset.id === 'early_starter')!.controlPoints
    );
    at(T.complete);
    expect(i.curve).toEqual(original);
    expect(selected).toEqual(original);
    i.clear();
  });

  it('uses native ripple geometry without putting its union of points into the editable curve', () => {
    const selected = {
      ...curve,
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 1, target: 1 },
        { lightener: 37, target: 62 },
        { lightener: 100, target: 100 },
      ],
    };
    const { invitation: i, at } = playback(true, selected);
    at(T.presetApply + 121);
    const expected = rippleFrame(
      rippleSpan(drawnShape(selected.controlPoints), drawnShape(dim.controlPoints)),
      121
    );
    expect(i.curveFrame?.pieces).toEqual(expected.pieces);
    expect(i.curve?.controlPoints).toEqual(dim.controlPoints);
    expect(i.curveFrame?.knots?.map((point) => point.lightener)).toEqual([0, 1, 25, 50, 100]);
    expect(i.curveFrame?.knots?.some((point) => point.lightener === 37)).toBe(false);
    at(T.restore + 121);
    expect(i.curve?.controlPoints).toEqual(selected.controlPoints);
    expect(i.curveFrame?.knots?.map((point) => point.lightener)).toEqual([0, 1, 37, 100]);
    at(T.complete);
    expect(i.curveFrame).toBeNull();
    expect(i.curve).toEqual(selected);
    i.clear();
  });

  it('moves the visual point continuously while retaining canonical integer edit data', () => {
    const { invitation: i, at } = playback();
    at(T.pointGrab + 217);
    const target = i.curveFrame?.knots?.find((point) => point.lightener === 50)?.target;
    expect(target).toBeDefined();
    expect(Number.isInteger(target)).toBe(false);
    expect(i.curve?.controlPoints.find((point) => point.lightener === 50)?.target).toBe(
      Math.round(target!)
    );
    expect(i.cue?.target).toBe(target);
    expect(i.curveFrame?.knots?.filter((point) => point.lightener !== 50)).toEqual(
      dim.controlPoints.filter((point) => point.lightener !== 50)
    );
    at(T.pointDown + 417);
    expect(i.message).toBe('lightBrighter');
    i.clear();
  });

  it('keeps Room projection fractional through its whole display contract', () => {
    const { invitation: i, at } = playback(true, curve, 42);
    at(T.roomGrab + 217);
    expect(i.roomPosition).toBeGreaterThan(42);
    expect(Number.isInteger(i.roomPosition)).toBe(false);
    expect(i.cue?.lightener).toBe(i.roomPosition);
    expect(i.curve?.controlPoints).toEqual(dim.controlPoints);
    at(T.roomReturn);
    expect(i.roomPosition).toBe(42);
    i.clear();
  });

  it.each([T.presetApply + 137, T.pointGrab + 217, T.addInsert + 57, T.restore + 137])(
    'materializes only visible destination handles on interruption at %s and rejects stale frames',
    (elapsed) => {
      const { invitation: i, at, frames, changed } = playback();
      at(elapsed);
      const visible = i.curveFrame?.knots?.map((point) => ({
        ...point,
        target: Math.round(point.target),
      }));
      const xs = i.curve?.controlPoints.map((point) => point.lightener);
      expect(visible).toBeDefined();
      i.freeze();
      expect(i.curve?.controlPoints).toEqual(visible);
      expect(i.curve?.controlPoints.map((point) => point.lightener)).toEqual(xs);
      expect(i.curveFrame).toBeNull();
      const count = changed.mock.calls.length;
      frames[0](T.complete);
      expect(i.curve?.controlPoints).toEqual(visible);
      expect(changed).toHaveBeenCalledTimes(count);
      i.clear();
    }
  );

  it('fades the real added marker without inserting or retaining a ghost point', () => {
    const { invitation: i, at } = playback();
    at(T.addInsert);
    expect(i.cue?.markerOpacity).toBe(0);
    expect(i.curve?.controlPoints.some((point) => point.lightener === 75)).toBe(true);
    at(T.addInsert + DRAW_IN_POP_MS);
    expect(i.cue?.markerOpacity).toBe(1);
    at(T.removeDelete - 90);
    expect(i.cue?.markerOpacity).toBeGreaterThan(0);
    expect(i.cue?.markerOpacity).toBeLessThan(1);
    expect(i.curve?.controlPoints.some((point) => point.lightener === 75)).toBe(true);
    at(T.removeDelete);
    expect(i.curve?.controlPoints.some((point) => point.lightener === 75)).toBe(false);
    i.clear();
  });

  it('never supplies interpolated curve frames under reduced motion, including preset and restoration', () => {
    const { invitation: i, at } = playback(false);
    for (const elapsed of [
      T.presetApply + 137,
      T.pointGrab + 217,
      T.addInsert + 57,
      T.restore + 137,
    ]) {
      at(elapsed);
      expect(i.curveFrame).toBeNull();
    }
    i.clear();
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
