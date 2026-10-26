// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurveLegend } from './curve-legend.js';
import { CurveLegend as CurveLegendClass } from './curve-legend.js';
import type { BrightnessBar, LevelInputDetail } from './brightness-bar.js';
import type { LightCurve } from '../utils/types.js';
import { LEGEND_SHAPES, sampleCurveAt } from '../utils/graph-math.js';

beforeAll(async () => {
  await import('./curve-legend.js');
});

beforeEach(() => {
  document.body.replaceChildren();
});

function makeLegend(opts?: {
  curves?: LightCurve[];
  selectedCurveId?: string | null;
  scrubberPosition?: number | null;
  readOnly?: boolean;
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
  el.readOnly = opts?.readOnly ?? false;
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
    // Long lists scroll inside the rail instead of lengthening the page.
    expect(el.renderRoot.querySelector('.legend')?.classList.contains('capped')).toBe(true);
    expect(CurveLegendClass.styles.cssText).toContain(
      '--curve-legend-max-height: min(60vh, 470px)'
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

  it('keeps selection, brightness, and visibility as independent row controls', async () => {
    const el = makeLegend({ selectedCurveId: 'light.a' });
    await el.updateComplete;
    const selected = el.renderRoot.querySelector<HTMLElement>('.legend-item.selected')!;
    expect(selected.querySelector('.editing-chip')).toBeNull();
    expect(selected.querySelectorAll('button')).toHaveLength(2);
    expect(selected.querySelector('.row-select-btn')?.getAttribute('aria-pressed')).toBe('true');
    const bar = selected.querySelector('brightness-bar')!;
    expect(selected.querySelector('.row-select-btn')?.contains(bar)).toBe(false);
    expect(bar.querySelector('[slot=label] .name')).not.toBeNull();
    expect(bar.contains(selected.querySelector('.eye-btn'))).toBe(false);
  });

  it('uses non-overlapping mobile action button hitboxes', () => {
    const cssText = CurveLegendClass.styles.cssText;
    expect(cssText).toContain('@media (max-width: 500px)');
    expect(cssText).toContain('.eye-btn');
    // Mobile action buttons render at exactly 44x44 with border-box sizing so
    // padding does not balloon the row height beyond the tap-target minimum.
    expect(cssText).toContain('width: 44px;');
    expect(cssText).toContain('height: 44px;');
    expect(cssText).toContain('box-sizing: border-box;');
    expect(cssText).not.toContain('margin: -12px;');
  });

  it('uses at least 44px desktop action button hitboxes', () => {
    const cssText = CurveLegendClass.styles.cssText;
    for (const selector of ['.eye-btn']) {
      const rule = cssText.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*\\}`));
      expect(rule, `${selector} rule must exist`).not.toBeNull();
      expect(rule![0]).toMatch(/box-sizing:\s*border-box/);
      expect(rule![0]).toMatch(/width:\s*44px/);
      expect(rule![0]).toMatch(/height:\s*48px/);
    }
    expect(cssText).toMatch(/\.eye-btn svg\s*\{[^}]*width:\s*20px/);
  });

  it('keeps disambiguating IDs muted and truncated', () => {
    const rule = CurveLegendClass.styles.cssText.match(/\.entity-id\s*\{[^}]*\}/)![0];
    expect(rule).toContain('font-size: 10px;');
    expect(rule).toContain('opacity: 0.85;');
    expect(rule).toContain('text-overflow: ellipsis;');
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
    expect(selectedRow.querySelectorAll('button')).toHaveLength(2);
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
    const bar = el.renderRoot.querySelector('brightness-bar')!;
    await bar.updateComplete;
    expect(selectBtn.getAttribute('aria-label')).toBe(`Alpha ${expectedPct}%`);
    expect(bar.displayValue).toBe(`${expectedPct}%`);
    expect(bar.renderRoot.querySelector('.value')?.textContent).toBe(`${expectedPct}%`);
    expect(bar.querySelector('.name')?.textContent).toBe('Alpha');
    expect(selectBtn.contains(bar)).toBe(false);
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
    async function openManage(el: CurveLegend) {
      el.renderRoot.querySelector<HTMLButtonElement>('.manage-trigger')!.click();
      await el.updateComplete;
    }

    it('keeps Manage hidden unless the owner offers group management', async () => {
      const el = makeLegend();
      el.canManage = true;
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.manage-trigger')).toBeNull();

      el.showManage = true;
      await el.updateComplete;
      const trigger = el.renderRoot.querySelector<HTMLButtonElement>('.manage-trigger')!;
      expect(trigger.textContent?.trim()).toBe('Manage');
      expect(trigger.getAttribute('aria-label')).toBe('Manage group');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
      // The menu sits above the list header, so the side rail starts with it.
      expect(el.renderRoot.querySelector('.legend-panel')?.firstElementChild?.className).toBe(
        'manage-row'
      );
    });

    it('renders one Edit lights command and no per-light mutation controls', async () => {
      const el = makeLegend();
      el.canManage = true;
      el.showManage = true;
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.add-light-btn')).toBeNull();

      await openManage(el);
      const trigger = el.renderRoot.querySelector<HTMLButtonElement>('.manage-trigger')!;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe('manage-menu');
      const edit = el.renderRoot.querySelector<HTMLButtonElement>('#manage-menu .add-light-btn');
      expect(edit?.textContent?.trim()).toBe('Edit lights');
      expect(el.renderRoot.querySelectorAll('.add-light-btn')).toHaveLength(1);
      expect(el.renderRoot.querySelector('.remove-icon')).toBeNull();
      expect(el.renderRoot.querySelector('.manage-toggle-btn')).toBeNull();
      expect(el.renderRoot.querySelector('.pending-light-row')).toBeNull();
    });

    it('dispatches edit-lights once and hides the command while applying', async () => {
      const el = makeLegend();
      el.canManage = true;
      el.showManage = true;
      await el.updateComplete;
      const opened = vi.fn();
      el.addEventListener('edit-lights', opened);

      await openManage(el);
      el.renderRoot.querySelector<HTMLButtonElement>('.add-light-btn')!.click();
      expect(opened).toHaveBeenCalledTimes(1);
      await el.updateComplete;
      // Choosing an item closes the menu.
      expect(el.renderRoot.querySelector('.manage-menu')).toBeNull();

      el.managing = true;
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.add-light-btn')).toBeNull();
      expect(el.renderRoot.querySelector<HTMLButtonElement>('.manage-trigger')?.disabled).toBe(
        true
      );
      expect(el.renderRoot.textContent).toContain('Updating lights');
    });

    it('keeps destructive group deletion separate from membership editing', async () => {
      const el = makeLegend();
      el.canManage = true;
      el.showManage = true;
      await el.updateComplete;
      const deleted = vi.fn();
      el.addEventListener('delete-group', deleted);

      await openManage(el);
      el.renderRoot.querySelector<HTMLButtonElement>('.delete-group-btn.link')!.click();
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.manage-menu')).toBeNull();
      expect(el.renderRoot.textContent).toContain('Delete this group?');
      // Confirmation starts on the safe choice.
      expect(el.shadowRoot!.activeElement?.matches('.delete-group-btn.cancel')).toBe(true);
      el.renderRoot.querySelector<HTMLButtonElement>('.delete-group-btn.danger')!.click();
      expect(deleted).toHaveBeenCalledTimes(1);
    });

    it('returns focus to Manage when deletion is cancelled', async () => {
      const el = makeLegend();
      el.canManage = true;
      el.showManage = true;
      await el.updateComplete;
      await openManage(el);
      el.renderRoot.querySelector<HTMLButtonElement>('.delete-group-btn.link')!.click();
      await el.updateComplete;
      el.renderRoot.querySelector<HTMLButtonElement>('.delete-group-btn.cancel')!.click();
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.delete-group-confirm')).toBeNull();
      expect(el.shadowRoot!.activeElement?.matches('.manage-trigger')).toBe(true);
    });

    it('closes the menu on Escape and returns focus to its trigger', async () => {
      const el = makeLegend();
      el.canManage = true;
      el.showManage = true;
      await el.updateComplete;
      await openManage(el);
      const item = el.renderRoot.querySelector<HTMLButtonElement>('.add-light-btn')!;
      item.focus();
      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      item.dispatchEvent(escape);
      await el.updateComplete;
      // Handled here, so the editor's own Escape leaves the draft alone.
      expect(escape.defaultPrevented).toBe(true);
      expect(el.renderRoot.querySelector('.manage-menu')).toBeNull();
      expect(el.shadowRoot!.activeElement?.matches('.manage-trigger')).toBe(true);
    });

    it('closes the menu on an outside press but not on a press inside it', async () => {
      const el = makeLegend();
      el.canManage = true;
      el.showManage = true;
      await el.updateComplete;
      await openManage(el);
      el.renderRoot
        .querySelector('.manage-menu')!
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.manage-menu')).not.toBeNull();

      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.manage-menu')).toBeNull();
    });

    it('closes the menu when management becomes unavailable', async () => {
      const el = makeLegend();
      el.canManage = true;
      el.showManage = true;
      await el.updateComplete;
      await openManage(el);
      el.canManage = false;
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.manage-menu')).toBeNull();
      expect(el.renderRoot.querySelector<HTMLButtonElement>('.manage-trigger')?.disabled).toBe(
        true
      );
    });
  });
});

describe('row controls stay visible and tappable', () => {
  const cssText = () => CurveLegendClass.styles.cssText;

  // Visibility controls remain visible at rest because touch has no hover.
  it('eye toggle has an explicit color, not inherit', () => {
    const rule = cssText().match(/\.eye-btn\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/color:\s*var\(--secondary-text-color/);
    expect(rule![0]).not.toMatch(/color:\s*inherit/);
  });

  it('eye toggle stays fully visible at rest', () => {
    const rule = cssText().match(/\.eye-btn\s*\{[^}]*\}/);
    expect(rule![0]).not.toMatch(/opacity:/);
    expect(cssText()).not.toMatch(/\.eye-btn[^{]*\{[^}]*opacity:\s*0[;\s]/);
    expect(cssText()).not.toMatch(/\.eye-btn[^{]*\{[^}]*visibility:\s*hidden/);
  });

  it('reserves a distinct touch target beside the full brightness bar', () => {
    const rules = [...cssText().matchAll(/\.row-select-btn\s*\{[^}]*\}/g)];
    const rule = rules.find((match) => /grid-column:\s*1/.test(match[0]))![0];
    expect(rule).toMatch(/min-width:\s*44px/);
    expect(rule).toMatch(/min-height:\s*48px/);
    expect(rule).toMatch(/grid-column:\s*1/);
  });

  it('keeps the brightness column flexible between independent 44px controls', () => {
    expect(cssText()).toMatch(/grid-template-columns:\s*44px minmax\(0, 1fr\) 44px/);
    expect(cssText()).toMatch(/brightness-bar\s*\{[^}]*grid-column:\s*2/);
  });

  // Up to eight lights stay open; a longer list scrolls inside the rail.
  // The action row sits with the graph, so the list never covers it.
  it('bounds the list height once a group outgrows the open list', async () => {
    const rule = cssText().match(/\.legend-panel\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toMatch(/--curve-legend-max-height:\s*min\(60vh, 470px\)/);
    expect(cssText()).toMatch(
      /\.legend\.capped\s*\{[^}]*max-height:\s*var\(--curve-legend-max-height/
    );
    const curve = (index: number): LightCurve => ({
      entityId: `light.zone_${index}`,
      friendlyName: `Zone ${index}`,
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: '#2563eb',
    });
    const open = makeLegend({ curves: Array.from({ length: 8 }, (_, i) => curve(i)) });
    await open.updateComplete;
    expect(open.renderRoot.querySelector('.legend')?.classList.contains('capped')).toBe(false);
    const capped = makeLegend({ curves: Array.from({ length: 9 }, (_, i) => curve(i)) });
    await capped.updateComplete;
    expect(capped.renderRoot.querySelector('.legend')?.classList.contains('capped')).toBe(true);
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

describe('zero brightness wording', () => {
  it.each([
    [1, 'Off'],
    [11, '<1%'],
    [30, '<1%'],
    [50, '<1%'],
    [51, '1%'],
  ])(
    'labels the actual sample at %s without rounding a positive target to Off',
    async (position, label) => {
      const el = makeLegend({
        scrubberPosition: position as number,
        curves: [
          {
            entityId: 'light.dim',
            friendlyName: 'Dim light',
            controlPoints: [
              { lightener: 0, target: 0 },
              { lightener: 1, target: 0 },
              { lightener: 100, target: 1 },
            ],
            visible: true,
            color: '#2563eb',
          },
        ],
      });
      await el.updateComplete;
      const row = el.renderRoot.querySelector('.row-select-btn')!;
      expect(el.renderRoot.querySelector('brightness-bar')!.displayValue).toBe(label);
      expect(el.renderRoot.querySelector('brightness-bar')!.interactionValue).toBeCloseTo(
        ((position as number) - 1) / 99
      );
      expect(row.getAttribute('aria-label')).toBe(`Dim light ${label}`);
      el.remove();
    }
  );

  it('says Off in visible and accessible labels while keeping positive percentages', async () => {
    const el = makeLegend({ scrubberPosition: 0 });
    await el.updateComplete;
    const row = el.renderRoot.querySelector('.row-select-btn')!;
    expect(el.renderRoot.querySelector('brightness-bar')!.displayValue).toBe('Off');
    expect(row.getAttribute('aria-label')).toBe('Alpha Off');
    el.scrubberPosition = 1;
    await el.updateComplete;
    expect(el.renderRoot.querySelector('brightness-bar')!.displayValue).toBe('1%');
    expect(row.getAttribute('aria-label')).toBe('Alpha 1%');
    el.remove();
  });
});

describe('curve-legend — shared bar intent boundary', () => {
  function dispatch(bar: BrightnessBar, type: string, value = 50): void {
    bar.dispatchEvent(
      new CustomEvent<LevelInputDetail>(type, {
        detail: { value },
        bubbles: true,
        composed: true,
      })
    );
  }

  it('maps bar focus to curve focus without toggling selection or visibility', async () => {
    const el = makeLegend({ scrubberPosition: 50 });
    await el.updateComplete;
    const focus = vi.fn();
    const select = vi.fn();
    const toggle = vi.fn();
    const edit = vi.fn();
    el.addEventListener('focus-curve', focus);
    el.addEventListener('select-curve', select);
    el.addEventListener('toggle-curve', toggle);
    el.addEventListener('light-level-start', edit);
    el.addEventListener('light-level-input', edit);
    el.addEventListener('light-level-end', edit);
    dispatch(el.renderRoot.querySelector('brightness-bar')!, 'bar-focus');
    expect(focus).toHaveBeenCalledOnce();
    expect(focus.mock.calls[0][0].detail).toEqual({ entityId: 'light.a' });
    expect(focus.mock.calls[0][0].bubbles).toBe(true);
    expect(focus.mock.calls[0][0].composed).toBe(true);
    expect(select).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
  });

  it('remaps the edited entity and target without mutating any curve', async () => {
    const el = makeLegend({ scrubberPosition: 50 });
    await el.updateComplete;
    const before = structuredClone(el.curves);
    const intents: CustomEvent[] = [];
    for (const type of ['light-level-start', 'light-level-input', 'light-level-end']) {
      el.addEventListener(type, (event) => intents.push(event as CustomEvent));
    }
    const bar = el.renderRoot.querySelector('brightness-bar')!;
    dispatch(bar, 'level-start');
    dispatch(bar, 'level-input', 67);
    dispatch(bar, 'level-end');
    expect(intents.map(({ type, detail }) => ({ type, detail }))).toEqual([
      { type: 'light-level-start', detail: { entityId: 'light.a' } },
      { type: 'light-level-input', detail: { entityId: 'light.a', target: 67 } },
      { type: 'light-level-end', detail: { entityId: 'light.a' } },
    ]);
    expect(intents.every((event) => event.bubbles && event.composed)).toBe(true);
    expect(el.curves).toEqual(before);
  });

  it.each([
    { reason: 'view-only', readOnly: true, position: 50, index: 0 },
    { reason: 'hidden light', readOnly: false, position: 50, index: 1 },
    { reason: 'room off', readOnly: false, position: 0, index: 0 },
    { reason: 'fractional room displayed off', readOnly: false, position: 0.4, index: 0 },
  ])(
    'disables brightness for $reason while preserving separate row controls',
    async ({ readOnly, position, index }) => {
      const el = makeLegend({ readOnly, scrubberPosition: position });
      await el.updateComplete;
      const row = el.renderRoot.querySelectorAll('.legend-item')[index];
      const bar = row.querySelector('brightness-bar')!;
      await bar.updateComplete;
      expect(bar.disabled).toBe(true);
      expect(bar.renderRoot.querySelector('input')!.disabled).toBe(true);
      expect(row.querySelector<HTMLButtonElement>('.row-select-btn')!.disabled).toBe(false);
      expect(row.querySelector<HTMLButtonElement>('.eye-btn')!.disabled).toBe(false);
    }
  );

  it('keeps the bar and displayed value at the same fallback room coordinate', async () => {
    const el = makeLegend({ scrubberPosition: null });
    await el.updateComplete;
    const bars = [...el.renderRoot.querySelectorAll('brightness-bar')];
    expect(bars.map((bar) => bar.value)).toEqual([100, 80]);
    expect(bars.map((bar) => bar.interactionValue)).toEqual([100, 80]);
    expect(bars.map((bar) => bar.displayValue)).toEqual(['100%', '80%']);
    for (const bar of bars) {
      await bar.updateComplete;
      expect(bar.renderRoot.querySelector('.value')?.textContent).toBe(`${bar.value}%`);
    }
  });

  it('keeps example presentation separate from the authoritative edit baseline', async () => {
    const el = makeLegend({ scrubberPosition: 50 });
    el.editingCurves = el.curves.map((curve) => ({
      ...curve,
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 40 },
      ],
    }));
    el.exampleEntityId = 'light.a';
    el.contextKey = 'light.group:loaded';
    await el.updateComplete;
    const bar = el.renderRoot.querySelector('brightness-bar')!;
    expect(bar.value).toBe(50);
    expect(bar.interactionValue).toBe(20);
    expect(bar.displayValue).toBe('≈ 50%');
    expect(bar.contextKey).toBe('light.group:loaded:light.a:50');
    expect(bar.label).toBe('Alpha brightness');
  });
});
