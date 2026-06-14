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
  /** Handles <ha-entity-picker>'s `value-changed` (detail.value). */
  onValueChanged: (e: CustomEvent) => void;
  /** Handles the fallback <input>'s `input` event (target.value). */
  onFallbackInput: (e: Event) => void;
}

/**
 * Renders HA's lazily-registered <ha-entity-picker>, or a plain <input>
 * fallback when it never loads. Shared by the dashboard card editor and the
 * in-card add-light form so the picker/fallback behaviour stays identical in
 * both. The caller owns the EntityPickerLoader (it observes `hass` differently
 * in each host) and the value extraction/trim in its handlers.
 */
export function renderEntityPickerField(o: EntityPickerFieldOptions): TemplateResult {
  return o.ready
    ? html`<ha-entity-picker
        .hass=${o.hass}
        .value=${o.value}
        .includeDomains=${o.includeDomains}
        .excludeEntities=${o.excludeEntities ?? []}
        allow-custom-entity
        @value-changed=${o.onValueChanged}
      ></ha-entity-picker>`
    : html`<input
        type="text"
        .value=${o.value}
        placeholder=${o.placeholder ?? nothing}
        @input=${o.onFallbackInput}
      />`;
}
