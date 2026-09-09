// @vitest-environment jsdom

/**
 * The shared entity-picker renderer, including its degraded path.
 *
 * The fallback <input> exists precisely for the case where HA's lazily
 * registered <ha-entity-picker> never loads — the branch a happy-path test
 * never reaches.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { html, render } from 'lit';
import { renderEntityPickerField, type EntityPickerFieldOptions } from './entity-picker-field.js';
import type { Hass } from '../utils/types.js';

const HASS = { states: {}, user: { is_admin: true } } as unknown as Hass;

afterEach(() => {
  document.body.replaceChildren();
});

function mount(overrides: Partial<EntityPickerFieldOptions> = {}) {
  const onValueChanged = vi.fn();
  const onFallbackInput = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(
    html`${renderEntityPickerField({
      ready: false,
      hass: HASS,
      value: 'light.group',
      includeDomains: ['light'],
      onValueChanged,
      onFallbackInput,
      ...overrides,
    })}`,
    host
  );
  return { host, onValueChanged, onFallbackInput };
}

describe('when <ha-entity-picker> is available', () => {
  it('renders the picker with the caller’s scoping', () => {
    const { host } = mount({
      ready: true,
      includeEntities: ['light.one', 'light.two'],
      excludeEntities: ['light.three'],
      ariaLabel: 'Lightener group',
    });

    const picker = host.querySelector('ha-entity-picker') as HTMLElement & {
      hass: Hass;
      value: string;
      includeDomains: string[];
      includeEntities?: string[];
      excludeEntities: string[];
    };
    expect(picker).not.toBeNull();
    expect(host.querySelector('input')).toBeNull();
    expect(picker.value).toBe('light.group');
    expect(picker.hass).toBe(HASS);
    expect(picker.includeDomains).toEqual(['light']);
    expect(picker.includeEntities).toEqual(['light.one', 'light.two']);
    expect(picker.excludeEntities).toEqual(['light.three']);
    expect(picker.getAttribute('aria-label')).toBe('Lightener group');
    // allow-custom-entity keeps a value that is not in the list selectable.
    expect(picker.hasAttribute('allow-custom-entity')).toBe(true);
  });

  it('defaults excludeEntities to empty rather than undefined', () => {
    const { host } = mount({ ready: true });

    const picker = host.querySelector('ha-entity-picker') as HTMLElement & {
      excludeEntities: string[];
    };
    expect(picker.excludeEntities).toEqual([]);
  });

  it('forwards value-changed to the host', () => {
    const { host, onValueChanged, onFallbackInput } = mount({ ready: true });

    host
      .querySelector('ha-entity-picker')!
      .dispatchEvent(new CustomEvent('value-changed', { detail: { value: 'light.picked' } }));

    expect(onValueChanged).toHaveBeenCalledTimes(1);
    expect(onValueChanged.mock.calls[0][0].detail.value).toBe('light.picked');
    expect(onFallbackInput).not.toHaveBeenCalled();
  });
});

describe('when the picker never loads', () => {
  it('falls back to a plain text input carrying the same value and label', () => {
    const { host } = mount({ placeholder: 'light.your_group', ariaLabel: 'Group entity' });

    const input = host.querySelector('input')!;
    expect(host.querySelector('ha-entity-picker')).toBeNull();
    expect(input.type).toBe('text');
    expect(input.value).toBe('light.group');
    expect(input.placeholder).toBe('light.your_group');
    expect(input.getAttribute('aria-label')).toBe('Group entity');
  });

  it('commits on every keystroke by default, for live configuration surfaces', () => {
    const { host, onFallbackInput, onValueChanged } = mount();

    const input = host.querySelector('input')!;
    input.value = 'light.typed';
    input.dispatchEvent(new Event('input'));

    expect(onFallbackInput).toHaveBeenCalledTimes(1);
    expect(onValueChanged).not.toHaveBeenCalled();

    // The default binding is `input`, so a change event must not double-commit.
    input.dispatchEvent(new Event('change'));
    expect(onFallbackInput).toHaveBeenCalledTimes(1);
  });

  it('commits only on blur/Enter when the host asks for `change`', () => {
    const { host, onFallbackInput } = mount({ fallbackEvent: 'change' });

    const input = host.querySelector('input')!;
    input.value = 'light.typed';

    // Typing must not rewrite the Lovelace config on every keystroke.
    input.dispatchEvent(new Event('input'));
    expect(onFallbackInput).not.toHaveBeenCalled();

    input.dispatchEvent(new Event('change'));
    expect(onFallbackInput).toHaveBeenCalledTimes(1);
  });

  it('omits placeholder and aria-label attributes when unset', () => {
    const { host } = mount();

    const input = host.querySelector('input')!;
    expect(input.hasAttribute('placeholder')).toBe(false);
    expect(input.hasAttribute('aria-label')).toBe(false);
  });

  it('renders without a hass instance', () => {
    const { host } = mount({ hass: null, value: '' });

    const input = host.querySelector('input')!;
    expect(input.value).toBe('');
  });
});
