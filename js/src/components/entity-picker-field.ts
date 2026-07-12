import { html, nothing, TemplateResult } from 'lit';
import { Hass } from '../utils/types.js';

export interface EntityPickerFieldOptions {
  /** Whether HA's <ha-entity-picker> has registered (see EntityPickerLoader). */
  ready: boolean;
  hass: Hass | null;
  value: string;
  includeDomains: string[];
  /**
   * Allowlist of entity ids. When set, the picker offers only these (plus the
   * current value via `allow-custom-entity`). Omit to show every entity in
   * `includeDomains`. The card editor uses this to list only Lightener groups.
   */
  includeEntities?: string[];
  excludeEntities?: string[];
  placeholder?: string;
  ariaLabel?: string;
  /**
   * Which DOM event the fallback <input> commits on. `'input'` (default) fires
   * on every keystroke — right for live configuration surfaces. `'change'`
   * fires on blur/Enter — right for a deliberate picker selection or the card
   * editor, so it does not rewrite config on every keystroke.
   */
  fallbackEvent?: 'input' | 'change';
  /** Handles <ha-entity-picker>'s `value-changed` (detail.value). */
  onValueChanged: (e: CustomEvent) => void;
  /** Handles the fallback <input>'s commit event (target.value). */
  onFallbackInput: (e: Event) => void;
}

/**
 * Renders HA's lazily-registered <ha-entity-picker>, or a plain <input>
 * fallback when it never loads. Shared by the dashboard card editor and the
 * in-card pending-light row so the markup stays in one place. Hosts choose their
 * fallback commit behavior; the caller owns EntityPickerLoader and value trimming.
 */
export function renderEntityPickerField(o: EntityPickerFieldOptions): TemplateResult {
  if (o.ready) {
    return html`<ha-entity-picker
      .hass=${o.hass}
      .value=${o.value}
      .includeDomains=${o.includeDomains}
      .includeEntities=${o.includeEntities}
      .excludeEntities=${o.excludeEntities ?? []}
      allow-custom-entity
      aria-label=${o.ariaLabel ?? nothing}
      @value-changed=${o.onValueChanged}
    ></ha-entity-picker>`;
  }
  // Lit parses the event-binding name statically (`@input`/`@change` can't be
  // interpolated), so branch the fallback <input> on the requested commit event.
  return (o.fallbackEvent ?? 'input') === 'change'
    ? html`<input
        type="text"
        .value=${o.value}
        placeholder=${o.placeholder ?? nothing}
        aria-label=${o.ariaLabel ?? nothing}
        @change=${o.onFallbackInput}
      />`
    : html`<input
        type="text"
        .value=${o.value}
        placeholder=${o.placeholder ?? nothing}
        aria-label=${o.ariaLabel ?? nothing}
        @input=${o.onFallbackInput}
      />`;
}
