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

// Suggest this card only for lights the entity registry confirms belong to the
// lightener platform. YAML-configured Lightener lights have no registry entry,
// so they get no suggestion — by design (a false positive would drop a broken
// card config onto someone's dashboard; silence is the safer failure).
export function getLightenerEntitySuggestion(hass: Hass, entityId: string): CardSuggestion | null {
  if (entityId.split('.')[0] !== 'light') {
    return null;
  }
  if (hass.entities?.[entityId]?.platform !== 'lightener') {
    return null;
  }
  return { config: { type: CARD_CONFIG_TYPE, entity: entityId } };
}
