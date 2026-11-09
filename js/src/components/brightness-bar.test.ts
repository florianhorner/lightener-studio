// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrightnessBar, type LevelInputDetail } from './brightness-bar.js';

type Intent = { type: string; value?: number };

beforeEach(() => {
  document.body.innerHTML = '';
});

async function mount(value = 60) {
  const bar = document.createElement('brightness-bar');
  bar.label = 'Ceiling Light brightness';
  bar.value = value;
  bar.contextKey = 'light.ceiling:50';
  document.body.append(bar);
  await bar.updateComplete;
  const input = bar.renderRoot.querySelector('input')!;
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ width: 300 } as DOMRect);
  const captured = new Set<number>();
  const capture = vi.fn((id: number) => captured.add(id));
  const release = vi.fn((id: number) => {
    captured.delete(id);
    pointer(input, 'lostpointercapture', { id });
  });
  Object.assign(input, {
    setPointerCapture: capture,
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: release,
  });
  const intents: Intent[] = [];
  for (const type of ['level-start', 'level-input', 'level-end', 'bar-focus']) {
    bar.addEventListener(type, (event) => {
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      intents.push({
        type,
        ...(type === 'level-input'
          ? { value: (event as CustomEvent<LevelInputDetail>).detail.value }
          : {}),
      });
    });
  }
  return { bar, input, intents, capture, release };
}

function pointer(
  target: HTMLInputElement,
  type: string,
  { x = 30, y = 20, id = 1, button = 0, primary = true } = {}
): MouseEvent {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    button,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  Object.defineProperties(event, {
    pointerId: { value: id },
    isPrimary: { value: primary },
  });
  target.dispatchEvent(event);
  return event;
}

function key(target: HTMLInputElement, type: string, name: string, repeat = false): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    key: name,
    repeat,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function nativeInput(target: HTMLInputElement, value: number): void {
  target.value = String(value);
  target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

describe('brightness-bar — pointer intent', () => {
  it.each([
    [0.293, -30, 0],
    [99.707, 30, 100],
  ])('edits the exact %s sample to endpoint %s', async (baseline, delta, endpoint) => {
    const { bar, input, intents } = await mount(Math.round(baseline));
    bar.interactionValue = baseline;
    await bar.updateComplete;
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 30 + delta });
    pointer(input, 'pointerup', { x: 30 + delta });
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: endpoint },
      { type: 'level-end' },
    ]);
  });

  it.each([30, 270])('taps at x=%i focus without jumping or creating edits', async (x) => {
    const { bar, input, intents, release } = await mount();
    const down = pointer(input, 'pointerdown', { x });
    expect(down.defaultPrevented).toBe(true);
    expect(bar.shadowRoot?.activeElement).toBe(input);
    expect(intents).toEqual([]);
    expect(input.value).toBe('60');
    pointer(input, 'pointerup', { x });
    pointer(input, 'pointerdown', { x });
    pointer(input, 'pointerup', { x });
    expect(intents).toEqual([{ type: 'bar-focus' }, { type: 'bar-focus' }]);
    expect(bar.value).toBe(60);
    expect(release).toHaveBeenCalledTimes(2);
  });

  it('allows 2 by 1 px jitter without an edit', async () => {
    const { input, intents } = await mount();
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 32, y: 21 });
    pointer(input, 'pointerup', { x: 32, y: 21 });
    expect(intents).toEqual([{ type: 'bar-focus' }]);
  });

  it('abandons vertical scrolling without selecting or claiming an edit', async () => {
    const { input, intents, release } = await mount();
    pointer(input, 'pointerdown');
    const move = pointer(input, 'pointermove', { x: 32, y: 27 });
    expect(move.defaultPrevented).toBe(false);
    pointer(input, 'pointermove', { x: 80, y: 27 });
    pointer(input, 'pointerup', { x: 80, y: 27 });
    expect(intents).toEqual([]);
    expect(release).toHaveBeenCalledOnce();
  });

  it.each([30, 270])(
    'derives a 30 px drag from 60%% to 70%% regardless of press x=%i',
    async (x) => {
      const { bar, input, intents } = await mount();
      pointer(input, 'pointerdown', { x });
      pointer(input, 'pointermove', { x: x + 30 });
      pointer(input, 'pointerup', { x: x + 30 });
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: 70 },
        { type: 'level-end' },
      ]);
      expect(bar.value).toBe(60); // The component never owns the edited model.
    }
  );

  it('requires 6 px horizontal intent and groups many moves into one edit', async () => {
    const { bar, input, intents } = await mount();
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 35 });
    expect(intents).toEqual([]);
    pointer(input, 'pointermove', { x: 36 });
    bar.value = 62;
    await bar.updateComplete;
    pointer(input, 'pointermove', { x: 60 });
    pointer(input, 'pointermove', { x: 60 });
    pointer(input, 'pointerup', { x: 90 });
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 62 },
      { type: 'level-input', value: 70 },
      { type: 'level-input', value: 80 },
      { type: 'level-end' },
    ]);
  });

  it('ignores native absolute touch input without ending its relative pointer gesture', async () => {
    const { bar, input, intents, release } = await mount(25);
    pointer(input, 'pointerdown', { x: 60 });
    nativeInput(input, 20);
    expect(input.value).toBe('25');
    expect(release).not.toHaveBeenCalled();
    expect(intents).toEqual([]);
    pointer(input, 'pointermove', { x: 90 });
    nativeInput(input, 30);
    bar.value = 35;
    await bar.updateComplete;
    pointer(input, 'pointermove', { x: 210 });
    nativeInput(input, 70);
    pointer(input, 'pointerup', { x: 210 });
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 35 },
      { type: 'level-input', value: 75 },
      { type: 'level-end' },
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it('does not begin an edit for a drag clamped to its existing endpoint', async () => {
    const { input, intents } = await mount(100);
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 60 });
    pointer(input, 'pointerup', { x: 60 });
    expect(intents).toEqual([]);
  });

  it('rebases an external value change while a gesture is still pending', async () => {
    const { bar, input, intents } = await mount();
    pointer(input, 'pointerdown');
    bar.value = 40;
    await bar.updateComplete;
    pointer(input, 'pointermove', { x: 60 });
    pointer(input, 'pointerup', { x: 60 });
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 50 },
      { type: 'level-end' },
    ]);
  });

  it('shows an example while a pointer drag uses the authoritative interaction baseline', async () => {
    const { bar, input, intents } = await mount(20);
    bar.interactionValue = 50;
    await bar.updateComplete;
    expect(bar.renderRoot.querySelector<HTMLElement>('.fill')?.style.width).toBe('20%');
    expect(input.value).toBe('20');
    expect(input.getAttribute('aria-valuetext')).toBe('20%');
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 60 });
    pointer(input, 'pointerup', { x: 60 });
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 60 },
      { type: 'level-end' },
    ]);
    expect(bar.value).toBe(20);
    expect(bar.interactionValue).toBe(50);
  });

  it('rebases a pending interaction baseline without adopting a changing example', async () => {
    const { bar, input, intents } = await mount(20);
    bar.interactionValue = 50;
    await bar.updateComplete;
    pointer(input, 'pointerdown');
    bar.value = 10;
    bar.interactionValue = 40;
    await bar.updateComplete;
    pointer(input, 'pointermove', { x: 60 });
    bar.value = 50;
    bar.interactionValue = 50;
    await bar.updateComplete;
    pointer(input, 'pointermove', { x: 90 });
    pointer(input, 'pointerup', { x: 90 });
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 50 },
      { type: 'level-input', value: 60 },
      { type: 'level-end' },
    ]);
  });

  it('ignores non-primary buttons and pointers, and unrelated pointer IDs', async () => {
    const { input, intents, capture } = await mount();
    pointer(input, 'pointerdown', { button: 2 });
    pointer(input, 'pointerdown', { primary: false });
    expect(capture).not.toHaveBeenCalled();
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 60, id: 2 });
    pointer(input, 'pointerup', { id: 2 });
    pointer(input, 'pointercancel', { id: 2 });
    expect(intents).toEqual([]);
    pointer(input, 'pointerup');
    expect(intents).toEqual([{ type: 'bar-focus' }]);
  });

  it('does not start a gesture on an unmeasurable bar', async () => {
    const { input, capture } = await mount();
    vi.mocked(input.getBoundingClientRect).mockReturnValue({ width: 0 } as DOMRect);
    pointer(input, 'pointerdown');
    expect(capture).not.toHaveBeenCalled();
  });
});

describe('brightness-bar — gesture cleanup', () => {
  it.each([
    [29.99, 12],
    [30.01, 13],
  ])(
    'quantizes a fractional near-return at x=%s and restores only the exact origin',
    async (x, quantized) => {
      const { input, intents } = await mount(12.5);
      pointer(input, 'pointerdown');
      pointer(input, 'pointermove', { x: 60 });
      pointer(input, 'pointermove', { x });
      pointer(input, 'pointermove');
      pointer(input, 'pointerup');
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: 23 },
        { type: 'level-input', value: quantized },
        { type: 'level-input', value: 12.5 },
        { type: 'level-end' },
      ]);
    }
  );

  it.each([
    'pointerup',
    'pointercancel',
    'lostpointercapture',
    'blur',
    'window blur',
    'disconnect',
    'context',
  ])('emits the exact fractional origin before %s ends a returned gesture', async (cause) => {
    const { bar, input, intents } = await mount(12.5);
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 60 });
    // pointerup must supply the final sample even without a return move.
    if (cause !== 'pointerup') pointer(input, 'pointermove');
    if (cause.startsWith('pointer') || cause === 'lostpointercapture') pointer(input, cause);
    if (cause === 'blur') input.dispatchEvent(new Event('blur'));
    if (cause === 'window blur') window.dispatchEvent(new Event('blur'));
    if (cause === 'disconnect') bar.remove();
    if (cause === 'context') bar.contextKey = 'replacement';
    await bar.updateComplete;
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 23 },
      { type: 'level-input', value: 12.5 },
      { type: 'level-end' },
    ]);
  });

  it.each([true, false])(
    'finalizes a %s returned pointer gesture before native keyboard input',
    async (returned) => {
      const { input, intents } = await mount(12.5);
      pointer(input, 'pointerdown');
      pointer(input, 'pointermove', { x: 60 });
      if (returned) pointer(input, 'pointermove');
      key(input, 'keydown', 'ArrowRight');
      nativeInput(input, 14);
      key(input, 'keyup', 'ArrowRight');
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: 23 },
        ...(returned ? [{ type: 'level-input', value: 12.5 }] : []),
        { type: 'level-end' },
        { type: 'level-start' },
        { type: 'level-input', value: 14 },
        { type: 'level-end' },
      ]);
    }
  );
  it.each(['pointercancel', 'lostpointercapture'])(
    '%s is harmless before the first edit',
    async (type) => {
      const { input, intents, release } = await mount();
      pointer(input, 'pointerdown');
      pointer(input, type);
      pointer(input, 'pointerup');
      expect(intents).toEqual([]);
      expect(release).toHaveBeenCalledOnce();
    }
  );

  it.each(['pointercancel', 'lostpointercapture'])(
    '%s completes applied edits once despite reentrant capture loss',
    async (type) => {
      const { input, intents, release } = await mount();
      pointer(input, 'pointerdown');
      pointer(input, 'pointermove', { x: 60 });
      pointer(input, type);
      pointer(input, type);
      pointer(input, 'pointerup');
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: 70 },
        { type: 'level-end' },
      ]);
      expect(release).toHaveBeenCalledOnce();
    }
  );

  it.each(['blur', 'window blur', 'disconnect', 'disabled', 'context'])(
    'finishes an applied gesture on %s',
    async (cause) => {
      const { bar, input, intents } = await mount();
      pointer(input, 'pointerdown');
      pointer(input, 'pointermove', { x: 60 });
      if (cause === 'blur') input.dispatchEvent(new Event('blur'));
      if (cause === 'window blur') window.dispatchEvent(new Event('blur'));
      if (cause === 'disconnect') bar.remove();
      if (cause === 'disabled') bar.disabled = true;
      if (cause === 'context') bar.contextKey = 'another-room';
      await bar.updateComplete;
      pointer(input, 'pointermove', { x: 90 });
      pointer(input, 'pointerup', { x: 90 });
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: 70 },
        { type: 'level-end' },
      ]);
    }
  );

  it('does not turn a context replacement during pending input into a selection', async () => {
    const { bar, input, intents } = await mount();
    pointer(input, 'pointerdown');
    bar.contextKey = 'replacement';
    await bar.updateComplete;
    pointer(input, 'pointerup');
    expect(intents).toEqual([]);
  });

  it('checks context changes before the next Lit render', async () => {
    const { bar, input, intents } = await mount();
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 60 });
    bar.contextKey = 'replacement';
    pointer(input, 'pointermove', { x: 90 });
    expect(intents.filter(({ type }) => type === 'level-input')).toHaveLength(1);
    expect(intents.at(-1)).toEqual({ type: 'level-end' });
  });

  it('does not emit input if a start listener disables the control', async () => {
    const { bar, input, intents } = await mount();
    bar.addEventListener('level-start', () => {
      bar.disabled = true;
    });
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 60 });
    expect(intents).toEqual([{ type: 'level-start' }, { type: 'level-end' }]);
  });

  it('completes the edit if the browser has already retired pointer capture', async () => {
    const { input, intents, release } = await mount();
    pointer(input, 'pointerdown');
    pointer(input, 'pointermove', { x: 60 });
    release.mockImplementation(() => {
      throw new DOMException('Inactive pointer', 'NotFoundError');
    });
    pointer(input, 'pointercancel');
    expect(intents.at(-1)).toEqual({ type: 'level-end' });
    expect(intents.filter(({ type }) => type === 'level-end')).toHaveLength(1);
  });

  it('does not capture a pointer if focus handling disables the control', async () => {
    const { bar, input, intents, capture } = await mount();
    input.addEventListener('focus', () => {
      bar.disabled = true;
    });
    pointer(input, 'pointerdown');
    expect(capture).not.toHaveBeenCalled();
    expect(intents).toEqual([]);
  });
});

describe('brightness-bar — native keyboard and accessibility input', () => {
  it.each([
    [0.293, 0, 'Home'],
    [0.293, 0, 'ArrowLeft'],
    [0.293, 0, 'ArrowDown'],
    [0.293, 0, 'PageDown'],
    [99.707, 100, 'End'],
    [99.707, 100, 'ArrowRight'],
    [99.707, 100, 'ArrowUp'],
    [99.707, 100, 'PageUp'],
  ] as const)(
    'commits %s to %s with %s even when the native range cannot step',
    async (baseline, endpoint, name) => {
      const { bar, input, intents } = await mount(endpoint);
      bar.interactionValue = baseline;
      await bar.updateComplete;
      expect(key(input, 'keydown', name).defaultPrevented).toBe(true);
      bar.interactionValue = endpoint;
      await bar.updateComplete;
      key(input, 'keydown', name, true);
      key(input, 'keyup', name);
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: endpoint },
        { type: 'level-end' },
      ]);
    }
  );

  it.each([
    [0.293, 0],
    [99.707, 100],
  ])('accepts an assistive endpoint input from %s to %s', async (baseline, endpoint) => {
    const { bar, input, intents } = await mount(endpoint);
    bar.interactionValue = baseline;
    await bar.updateComplete;
    nativeInput(input, endpoint);
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: endpoint },
      { type: 'level-end' },
    ]);
  });

  it('rebases the first navigation key before native stepping from the real model', async () => {
    const { bar, input, intents } = await mount(20);
    bar.interactionValue = 50;
    await bar.updateComplete;
    expect(input.value).toBe('20');
    expect(key(input, 'keydown', 'ArrowRight').defaultPrevented).toBe(false);
    expect(input.value).toBe('50');
    // jsdom has no native key default; emulate its one-step result.
    nativeInput(input, input.valueAsNumber + 1);
    bar.value = 51;
    bar.interactionValue = 51;
    await bar.updateComplete;
    expect(key(input, 'keydown', 'ArrowRight', true).defaultPrevented).toBe(false);
    nativeInput(input, input.valueAsNumber + 1);
    key(input, 'keyup', 'ArrowRight');
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 51 },
      { type: 'level-input', value: 52 },
      { type: 'level-end' },
    ]);
  });

  it('does not edit when a native key leaves the authoritative baseline unchanged', async () => {
    const { bar, input, intents } = await mount(20);
    bar.interactionValue = 100;
    await bar.updateComplete;
    key(input, 'keydown', 'ArrowRight');
    expect(input.value).toBe('100');
    nativeInput(input, 100);
    key(input, 'keyup', 'ArrowRight');
    expect(input.value).toBe('20');
    expect(intents).toEqual([]);
  });

  it('groups held native range key repeats until keyup', async () => {
    const { bar, input, intents } = await mount();
    for (const value of [61, 62, 63]) {
      expect(key(input, 'keydown', 'ArrowRight', value !== 61).defaultPrevented).toBe(false);
      nativeInput(input, value);
      bar.value = value;
      await bar.updateComplete;
      input.dispatchEvent(new Event('change'));
    }
    expect(intents.filter(({ type }) => type === 'level-start')).toHaveLength(1);
    expect(intents.filter(({ type }) => type === 'level-end')).toHaveLength(0);
    key(input, 'keyup', 'ArrowRight');
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 61 },
      { type: 'level-input', value: 62 },
      { type: 'level-input', value: 63 },
      { type: 'level-end' },
    ]);
  });

  it.each(['Home', 'End', 'PageUp', 'PageDown', 'ArrowLeft', 'ArrowDown', 'ArrowUp'])(
    'preserves native %s adjustment and completes on blur',
    async (name) => {
      const { input, intents } = await mount();
      expect(key(input, 'keydown', name).defaultPrevented).toBe(false);
      nativeInput(input, 40);
      input.dispatchEvent(new Event('blur'));
      key(input, 'keyup', name);
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: 40 },
        { type: 'level-end' },
      ]);
    }
  );

  it('does not begin a keyboard transaction when the value does not change', async () => {
    const { input, intents } = await mount(100);
    key(input, 'keydown', 'ArrowRight');
    nativeInput(input, 100);
    key(input, 'keyup', 'ArrowRight');
    expect(intents).toEqual([]);
  });

  it('does not restart a held keyboard edit after its room context changes', async () => {
    const { bar, input, intents } = await mount();
    key(input, 'keydown', 'ArrowRight');
    nativeInput(input, 61);
    bar.value = 61;
    bar.contextKey = 'new-room-coordinate';
    await bar.updateComplete;
    expect(key(input, 'keydown', 'ArrowRight', true).defaultPrevented).toBe(true);
    key(input, 'keyup', 'ArrowRight');
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 61 },
      { type: 'level-end' },
    ]);
    key(input, 'keydown', 'ArrowRight');
    nativeInput(input, 62);
    key(input, 'keyup', 'ArrowRight');
    expect(intents.filter(({ type }) => type === 'level-start')).toHaveLength(2);
  });

  it.each(['Enter', ' '])('%s selects without editing or repeating selection', async (name) => {
    const { input, intents } = await mount();
    expect(key(input, 'keydown', name).defaultPrevented).toBe(true);
    key(input, 'keydown', name, true);
    key(input, 'keyup', name);
    expect(intents).toEqual([{ type: 'bar-focus' }]);
  });

  it('handles assistive-technology range input as a discrete controlled edit', async () => {
    const { bar, input, intents } = await mount();
    nativeInput(input, 40);
    input.dispatchEvent(new Event('change'));
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 40 },
      { type: 'level-end' },
    ]);
    expect(bar.value).toBe(60);
    expect(input.value).toBe('60');
  });

  it('rejects stale native input once disabled and exposes native disabled state', async () => {
    const { bar, input, intents } = await mount();
    bar.disabled = true;
    nativeInput(input, 80);
    await bar.updateComplete;
    pointer(input, 'pointerdown');
    key(input, 'keydown', 'Enter');
    expect(input.disabled).toBe(true);
    expect(input.value).toBe('60');
    expect(intents).toEqual([]);
  });

  it('keeps native range semantics and accessible names when its visual label is hidden', async () => {
    const { bar, input } = await mount(63.6);
    bar.showLabel = false;
    bar.valueText = '64% at 50% room brightness';
    await bar.updateComplete;
    expect(input.type).toBe('range');
    expect([input.min, input.max, input.step, input.value]).toEqual(['0', '100', '1', '64']);
    expect(input.getAttribute('aria-label')).toBe('Ceiling Light brightness');
    expect(input.getAttribute('aria-valuetext')).toBe('64% at 50% room brightness');
    expect(bar.renderRoot.querySelector('.label')).toBeNull();
    expect(bar.renderRoot.querySelector('.value')?.textContent).toBe('64%');
  });

  it('supports a reserved two-line name slot and owner-provided display values', async () => {
    const { bar } = await mount(0);
    const label = document.createElement('span');
    label.slot = 'label';
    label.innerHTML = 'Ceiling Light<span>light.ceiling</span>';
    bar.append(label);
    bar.displayValue = 'Off';
    await bar.updateComplete;
    const slot = bar.renderRoot.querySelector('slot')!;
    expect(slot.name).toBe('label');
    expect(slot.assignedElements()).toEqual([label]);
    expect(bar.renderRoot.querySelector('.value')?.textContent).toBe('Off');
    expect(bar.renderRoot.querySelector('input')?.getAttribute('aria-valuetext')).toBe('Off');
  });

  it('forwards the full tooltip to the actual pointer surface and removes an empty tooltip', async () => {
    const { bar, input } = await mount();
    expect(input.hasAttribute('title')).toBe(false);
    const tooltip = 'Ceiling Light with a complete descriptive name\nlight.ceiling_light';
    bar.tooltip = tooltip;
    await bar.updateComplete;
    expect(input.title).toBe(tooltip);
    expect(input.getAttribute('aria-label')).toBe('Ceiling Light brightness');
    bar.tooltip = '';
    await bar.updateComplete;
    expect(input.hasAttribute('title')).toBe(false);
  });

  it.each([-10, 110, Number.NaN])('normalizes invalid display extremes %s', async (value) => {
    const { input } = await mount(value);
    expect(input.value).toBe(value > 100 ? '100' : '0');
  });

  it('retains the full-height surface, theme variables, clamped marker and visible focus treatment', () => {
    const css = BrightnessBar.styles.cssText;
    expect(css).toContain('height: 48px');
    expect(css).toContain('border-radius: 8px');
    expect(css).toContain('touch-action: pan-y');
    expect(css).toContain('input:focus-visible');
    expect(css).toContain('--bar-color');
  });
});

describe('brightness-bar — rail appearance', () => {
  it('reflects the rail and emphasis states for owner and stylesheet', async () => {
    const { bar } = await mount();
    expect(bar.getAttribute('appearance')).toBe('bar');
    expect(bar.hasAttribute('emphasis')).toBe(false);
    bar.appearance = 'rail';
    bar.emphasis = true;
    await bar.updateComplete;
    expect(bar.getAttribute('appearance')).toBe('rail');
    expect(bar.hasAttribute('emphasis')).toBe(true);
  });

  it.each([false, true])(
    'keeps relative drags and tap focus on a rail (emphasis %s)',
    async (emphasis) => {
      const { bar, input, intents } = await mount();
      bar.appearance = 'rail';
      bar.emphasis = emphasis;
      await bar.updateComplete;
      // A press far from the thumb focuses without moving the value.
      pointer(input, 'pointerdown', { x: 280 });
      pointer(input, 'pointerup', { x: 280 });
      expect(intents).toEqual([{ type: 'bar-focus' }]);
      expect(input.value).toBe('60');
      // A 30 px drag on the 300 px surface still adds 10.
      intents.length = 0;
      pointer(input, 'pointerdown');
      pointer(input, 'pointermove', { x: 60 });
      pointer(input, 'pointerup', { x: 60 });
      expect(intents).toEqual([
        { type: 'level-start' },
        { type: 'level-input', value: 70 },
        { type: 'level-end' },
      ]);
    }
  );

  it('centers the thumb on the fill end within the inset track', async () => {
    const { bar } = await mount(25);
    bar.appearance = 'rail';
    await bar.updateComplete;
    const root = bar.renderRoot;
    expect(root.querySelector<HTMLElement>('.fill')!.getAttribute('style')).toContain(
      'width: calc((100% - 16px) * 0.25)'
    );
    expect(root.querySelector<HTMLElement>('.marker')!.getAttribute('style')).toContain(
      'left: calc(1px + (100% - 16px) * 0.25)'
    );
  });

  it('takes the light color only under emphasis or keyboard focus', () => {
    const css = BrightnessBar.styles.cssText;
    expect(css).toContain(":host([appearance='rail'][emphasis]) .fill");
    expect(css).toContain(":host([appearance='rail']) .bar:has(input:focus-visible) .fill");
    expect(css).toMatch(
      /:host\(\[appearance='rail'\]\[emphasis\]\) \.fill,\s*:host\(\[appearance='rail'\]\) \.bar:has\(input:focus-visible\) \.fill\s*{\s*background: var\(--bar-color/
    );
    expect(css).toMatch(/:host\(\[appearance='rail'\]\) \.bar\s*{[^}]*height: 44px/);
  });
});

describe('brightness-bar — edge appearance', () => {
  async function mountEdge(value: number, disabled = false) {
    const mounted = await mount(value);
    mounted.bar.appearance = 'edge';
    mounted.bar.disabled = disabled;
    await mounted.bar.updateComplete;
    return mounted;
  }

  function stubResizeObserver() {
    const observers: Array<{ callback: ResizeObserverCallback; observed: Element[] }> = [];
    class FakeResizeObserver {
      observed: Element[] = [];
      constructor(public callback: ResizeObserverCallback) {
        observers.push(this);
      }
      observe(el: Element) {
        this.observed.push(el);
      }
      disconnect() {
        this.observed = [];
      }
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    return observers;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });

  it('moves the value left of the grip only when the measured room on its right runs out', async () => {
    const observers = stubResizeObserver();
    const { bar } = await mountEdge(60);
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([bar]);
    const valueStyle = () =>
      bar.renderRoot.querySelector<HTMLElement>('.value')!.getAttribute('style');
    const measure = async (width: number) => {
      observers[0].callback(
        [{ contentRect: { width } } as ResizeObserverEntry],
        observers[0] as unknown as ResizeObserver
      );
      await bar.updateComplete;
    };
    // 40% of 300px leaves 120px, more than the 60px a "100%" label needs.
    await measure(300);
    expect(valueStyle()).toContain('left: calc(60% + 23px)');
    // 40% of 100px leaves only 40px: the value flips to the grip's left.
    await measure(100);
    expect(valueStyle()).toContain('right: calc(40% + 23px)');
    // One observer for the element's life; disconnect releases it.
    expect(observers).toHaveLength(1);
    bar.remove();
    expect(observers[0].observed).toEqual([]);
  });

  it('continues a press that began on another surface as its own relative drag', async () => {
    const { bar, input, intents, release } = await mountEdge(60);
    const elsewhere = document.createElement('div');
    document.body.append(elsewhere);
    const down = new MouseEvent('pointerdown', {
      clientX: 100,
      clientY: 20,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperties(down, { pointerId: { value: 1 }, isPrimary: { value: true } });
    bar.grab(down as PointerEvent);
    expect(down.defaultPrevented).toBe(true);
    pointer(input, 'pointermove', { x: 130 });
    pointer(input, 'pointerup', { x: 130 });
    expect(intents).toEqual([
      { type: 'level-start' },
      { type: 'level-input', value: 70 },
      { type: 'level-end' },
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it('ignores a grab while disabled', async () => {
    const { bar, input, intents } = await mountEdge(60, true);
    const down = new MouseEvent('pointerdown', { button: 0, bubbles: true, cancelable: true });
    Object.defineProperties(down, { pointerId: { value: 1 }, isPrimary: { value: true } });
    bar.grab(down as PointerEvent);
    pointer(input, 'pointermove', { x: 130 });
    expect(down.defaultPrevented).toBe(false);
    expect(intents).toEqual([]);
  });

  describe('hint', () => {
    function recordAnimations() {
      const calls: Array<{ keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = [];
      const cancel = vi.fn();
      Object.defineProperty(HTMLElement.prototype, 'animate', {
        configurable: true,
        writable: true,
        value: vi.fn((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
          calls.push({ keyframes, options });
          return { cancel } as unknown as Animation;
        }),
      });
      return { calls, cancel };
    }

    it.each([
      [80, -12],
      [50, 12],
      [20, 12],
    ])('nudges the grip at %s%% by %spx, always inward', async (value, step) => {
      const { calls } = recordAnimations();
      const { bar, intents } = await mountEdge(value);
      bar.playHint(250);
      expect(calls).toHaveLength(2);
      expect(calls[0].keyframes[1].transform).toBe(`translate(calc(-50% + ${step}px), -50%)`);
      expect(calls.every((call) => call.options.delay === 250)).toBe(true);
      // Presentation only: no value, no events.
      expect(bar.value).toBe(value);
      expect(intents).toEqual([]);
    });

    it.each([
      ['a bar that is not an edge', async () => (await mount(60)).bar],
      ['a disabled edge', async () => (await mountEdge(60, true)).bar],
    ])('plays nothing on %s', async (_label, make) => {
      const { calls } = recordAnimations();
      const bar = await make();
      bar.playHint();
      expect(calls).toHaveLength(0);
    });

    it('stops both animations when reduced motion turns on during the hint', async () => {
      const { cancel } = recordAnimations();
      const listeners = new Set<() => void>();
      const media = {
        matches: false,
        addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
      };
      const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: () => media,
      });
      try {
        const { bar } = await mountEdge(60);
        bar.playHint(660);
        expect(listeners.size).toBe(1);
        media.matches = true;
        for (const fn of [...listeners]) fn();
        expect(cancel).toHaveBeenCalledTimes(2);
        expect(listeners.size).toBe(0);
      } finally {
        if (original) Object.defineProperty(window, 'matchMedia', original);
        else delete (window as { matchMedia?: unknown }).matchMedia;
      }
    });

    it('plays nothing where the Web Animations API is missing', async () => {
      const { bar } = await mountEdge(60);
      expect(() => bar.playHint()).not.toThrow();
    });

    it.each([
      ['pointerdown', (input: HTMLInputElement) => pointer(input, 'pointerdown')],
      ['keydown', (input: HTMLInputElement) => key(input, 'keydown', 'ArrowRight')],
      ['cancelHint', (_input: HTMLInputElement, bar?: BrightnessBar) => bar!.cancelHint()],
      ['disconnect', (_input: HTMLInputElement, bar?: BrightnessBar) => bar!.remove()],
    ])('cancels both animations on %s, and a replay cancels the earlier hint', async (_n, act) => {
      const { cancel } = recordAnimations();
      const { bar, input } = await mountEdge(60);
      bar.playHint();
      bar.playHint();
      expect(cancel).toHaveBeenCalledTimes(2); // the first hint, cancelled by the replay
      cancel.mockClear();
      act(input, bar);
      expect(cancel).toHaveBeenCalledTimes(2);
    });
  });
});
