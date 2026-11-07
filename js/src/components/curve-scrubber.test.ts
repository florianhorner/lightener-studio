// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurveScrubber } from './curve-scrubber.js';
import type { BrightnessBar, LevelInputDetail } from './brightness-bar.js';

await import('./curve-scrubber.js');

beforeEach(() => {
  document.body.replaceChildren();
});

function makeScrubber(
  opts: Partial<
    Pick<
      CurveScrubber,
      'readOnly' | 'canPreview' | 'previewActive' | 'curves' | 'position' | 'contextKey'
    >
  > = {}
): CurveScrubber {
  const el = document.createElement('curve-scrubber');
  Object.assign(el, opts);
  document.body.appendChild(el);
  return el;
}

async function getBar(el: CurveScrubber): Promise<BrightnessBar> {
  await el.updateComplete;
  const bar = el.renderRoot.querySelector('brightness-bar')!;
  await bar.updateComplete;
  return bar;
}

function level(
  bar: BrightnessBar,
  type: 'level-start' | 'level-input' | 'level-end',
  value = 50
): void {
  bar.dispatchEvent(
    new CustomEvent<LevelInputDetail>(type, {
      detail: { value },
      bubbles: true,
      composed: true,
    })
  );
}

// Pointer intent and native keyboard behavior belong to brightness-bar.test.ts.
// These tests protect the room component's controlled properties and event boundary.
describe('curve-scrubber — shared bar presentation', () => {
  it('draws Room brightness as an edge grip, named only for assistive technology', async () => {
    const el = makeScrubber({ position: 37 });
    const bar = await getBar(el);
    expect(el.renderRoot.querySelectorAll('brightness-bar')).toHaveLength(1);
    expect(bar.appearance).toBe('edge');
    expect(bar.showLabel).toBe(false);
    expect(bar.renderRoot.querySelector('.label')).toBeNull();
    const input = bar.renderRoot.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Room brightness');
    expect(input.getAttribute('title')).toBe('Room brightness');
    expect(bar.renderRoot.querySelector<HTMLElement>('.marker')!.style.left).toBe('37%');
    expect(bar.renderRoot.querySelector('.value')?.textContent?.trim()).toBe('37%');
    expect(el.renderRoot.querySelector('.scrubber-helper')).toBeNull();
    expect(el.renderRoot.querySelector('.scrubber-header')).toBeNull();
  });

  it('keeps the value beside the grip, on its left near the right end', async () => {
    const low = await getBar(makeScrubber({ position: 20 }));
    expect(low.renderRoot.querySelector<HTMLElement>('.value')!.style.left).toBe(
      'calc(20% + 23px)'
    );
    const high = await getBar(makeScrubber({ position: 90 }));
    expect(high.renderRoot.querySelector<HTMLElement>('.value')!.style.right).toBe(
      'calc(10% + 23px)'
    );
  });

  it('gives the grip the warm Watch colour only while Watch is on', async () => {
    const el = makeScrubber();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.scrubber-panel')!.classList.contains('watching')).toBe(
      false
    );
    el.previewActive = true;
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.scrubber-panel')!.classList.contains('watching')).toBe(
      true
    );
  });

  it('exposes native range min/max/value and room-coordinate wording', async () => {
    const el = makeScrubber({ position: 37, contextKey: 'light.group:loaded' });
    const bar = await getBar(el);
    const input = bar.renderRoot.querySelector('input')!;
    expect(input.type).toBe('range');
    expect(input.min).toBe('0');
    expect(input.max).toBe('100');
    expect(input.value).toBe('37');
    expect(input.getAttribute('aria-label')).toBe('Room brightness');
    expect(input.getAttribute('aria-valuetext')).toBe('37%');
    expect(bar.contextKey).toBe('light.group:loaded');
  });

  it.each([
    [null, 50],
    [-10, 0],
    [110, 100],
    [32.6, 32.6],
  ] as const)('presents controlled room position %s as %s', async (position, expected) => {
    const bar = await getBar(makeScrubber({ position }));
    expect(bar.value).toBe(expected);
    expect(bar.renderRoot.querySelector('input')?.value).toBe(String(Math.round(expected)));
    expect((bar.renderRoot.querySelector('.marker') as HTMLElement).style.left).toBe(
      `${expected}%`
    );
    // Zero reads as Off while the position itself stays numeric.
    expect(bar.renderRoot.querySelector('.value')?.textContent?.trim()).toBe(
      expected === 0 ? 'Off' : `${Math.round(expected)}%`
    );
  });

  it('does not add per-light badge elements to the room control', async () => {
    const el = makeScrubber();
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.badge')).toBeNull();
    expect(el.renderRoot.querySelector('.value-badges')).toBeNull();
  });
});

describe('curve-scrubber — preview toggle', () => {
  it('hides preview button when canPreview=false', async () => {
    const el = makeScrubber({ canPreview: false });
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.preview-toggle-btn')).toBeNull();
  });

  it('shows "Watch room react" button when canPreview=true and not active', async () => {
    const el = makeScrubber({ canPreview: true, previewActive: false });
    await el.updateComplete;
    const btn = el.renderRoot.querySelector('.preview-toggle-btn');
    expect(btn).not.toBeNull();
    expect(btn?.textContent?.trim()).toBe('Watch room react');
    expect(btn?.classList.contains('active')).toBe(false);
    expect(btn?.getAttribute('role')).toBe('switch');
    expect(btn?.getAttribute('aria-checked')).toBe('false');
  });

  it('keeps one switch label and latches it on while previewActive=true', async () => {
    const el = makeScrubber({ canPreview: true, previewActive: true });
    await el.updateComplete;
    const btn = el.renderRoot.querySelector('.preview-toggle-btn');
    expect(btn?.classList.contains('active')).toBe(true);
    expect(btn?.getAttribute('role')).toBe('switch');
    expect(btn?.getAttribute('aria-checked')).toBe('true');
    expect(btn?.hasAttribute('aria-pressed')).toBe(false);
    expect(btn?.textContent?.trim()).toBe('Watch room react');
    expect(btn?.querySelector('.preview-track .preview-knob')).not.toBeNull();
  });

  describe('meaning line', () => {
    const curve = (entityId: string, controlPoints: Array<[number, number]>, visible = true) => ({
      entityId,
      friendlyName: entityId,
      color: '#2563eb',
      visible,
      controlPoints: controlPoints.map(([lightener, target]) => ({ lightener, target })),
    });
    const curves = [
      curve('light.a', [
        [0, 0],
        [100, 100],
      ]),
      // Late: off through 40% room brightness.
      curve('light.b', [
        [0, 0],
        [40, 0],
        [100, 100],
      ]),
      // Hidden lights are still lights in the room.
      curve(
        'light.c',
        [
          [0, 0],
          [100, 100],
        ],
        false
      ),
    ];
    const text = async (opts: Parameters<typeof makeScrubber>[0]) => {
      const el = makeScrubber(opts);
      await el.updateComplete;
      return el.renderRoot.querySelector('.meaning-line')?.textContent?.trim() ?? null;
    };

    it('counts every member light that is on at the Room position', async () => {
      expect(await text({ curves, position: 100 })).toBe('All 3 lights on');
      expect(await text({ curves, position: 30 })).toBe('2 of 3 lights on');
      expect(await text({ curves, position: 0 })).toBe('All lights off');
      expect(await text({ curves: curves.slice(0, 1), position: 50 })).toBe('1 light on');
      expect(await text({ curves: curves.slice(0, 1), position: 0 })).toBe('Light off');
      expect(await text({ curves: [], position: 50 })).toBeNull();
    });

    it('says the room follows while Watch is on', async () => {
      expect(await text({ curves, position: 30, previewActive: true, canPreview: true })).toBe(
        'Your room follows · 2 of 3 lights on'
      );
    });
  });

  it('ignores a retained preview button when preview permission is revoked', async () => {
    const el = makeScrubber({ canPreview: true });
    await el.updateComplete;
    const button = el.renderRoot.querySelector<HTMLButtonElement>('.preview-toggle-btn')!;
    const toggle = vi.fn();
    el.addEventListener('preview-toggle', toggle);
    el.canPreview = false;
    button.click();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('dispatches preview-toggle event when button clicked (inactive state)', async () => {
    const el = makeScrubber({ canPreview: true, previewActive: false });
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('preview-toggle', spy);
    const btn = el.renderRoot.querySelector<HTMLButtonElement>('.preview-toggle-btn')!;
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('dispatches preview-toggle event when the switch is turned off (active state)', async () => {
    const el = makeScrubber({ canPreview: true, previewActive: true });
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('preview-toggle', spy);
    const btn = el.renderRoot.querySelector<HTMLButtonElement>('.preview-toggle-btn')!;
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('curve-scrubber — shared bar event boundary', () => {
  it('remaps typed start/input/end once, in order, across its shadow boundary', async () => {
    const el = makeScrubber({ position: 40 });
    const bar = await getBar(el);
    const events: Event[] = [];
    for (const type of ['scrubber-start', 'scrubber-move', 'scrubber-end']) {
      el.addEventListener(type, (event) => events.push(event));
    }
    level(bar, 'level-start');
    level(bar, 'level-input', 65);
    level(bar, 'level-end');
    expect(events.map((event) => event.type)).toEqual([
      'scrubber-start',
      'scrubber-move',
      'scrubber-end',
    ]);
    expect((events[1] as CustomEvent<{ position: number }>).detail).toEqual({ position: 65 });
    expect(events.every((event) => event.bubbles && event.composed)).toBe(true);
    expect(el.position).toBe(40);
  });

  it('updates the range only when the parent accepts a remapped room position', async () => {
    const el = makeScrubber({ position: 40 });
    const bar = await getBar(el);
    el.addEventListener('scrubber-move', (event) => {
      el.position = (event as CustomEvent<{ position: number }>).detail.position;
    });
    level(bar, 'level-input', 73);
    await getBar(el);
    expect(el.position).toBe(73);
    expect(bar.renderRoot.querySelector('input')!.value).toBe('73');
  });

  it.each([
    [-5, 0],
    [150, 100],
  ])('clamps child value %s to room position %s', async (value, expected) => {
    const el = makeScrubber();
    const bar = await getBar(el);
    const move = vi.fn();
    el.addEventListener('scrubber-move', move);
    level(bar, 'level-input', value);
    expect(move).toHaveBeenCalledOnce();
    expect(move.mock.calls[0][0].detail).toEqual({ position: expected });
  });

  it.each([NaN, Infinity, -Infinity])('ignores non-finite child input %s', async (value) => {
    const el = makeScrubber();
    const bar = await getBar(el);
    const move = vi.fn();
    el.addEventListener('scrubber-move', move);
    level(bar, 'level-input', value);
    expect(move).not.toHaveBeenCalled();
  });

  it('does not turn focus-only bar activation into a room change or edit lifecycle', async () => {
    const el = makeScrubber({ position: 40 });
    const bar = await getBar(el);
    const intent = vi.fn();
    for (const type of ['scrubber-start', 'scrubber-move', 'scrubber-end'])
      el.addEventListener(type, intent);
    bar.dispatchEvent(new CustomEvent('bar-focus', { bubbles: true, composed: true }));
    expect(intent).not.toHaveBeenCalled();
    expect(el.position).toBe(40);
  });
});

describe('curve-scrubber — read-only boundary', () => {
  it('disables the actual native range', async () => {
    const bar = await getBar(makeScrubber({ readOnly: true }));
    expect(bar.disabled).toBe(true);
    expect(bar.renderRoot.querySelector('input')!.disabled).toBe(true);
  });

  it('lets an already-started gesture end after permission is revoked', async () => {
    const el = makeScrubber({ position: 40 });
    const bar = await getBar(el);
    const end = vi.fn();
    el.addEventListener('scrubber-end', end);
    level(bar, 'level-start');
    el.readOnly = true;
    level(bar, 'level-end');
    expect(end).toHaveBeenCalledOnce();
    expect(el.position).toBe(40);
  });

  it.each(['level-start', 'level-input'] as const)(
    'ignores stale %s after permission is revoked',
    async (type) => {
      const el = makeScrubber({ position: 40 });
      const bar = await getBar(el);
      // Revoke at the parent before the child's next render can disable input.
      el.readOnly = true;
      const intent = vi.fn();
      for (const eventType of ['scrubber-start', 'scrubber-move', 'scrubber-end'])
        el.addEventListener(eventType, intent);
      level(bar, type, 80);
      expect(intent).not.toHaveBeenCalled();
      expect(el.position).toBe(40);
    }
  );
});
