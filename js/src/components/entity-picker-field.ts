import { html, nothing, TemplateResult } from 'lit';
import { Hass } from '../utils/types.js';

export interface EntityPickerFieldOptions {
  /** Whether HA's <ha-entity-picker> has registered (see EntityPickerLoader). */
  ready: boolean;
  hass: Hass | null;
  value: string;
  includeDomains: string[];
  excludeEntities?: string[];
  placeholder?: string;
  /**
   * Which DOM event the fallback <input> commits on. `'input'` (default) fires
   * on every keystroke — right for live surfaces like the add-light form that
   * enable a button as you type. `'change'` fires on blur/Enter — right for the
   * card editor, so it doesn't rewrite the Lovelace config on every keystroke.
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
 * in-card add-light form so the markup stays in one place. Hosts differ only in
 * how the fallback commits (`fallbackEvent`): the editor on blur/Enter, the add
 * form live per keystroke. The caller owns the EntityPickerLoader (it observes
 * `hass` differently in each host) and the value extraction/trim in its handlers.
 */
export function renderEntityPickerField(o: EntityPickerFieldOptions): TemplateResult {
  if (o.ready) {
    return html`<ha-entity-picker
      .hass=${o.hass}
      .value=${o.value}
      .includeDomains=${o.includeDomains}
      .excludeEntities=${o.excludeEntities ?? []}
      allow-custom-entity
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
        @change=${o.onFallbackInput}
      />`
    : html`<input
        type="text"
        .value=${o.value}
        placeholder=${o.placeholder ?? nothing}
        @input=${o.onFallbackInput}
      />`;
}
