// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CurveLegend } from './curve-legend.js';
import { CurveLegend as CurveLegendClass } from './curve-legend.js';
import type { LightCurve } from '../utils/types.js';
import { LEGEND_SHAPES, sampleCurveAt } from '../utils/graph-math.js';

beforeAll(async () => {
  await import('./curve-legend.js');
});

function makeLegend(opts?: {
  curves?: LightCurve[];
  selectedCurveId?: string | null;
  scrubberPosition?: number | null;
}): CurveLegend {
  const el = document.createElement('curve-legend') as CurveLegend;
  el.curves = opts?.curves ?? [
    {
      entityId: 'light.a',
      friendlyName: 'Alpha',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: '#2563eb',
    },
    {
      entityId: 'light.b',
      friendlyName: 'Beta',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 80 },
      ],
      visible: false,
      color: '#ef5350',
    },
  ];
  el.selectedCurveId = opts?.selectedCurveId ?? null;
  el.scrubberPosition = opts?.scrubberPosition ?? null;
  document.body.appendChild(el);
  return el;
}

describe('curve-legend', () => {
  it('renders the "Lights" section label', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const label = el.renderRoot.querySelector('.legend-label');
    expect(label?.textContent?.trim()).toBe('Lights');
  });

  it('summarizes visible and hidden lights without adding helper copy', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const count = el.renderRoot.querySelector('.legend-count');
    // 1 visible + 1 hidden: the count names the VISIBLE split, not the total.
    expect(count?.textContent?.trim()).toBe('1 light · 1 hidden');
  });

  it('marks large groups with a bounded density mode', async () => {
    const curves: LightCurve[] = Array.from({ length: 20 }, (_, idx) => ({
      entityId: `light.zone_${idx + 1}`,
      friendlyName: `Zone ${idx + 1}`,
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: '#2563eb',
    }));
    const el = makeLegend({ curves });
    await el.updateComplete;
    const panel = el.renderRoot.querySelector('.legend-panel');
    const count = el.renderRoot.querySelector('.legend-count');
    expect(panel?.getAttribute('data-density')).toBe('large');
    expect(count?.textContent?.trim()).toBe('20 lights showing');
    expect(CurveLegendClass.styles.cssText).toContain('.legend-panel.large-group');
    expect(CurveLegendClass.styles.cssText).toContain(
      '--curve-legend-max-height: min(52vh, 520px)'
    );
  });

  it('renders one legend-item per curve', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const items = el.renderRoot.querySelectorAll('.legend-item');
    expect(items.length).toBe(2);
  });

  it('renders an empty list when curves is empty', async () => {
    const el = makeLegend({ curves: [] });
    await el.updateComplete;
    const items = el.renderRoot.querySelectorAll('.legend-item');
    expect(items.length).toBe(0);
    const label = el.renderRoot.querySelector('.legend-label');
    expect(label).not.toBeNull();
  });

  it('applies "hidden" class to invisible curves only', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const items = el.renderRoot.querySelectorAll('.legend-item');
    expect(items[0]!.classList.contains('hidden')).toBe(false);
    expect(items[1]!.classList.contains('hidden')).toBe(true);
  });

  it('applies "selected" class only to the selected curve', async () => {
    const el = makeLegend({ selectedCurveId: 'light.b' });
    await el.updateComplete;
    const items = el.renderRoot.querySelectorAll('.legend-item');
    expect(items[0]!.classList.contains('selected')).toBe(false);
    expect(items[1]!.classList.contains('selected')).toBe(true);
  });

  it('shows the stop-editing affordance on the selected curve', async () => {
    const el = makeLegend({ selectedCurveId: 'light.a' });
    await el.updateComplete;
    const selected = el.renderRoot.querySelector<HTMLElement>('.legend-item.selected')!;
    expect(selected.querySelector('.editing-chip')).toBeNull();
    expect(selected.querySelector('.clear-edit-icon')?.getAttribute('aria-label')).toBe(
      'Clear selection for Alpha'
    );
  });

  it('uses non-overlapping mobile action button hitboxes', () => {
    const cssText = CurveLegendClass.styles.cssText;
    expect(cssText).toContain('@media (max-width: 500px)');
    expect(cssText).toContain('.clear-edit-icon');
    // Mobile action buttons render at exactly 44x44 with border-box sizing so
    // padding does not balloon the row height beyond the tap-target minimum.
    expect(cssText).toContain('width: 44px;');
    expect(cssText).toContain('height: 44px;');
    expect(cssText).toContain('box-sizing: border-box;');
    expect(cssText).not.toContain('margin: -12px;');
  });

  it('uses at least 44px desktop action button hitboxes', () => {
    const cssText = CurveLegendClass.styles.cssText;
    for (const selector of ['.eye-btn', '.clear-edit-icon']) {
      const rule = cssText.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*\\}`));
      expect(rule, `${selector} rule must exist`).not.toBeNull();
      expect(rule![0]).toMatch(/width:\s*16px/);
      expect(rule![0]).toMatch(/height:\s*16px/);
      expect(rule![0]).toMatch(/padding:\s*14px/);
      expect(rule![0]).toMatch(/box-sizing:\s*content-box/);
    }
  });

  it('reserves raw ID space while keeping it quiet by default', () => {
    const cssText = CurveLegendClass.styles.cssText;
    expect(cssText).toContain(
      '.legend-item:not(.selected):not(:hover):not(:focus-within) .entity-id'
    );
    expect(cssText).toContain('height: 14px;');
    expect(cssText).toContain('line-height: 14px;');
    expect(cssText).toContain('opacity: 0;');
  });

  it('exposes list semantics with row-select buttons and sibling action controls', async () => {
    const el = makeLegend({ selectedCurveId: 'light.a' });
    await el.updateComplete;
    const legend = el.renderRoot.querySelector('.legend')!;
    expect(legend.getAttribute('role')).toBe('list');
    expect(legend.getAttribute('aria-label')).toBe('2 lights in this group');

    const items = el.renderRoot.querySelectorAll('.legend-item');
    expect(items.length).toBe(2);
    items.forEach((item) => {
      expect(item.getAttribute('role')).toBe('listitem');
      expect(item.getAttribute('tabindex')).toBeNull();
      expect(item.getAttribute('aria-selected')).toBeNull();
    });

    const selectBtns = el.renderRoot.querySelectorAll<HTMLButtonElement>('.row-select-btn');
    expect(selectBtns.length).toBe(2);
    expect(selectBtns[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(selectBtns[1]!.getAttribute('aria-pressed')).toBe('false');

    const selectedRow = el.renderRoot.querySelector('.legend-item.selected')!;
    const selectBtn = selectedRow.querySelector('.row-select-btn')!;
    expect(selectBtn.contains(selectedRow.querySelector('.eye-btn'))).toBe(false);
    expect(selectBtn.contains(selectedRow.querySelector('.clear-edit-icon'))).toBe(false);
  });

  it('sets aria-pressed on row-select-btn matching selectedCurveId', async () => {
    const el = makeLegend({ selectedCurveId: 'light.a' });
    await el.updateComplete;
    const selectBtns = el.renderRoot.querySelectorAll<HTMLButtonElement>('.row-select-btn');
    expect(selectBtns[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(selectBtns[1]!.getAttribute('aria-pressed')).toBe('false');
  });

  it('sets aria-pressed on eye-btn matching !curve.visible', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const eyes = el.renderRoot.querySelectorAll<HTMLButtonElement>('.eye-btn');
    expect(eyes[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(eyes[1]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('applies curve.color to the color-dot background', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const dots = el.renderRoot.querySelectorAll<HTMLElement>('.color-dot');
    expect(dots[0]!.style.background).toContain('rgb(37, 99, 235)');
    expect(dots[1]!.style.background).toContain('rgb(239, 83, 80)');
  });

  it('rotates LEGEND_SHAPES by index', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const dots = el.renderRoot.querySelectorAll<HTMLElement>('.color-dot');
    expect(dots[0]!.classList.contains(`shape-${LEGEND_SHAPES[0]}`)).toBe(true);
    expect(dots[1]!.classList.contains(`shape-${LEGEND_SHAPES[1]}`)).toBe(true);
  });

  it('dispatches select-curve on row-select click', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('select-curve', spy);
    const selectBtn = el.renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!;
    selectBtn.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].detail).toEqual({ entityId: 'light.a' });
  });

  it('dispatches toggle-curve on eye-btn click', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('toggle-curve', spy);
    const eye = el.renderRoot.querySelector<HTMLButtonElement>('.eye-btn')!;
    eye.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].detail).toEqual({ entityId: 'light.a' });
  });

  it('stops propagation on eye click so select-curve is NOT fired', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const selectSpy = vi.fn();
    const toggleSpy = vi.fn();
    el.addEventListener('select-curve', selectSpy);
    el.addEventListener('toggle-curve', toggleSpy);
    const eye = el.renderRoot.querySelector<HTMLButtonElement>('.eye-btn')!;
    eye.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('dispatches select-curve from the stop-editing affordance only once', async () => {
    const el = makeLegend({ selectedCurveId: 'light.a' });
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('select-curve', spy);
    const clear = el.renderRoot.querySelector<HTMLButtonElement>('.clear-edit-icon')!;
    clear.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].detail).toEqual({ entityId: 'light.a' });
  });

  it('does not also toggle the row when stop-editing is keyboard activated', async () => {
    const el = makeLegend({ selectedCurveId: 'light.a' });
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('select-curve', spy);
    const clear = el.renderRoot.querySelector<HTMLButtonElement>('.clear-edit-icon')!;
    clear.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    clear.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].detail).toEqual({ entityId: 'light.a' });
  });

  // The row selector is a native <button>, so Enter/Space activate it via a
  // synthesized click (handled by @click -> _select). The keydown handler must
  // NOT also dispatch, or _onSelectCurve's toggle would see two events and
  // cancel the selection out. These tests simulate the real-browser sequence
  // (keydown then native click) and pin the total to a single dispatch.
  it('selects exactly once on Enter (no double-dispatch with native activation)', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('select-curve', spy);
    const selectBtn = el.renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!;
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    selectBtn.dispatchEvent(ev);
    // The handler must NOT preventDefault — that would suppress the native
    // button activation a real browser fires for Enter, breaking selection.
    expect(ev.defaultPrevented).toBe(false);
    selectBtn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('selects exactly once on Space (no double-dispatch with native activation)', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('select-curve', spy);
    const selectBtn = el.renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!;
    const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    selectBtn.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    selectBtn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('moves focus with ArrowDown and ArrowUp across row-select buttons', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const selectBtns = el.renderRoot.querySelectorAll<HTMLButtonElement>('.row-select-btn');
    const root = el.renderRoot as ShadowRoot;
    selectBtns[0]!.focus();
    selectBtns[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(root.activeElement).toBe(selectBtns[1]);
    selectBtns[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(root.activeElement).toBe(selectBtns[0]);
  });

  it('dispatches toggle-curve on eye Enter/Space keys', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('toggle-curve', spy);
    const eye = el.renderRoot.querySelector<HTMLButtonElement>('.eye-btn')!;
    eye.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    eye.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not react to other keys on row-select button', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('select-curve', spy);
    const selectBtn = el.renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!;
    selectBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    selectBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('bubbles and composes select-curve across shadow boundary', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const outerSpy = vi.fn();
    document.body.addEventListener('select-curve', outerSpy);
    el.renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!.click();
    expect(outerSpy).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('select-curve', outerSpy);
  });

  it('bubbles and composes toggle-curve across shadow boundary', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const outerSpy = vi.fn();
    document.body.addEventListener('toggle-curve', outerSpy);
    const eye = el.renderRoot.querySelector<HTMLButtonElement>('.eye-btn')!;
    eye.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(outerSpy).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('toggle-curve', outerSpy);
  });

  it('omits aria-label on legend items — accessible name comes from descendant text', async () => {
    const el = makeLegend({ scrubberPosition: null });
    await el.updateComplete;
    const item = el.renderRoot.querySelector('.legend-item')!;
    expect(item.getAttribute('aria-label')).toBeNull();
    expect(item.textContent).toContain('Alpha');
  });

  it('includes sampled brightness in the row-select button accessible name when scrubber is active', async () => {
    const curve: LightCurve = {
      entityId: 'light.a',
      friendlyName: 'Alpha',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: '#2563eb',
    };
    const el = makeLegend({ curves: [curve], scrubberPosition: 50 });
    await el.updateComplete;
    const selectBtn = el.renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!;
    const expectedPct = Math.round(sampleCurveAt(curve.controlPoints, 50));
    expect(selectBtn.textContent).toContain(`${expectedPct}%`);
    expect(selectBtn.textContent).toContain('Alpha');
    expect(selectBtn.contains(selectBtn.querySelector('.brightness-value'))).toBe(true);
  });

  it('exposes the full light name as a title when row text is truncated', async () => {
    const curve: LightCurve = {
      entityId: 'light.long',
      friendlyName: 'Ground Floor Living Room Main Ceiling Chandelier (Warm White)',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: '#2563eb',
    };
    const el = makeLegend({ curves: [curve] });
    await el.updateComplete;
    const name = el.renderRoot.querySelector<HTMLElement>('.name')!;
    expect(name.title).toBe(curve.friendlyName);
  });

  describe('batch light management', () => {
    it('renders one Edit lights command and no per-light mutation controls', async () => {
      const el = makeLegend();
      el.canManage = true;
      await el.updateComplete;

      const edit = el.renderRoot.querySelector<HTMLButtonElement>('.add-light-btn');
      expect(edit?.textContent?.trim()).toBe('Edit lights');
      expect(el.renderRoot.querySelector('.remove-icon')).toBeNull();
      expect(el.renderRoot.querySelector('.manage-toggle-btn')).toBeNull();
      expect(el.renderRoot.querySelector('.pending-light-row')).toBeNull();
    });

    it('dispatches edit-lights once and hides the command while applying', async () => {
      const el = makeLegend();
      el.canManage = true;
      await el.updateComplete;
      const opened = vi.fn();
      el.addEventListener('edit-lights', opened);

      el.renderRoot.querySelector<HTMLButtonElement>('.add-light-btn')!.click();
      expect(opened).toHaveBeenCalledTimes(1);

      el.managing = true;
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.add-light-btn')).toBeNull();
      expect(el.renderRoot.textContent).toContain('Updating lights');
    });

    it('keeps destructive group deletion separate from membership editing', async () => {
      const el = makeLegend();
      el.canManage = true;
      await el.updateComplete;
      const deleted = vi.fn();
      el.addEventListener('delete-group', deleted);

      el.renderRoot.querySelector<HTMLButtonElement>('.delete-group-btn.link')!.click();
      await el.updateComplete;
      expect(el.renderRoot.textContent).toContain('Delete this group?');
      el.renderRoot.querySelector<HTMLButtonElement>('.delete-group-btn.danger')!.click();
      expect(deleted).toHaveBeenCalledTimes(1);
    });
  });
});

describe('row controls stay visible and tappable', () => {
  const cssText = () => CurveLegendClass.styles.cssText;

  // inherit-at-partial-opacity made the hide toggle effectively invisible
  // (shipped twice, reported twice). The control needs its own color and a
  // resting chip; hover cannot be the only reveal on touch devices.
  it('eye toggle has an explicit color, not inherit', () => {
    const rule = cssText().match(/\.eye-btn\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/color:\s*var\(--secondary-text-color/);
    expect(rule![0]).not.toMatch(/color:\s*inherit/);
  });

  it('eye toggle has a resting background chip', () => {
    const rule = cssText().match(/\.eye-btn\s*\{[^}]*\}/);
    expect(rule![0]).toMatch(/background:\s*color-mix/);
  });

  // The visible row is the promise; the button must fill it so there are no
  // dead zones above and below the text.
  it('row select button stretches to the full row height', () => {
    const rule = cssText().match(/\.row-select-btn\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/align-self:\s*stretch/);
  });

  it('rows keep no vertical padding outside the select button', () => {
    const rule = cssText().match(/\.legend-item\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/padding:\s*0 10px/);
  });

  // The list must scroll inside its own surface at every group size, not
  // only at 20+, or a mid-size group still pushes save/undo out of reach.
  it('legend list is height-bounded for all group sizes', () => {
    const rule = cssText().match(/\.legend-panel\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/--curve-legend-max-height:\s*min\(52vh, 520px\)/);
  });

  // The eye glyph was invisible for two releases because its shapes came
  // from a nested html`` template inside <svg>, which Lit parses in the
  // HTML namespace — the elements existed but never painted. They must be
  // real SVG-namespace elements.
  it('eye icon shapes render in the SVG namespace', async () => {
    const el = makeLegend();
    await el.updateComplete;
    const shapes = el.renderRoot.querySelectorAll('.eye-btn svg path, .eye-btn svg circle');
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      expect(shape.namespaceURI).toBe('http://www.w3.org/2000/svg');
    }
  });
});
