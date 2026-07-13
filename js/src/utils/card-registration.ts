/**
 * Card-picker registration for HA 2026.6's custom-card suggestion API.
 *
 * HA's dashboard card picker reads `window.customCards` for metadata (name,
 * description, docs link) and calls each entry's optional
 * `getEntitySuggestion(hass, entityId)` to ask "should this card be suggested
 * for this entity?". Both halves live here as pure functions so they can be
 * unit-tested without mounting the card.
 *
 * Registration must survive hostile conditions:
 * - `window.customCards` may be missing (we initialize it), or set to garbage
 *   by another card's bundle (we bail out instead of throwing during module
 *   eval — an abort here would kill the whole card bundle).
 * - The bundle can execute twice (extra-module URL + leftover manual
 *   resource). First registration wins: a duplicate `type` leaves the existing
 *   entry untouched — never Object.assign over a live entry the picker may
 *   already hold a reference to.
 */
import type { Hass } from './types.js';

// The HA entity-registry `platform` value for entities this integration
// creates. Must match DOMAIN in custom_components/lightener_studio/const.py.
// The domain rename (`lightener` → `lightener_studio`, v2.17.0) left this
// literal stale in more than one call site; centralizing it here is the single
// source of truth so it can never drift out of sync again.
export const LIGHTENER_PLATFORM = 'lightener_studio';

/** Custom-element tag, used as the `type` key on `window.customCards`. */
export const CARD_TYPE = 'lightener-curve-card';
/** Lovelace config `type` value (the tag with HA's `custom:` prefix). */
export const CARD_CONFIG_TYPE = 'custom:lightener-curve-card';

export interface CardSuggestion {
  config: { type: string; entity: string };
}

export interface CustomCardDescriptor {
  type: string;
  name: string;
  description: string;
  documentationURL: string;
  // When true, HA's card picker renders a live preview of the card (using
  // getStubConfig()) inside the picker tile, instead of a name+description-only
  // tile. Our stub config has no entity, so the card's _tryLoadCurves() falls
  // back to mock curves — giving the picker a real demo-curve preview.
  preview?: boolean;
  getEntitySuggestion?: (hass: Hass, entityId: string) => CardSuggestion | null;
}

/** The slice of `window` this module touches — keeps tests free of jsdom. */
export interface CustomCardsHost {
  customCards?: unknown;
}

export function registerCardMetadata(win: CustomCardsHost, descriptor: CustomCardDescriptor): void {
  if (win.customCards === undefined) {
    win.customCards = [];
  }
  // Another card's bundle may have set window.customCards to a non-array.
  // Registering into garbage is impossible; throwing would abort OUR module
  // eval over THEIR bug — so do nothing.
  if (!Array.isArray(win.customCards)) {
    return;
  }
  const cards = win.customCards as CustomCardDescriptor[];
  // First registration wins (double-load coexistence): leave the live entry alone.
  if (cards.some((entry) => entry?.type === descriptor.type)) {
    return;
  }
  cards.push(descriptor);
}

// True iff the entity registry confirms entityId is a light on the lightener
// platform. YAML-configured Lightener lights have no registry entry, so they
// read false — by design (the registry is the only trustworthy signal; a false
// positive would target a non-Lightener entity and load no curves).
export function isLightenerEntity(hass: Hass, entityId: string): boolean {
  if (entityId.split('.')[0] !== 'light') {
    return false;
  }
  return hass.entities?.[entityId]?.platform === LIGHTENER_PLATFORM;
}

// Entity ids of every registry-confirmed lightener light — used to narrow the
// card editor's entity picker to valid targets. Empty when the registry isn't
// hydrated yet (`hass.entities` absent); the caller then falls back to showing
// all lights rather than an empty picker.
export function lightenerEntityIds(hass: Hass): string[] {
  const registry = hass.entities;
  if (!registry) {
    return [];
  }
  return Object.keys(registry).filter((id) => isLightenerEntity(hass, id));
}

// Suggest this card only for lights the entity registry confirms belong to the
// lightener platform (a false positive would drop a broken card config onto
// someone's dashboard; silence is the safer failure).
export function getLightenerEntitySuggestion(hass: Hass, entityId: string): CardSuggestion | null {
  if (!isLightenerEntity(hass, entityId)) {
    return null;
  }
  return { config: { type: CARD_CONFIG_TYPE, entity: entityId } };
}
