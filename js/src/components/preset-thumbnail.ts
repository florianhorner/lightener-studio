import { html, TemplateResult } from 'lit';
import { PresetDef, presetPolylinePoints } from '../utils/presets.js';

/**
 * Renders the small curve-shape preview for a preset. Shared by the card's
 * preset panel and the in-card add-light form's "starting curve" chooser so the
 * two surfaces can never draw the same preset differently. Presentation lives on
 * the polyline so the thumbnail is fully self-contained (no per-call-site CSS).
 */
export function renderPresetThumbnail(preset: PresetDef): TemplateResult {
  return html`<svg
    class="preset-thumb"
    viewBox="0 0 64 40"
    width="64"
    height="40"
    aria-hidden="true"
  >
    <polyline
      points=${presetPolylinePoints(preset)}
      fill="none"
      stroke="var(--accent, #2563eb)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></polyline>
  </svg>`;
}
