import { describe, expect, it } from 'vitest';

import {
  CARD_CONFIG_TYPE,
  CARD_TYPE,
  type CustomCardDescriptor,
  type CustomCardsHost,
  getLightenerEntitySuggestion,
  registerCardMetadata,
} from './card-registration.js';
import type { Hass } from './types.js';

function makeDescriptor(overrides: Partial<CustomCardDescriptor> = {}): CustomCardDescriptor {
  return {
    type: CARD_TYPE,
    name: 'Lightener Studio',
    description: 'Tune per-light brightness curves for a Lightener group.',
    documentationURL: 'https://github.com/florianhorner/lightener-studio#readme',
    getEntitySuggestion: getLightenerEntitySuggestion,
    ...overrides,
  };
}

// Suggestion tests only touch hass.entities; the rest of the Hass surface is
// irrelevant here, so a minimal cast keeps the fixtures readable.
function makeHass(entities?: Record<string, { platform?: string }>): Hass {
  return { entities } as unknown as Hass;
}

describe('registerCardMetadata', () => {
  it('initializes window.customCards when absent and pushes one entry', () => {
    const win: CustomCardsHost = {};
    const descriptor = makeDescriptor();

    registerCardMetadata(win, descriptor);

    expect(Array.isArray(win.customCards)).toBe(true);
    expect(win.customCards).toEqual([descriptor]);
  });

  it('appends alongside other cards already registered', () => {
    const otherCard = { type: 'some-other-card', name: 'Other' };
    const win: CustomCardsHost = { customCards: [otherCard] };

    registerCardMetadata(win, makeDescriptor());

    expect(win.customCards).toHaveLength(2);
    expect((win.customCards as CustomCardDescriptor[])[0]).toBe(otherCard);
  });

  it('keeps the first entry verbatim on a double registration of the same type', () => {
    // Double-load coexistence: bundle exec #1 (extra-module URL) registers,
    // exec #2 (leftover manual resource) must NOT replace or mutate the entry
    // the picker may already hold a reference to.
    const win: CustomCardsHost = {};
    const first = makeDescriptor({ description: 'first registration' });
    const second = makeDescriptor({ description: 'second registration' });

    registerCardMetadata(win, first);
    registerCardMetadata(win, second);

    expect(win.customCards).toHaveLength(1);
    expect((win.customCards as CustomCardDescriptor[])[0]).toBe(first);
    expect((win.customCards as CustomCardDescriptor[])[0].description).toBe('first registration');
  });

  it('does not throw when window.customCards is pre-set to non-array garbage', () => {
    // Another card's bundle owns this bug; aborting OUR module eval over it
    // would take the whole card down.
    for (const garbage of [null, 'cards', 42, { length: 1 }]) {
      const win: CustomCardsHost = { customCards: garbage };
      expect(() => registerCardMetadata(win, makeDescriptor())).not.toThrow();
      expect(win.customCards).toBe(garbage);
    }
  });
});

describe('getLightenerEntitySuggestion', () => {
  it('returns the exact card config for a registry-confirmed lightener light', () => {
    const hass = makeHass({ 'light.living_room': { platform: 'lightener' } });

    expect(getLightenerEntitySuggestion(hass, 'light.living_room')).toEqual({
      config: { type: CARD_CONFIG_TYPE, entity: 'light.living_room' },
    });
  });

  it('returns null for a normal light from another platform', () => {
    const hass = makeHass({ 'light.kitchen': { platform: 'hue' } });

    expect(getLightenerEntitySuggestion(hass, 'light.kitchen')).toBeNull();
  });

  it('returns null for a non-light domain even when the registry says lightener', () => {
    const hass = makeHass({ 'media_player.tv': { platform: 'lightener' } });

    expect(getLightenerEntitySuggestion(hass, 'media_player.tv')).toBeNull();
  });

  it('returns null when hass.entities is undefined (registry not hydrated)', () => {
    const hass = makeHass(undefined);

    expect(getLightenerEntitySuggestion(hass, 'light.living_room')).toBeNull();
  });

  it('returns null when the registry entry lacks a platform', () => {
    const hass = makeHass({ 'light.living_room': {} });

    expect(getLightenerEntitySuggestion(hass, 'light.living_room')).toBeNull();
  });

  it('returns null when the entity has no registry entry (YAML-configured lightener)', () => {
    const hass = makeHass({ 'light.other': { platform: 'lightener' } });

    expect(getLightenerEntitySuggestion(hass, 'light.yaml_lightener')).toBeNull();
  });
});
