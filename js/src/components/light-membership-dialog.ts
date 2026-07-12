import { LitElement, css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { Hass } from '../utils/types.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';

interface CandidateLight {
  entity_id: string;
  name: string;
  available: boolean;
  area_id: string | null;
  area_name: string | null;
}

interface CandidateResponse {
  observed_controlled_entity_ids: string[];
  lights: CandidateLight[];
}

interface MembershipResponse {
  entities: Record<string, { brightness: Record<string, string> }>;
  added_entity_ids: string[];
  removed_entity_ids: string[];
}

export class LightMembershipDialog extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @property({ type: String }) groupEntityId = '';

  @state() private _lights: CandidateLight[] = [];
  @state() private _observed: string[] = [];
  @state() private _selected = new Set<string>();
  @state() private _search = '';
  @state() private _areaId = '';
  @state() private _loading = true;
  @state() private _applying = false;
  @state() private _error: string | null = null;
  private _loadInFlight = false;
  private _loaded = false;
  private _lastLoadStatesRef: unknown = null;

  private _boundKeydown = (event: KeyboardEvent) => this._onKeydown(event);

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 20px;
      box-sizing: border-box;
      background: rgb(10 15 18 / 0.58);
      color: var(--primary-text-color, #20252a);
    }
    .dialog {
      width: min(600px, 100%);
      max-height: min(760px, calc(100vh - 40px));
      display: grid;
      grid-template-rows: auto auto minmax(180px, 1fr) auto;
      overflow: hidden;
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      box-shadow: 0 24px 70px rgb(0 0 0 / 0.34);
    }
    header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px 22px 15px;
      border-bottom: 1px solid var(--divider-color, #e2e6e9);
    }
    h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    header p {
      margin: 6px 0 0;
      color: var(--secondary-text-color, #66717b);
      font-size: 13px;
      line-height: 1.45;
    }
    .close {
      width: 38px;
      height: 38px;
      margin-left: auto;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: 24px/1 sans-serif;
      cursor: pointer;
    }
    .close:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(150px, 0.45fr);
      gap: 10px;
      padding: 14px 22px;
    }
    input[type='search'],
    select {
      width: 100%;
      height: 42px;
      box-sizing: border-box;
      border: 1px solid var(--divider-color, #d7dde1);
      border-radius: 6px;
      padding: 0 12px;
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
    }
    input:focus,
    select:focus,
    button:focus-visible {
      outline: 2px solid var(--primary-color, #1590ad);
      outline-offset: 2px;
    }
    .list {
      overflow: auto;
      border-block: 1px solid var(--divider-color, #e2e6e9);
    }
    .light-row {
      min-height: 56px;
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 8px 22px;
      box-sizing: border-box;
      border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 68%, transparent);
      cursor: pointer;
    }
    .light-row:hover {
      background: color-mix(in srgb, var(--primary-color, #1590ad) 6%, transparent);
    }
    .light-row input {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-color, #1590ad);
    }
    .name,
    .entity-id {
      display: block;
      min-width: 0;
      overflow-wrap: anywhere;
      letter-spacing: 0;
    }
    .name {
      font-weight: 600;
      font-size: 14px;
    }
    .entity-id,
    .area,
    .empty,
    .loading {
      color: var(--secondary-text-color, #66717b);
      font-size: 12px;
    }
    .area {
      text-align: right;
      max-width: 150px;
    }
    .unavailable {
      opacity: 0.68;
    }
    .empty,
    .loading {
      padding: 28px 22px;
      text-align: center;
    }
    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 14px 22px 18px;
    }
    .count {
      margin-right: auto;
      color: var(--secondary-text-color, #66717b);
      font-size: 13px;
    }
    .error {
      flex-basis: 100%;
      color: var(--error-color, #b3261e);
      font-size: 13px;
      margin-bottom: 4px;
    }
    .action {
      min-height: 40px;
      padding: 0 16px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #d7dde1);
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .action.primary {
      border-color: var(--primary-color, #1590ad);
      background: var(--primary-color, #1590ad);
      color: #fff;
    }
    button:disabled,
    input:disabled,
    select:disabled {
      opacity: 0.58;
      cursor: default;
    }
    @media (max-width: 620px) {
      :host {
        padding: 0;
        place-items: stretch;
      }
      .dialog {
        width: 100%;
        max-height: none;
        height: 100%;
        border-radius: 0;
      }
      .filters {
        grid-template-columns: 1fr;
      }
      .light-row {
        padding-inline: 16px;
      }
      footer {
        padding-inline: 16px;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this._boundKeydown);
    void this._load();
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._boundKeydown);
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    this.renderRoot.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (!(changed.has('hass') || changed.has('groupEntityId'))) return;
    if (!this.hass || !this.groupEntityId || this._loadInFlight) return;
    // A different group invalidates any prior load and its error latch.
    if (changed.has('groupEntityId')) {
      this._loaded = false;
      this._error = null;
      this._lastLoadStatesRef = null;
    }
    if (this._loaded) return;
    // After a completed attempt, don't re-run on every hass tick. Retry at most
    // once per new hass.states object (matching the sibling panel's guard) so a
    // failing backend can't spin _load() in a tight loop for the dialog's life.
    if (this._lastLoadStatesRef !== null && this._lastLoadStatesRef === this.hass.states) {
      return;
    }
    void this._load();
  }

  private async _load(): Promise<void> {
    if (!this.hass || !this.groupEntityId || this._loadInFlight) return;
    this._loadInFlight = true;
    this._loading = true;
    this._error = null;
    try {
      const result = await this.hass.callWS<CandidateResponse>({
        type: 'lightener/list_candidate_lights',
        entity_id: this.groupEntityId,
      });
      // A backend that predates this command (stale integration behind a fresh
      // frontend) can answer with an empty/malformed object. Surface that as a
      // load error instead of crashing render on undefined.filter.
      if (
        !Array.isArray(result?.lights) ||
        !Array.isArray(result?.observed_controlled_entity_ids)
      ) {
        throw new Error(UI.membership.loadError);
      }
      this._lights = result.lights;
      this._observed = result.observed_controlled_entity_ids;
      this._selected = new Set(result.observed_controlled_entity_ids);
      this._loaded = true;
    } catch (error) {
      this._error = this._errorMessage(error, UI.membership.loadError);
    } finally {
      this._loadInFlight = false;
      this._loading = false;
      // Record the states object this attempt ran against so updated() retries
      // only when a genuinely new hass.states arrives, not on every tick.
      this._lastLoadStatesRef = this.hass?.states ?? null;
    }
  }

  private _errorMessage(error: unknown, fallback: string): string {
    const value = error as { code?: string; message?: string } | null;
    if (value?.code === 'conflict') return UI.membership.conflictError;
    if (value?.code === 'rollback_reload_failed') {
      return UI.membership.rollbackError;
    }
    return value?.message || fallback;
  }

  private get _visibleLights(): CandidateLight[] {
    const query = this._search.trim().toLocaleLowerCase();
    const language = this.hass?.locale?.language;
    const collator = new Intl.Collator(language, { sensitivity: 'base', numeric: true });
    return this._lights
      .filter((light) => !this._areaId || light.area_id === this._areaId)
      .filter(
        (light) =>
          !query ||
          light.name.toLocaleLowerCase().includes(query) ||
          light.entity_id.toLocaleLowerCase().includes(query)
      )
      .sort((a, b) => collator.compare(a.name, b.name) || a.entity_id.localeCompare(b.entity_id));
  }

  private get _areas(): Array<{ id: string; name: string }> {
    const seen = new Map<string, string>();
    for (const light of this._lights) {
      if (light.area_id && light.area_name) seen.set(light.area_id, light.area_name);
    }
    const collator = new Intl.Collator(this.hass?.locale?.language, { sensitivity: 'base' });
    return [...seen]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }

  private get _hasChanges(): boolean {
    return (
      this._selected.size !== this._observed.length ||
      this._observed.some((entityId) => !this._selected.has(entityId))
    );
  }

  private _toggle(entityId: string): void {
    if (this._applying) return;
    const next = new Set(this._selected);
    if (next.has(entityId)) next.delete(entityId);
    else next.add(entityId);
    this._selected = next;
    this._error = null;
  }

  private _close(): void {
    if (this._applying) return;
    this.dispatchEvent(new CustomEvent('membership-close', { bubbles: true, composed: true }));
  }

  private async _apply(): Promise<void> {
    if (!this.hass || !this.groupEntityId || this._applying) return;
    if (this._selected.size === 0) {
      this._error = UI.membership.emptyError;
      return;
    }
    if (!this._hasChanges) return;
    this._applying = true;
    this._error = null;
    try {
      const observed = new Set(this._observed);
      const controlled = this._observed.filter((entityId) => this._selected.has(entityId));
      controlled.push(
        ...this._lights
          .map((light) => light.entity_id)
          .filter((entityId) => this._selected.has(entityId) && !observed.has(entityId))
      );
      const result = await this.hass.callWS<MembershipResponse>({
        type: 'lightener/set_controlled_lights',
        entity_id: this.groupEntityId,
        controlled_entity_ids: controlled,
        observed_controlled_entity_ids: this._observed,
      });
      this.dispatchEvent(
        new CustomEvent('membership-applied', {
          detail: result,
          bubbles: true,
          composed: true,
        })
      );
    } catch (error) {
      this._error = this._errorMessage(error, UI.membership.applyError);
      await this.updateComplete;
      this.renderRoot.querySelector<HTMLElement>('.error')?.focus();
    } finally {
      this._applying = false;
    }
  }

  private _onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (!this._applying) {
        event.preventDefault();
        event.stopPropagation();
        this._close();
      }
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [
      ...this.renderRoot.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled)'
      ),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.shadowRoot?.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.shadowRoot?.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  render() {
    const visible = this._visibleLights;
    return html`
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-title"
        @click=${(event: Event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="membership-title">${UI.membership.title}</h2>
            <p>${UI.membership.subtitle}</p>
          </div>
          <button
            class="close"
            type="button"
            aria-label=${UI.membership.close}
            ?disabled=${this._applying}
            @click=${this._close}
          >
            ×
          </button>
        </header>
        <div class="filters">
          <input
            type="search"
            aria-label=${UI.membership.search}
            placeholder=${UI.membership.search}
            .value=${this._search}
            ?disabled=${this._loading || this._applying}
            @input=${(event: Event) => (this._search = (event.target as HTMLInputElement).value)}
          />
          <select
            aria-label=${UI.membership.areaFilter}
            .value=${this._areaId}
            ?disabled=${this._loading || this._applying}
            @change=${(event: Event) => (this._areaId = (event.target as HTMLSelectElement).value)}
          >
            <option value="">${UI.membership.allAreas}</option>
            ${this._areas.map((area) => html`<option value=${area.id}>${area.name}</option>`)}
          </select>
        </div>
        <div class="list" aria-busy=${this._loading ? 'true' : 'false'}>
          ${this._loading
            ? html`<div class="loading" role="status">${UI.membership.loading}</div>`
            : visible.length === 0
              ? html`<div class="empty">${UI.membership.empty}</div>`
              : visible.map(
                  (light) => html`
                    <label class="light-row ${light.available ? '' : 'unavailable'}">
                      <input
                        type="checkbox"
                        .checked=${this._selected.has(light.entity_id)}
                        ?disabled=${this._applying}
                        @change=${() => this._toggle(light.entity_id)}
                      />
                      <span>
                        <span class="name">${light.name}</span>
                        <span class="entity-id"
                          >${light.entity_id}${light.available
                            ? ''
                            : ` · ${UI.membership.unavailable}`}</span
                        >
                      </span>
                      ${light.area_name
                        ? html`<span class="area">${light.area_name}</span>`
                        : nothing}
                    </label>
                  `
                )}
        </div>
        <footer>
          ${this._error
            ? html`<div class="error" role="alert" aria-live="assertive" tabindex="-1">
                ${this._error}
              </div>`
            : nothing}
          <span class="count">${UI.membership.selectedCount(this._selected.size)}</span>
          <button class="action" type="button" ?disabled=${this._applying} @click=${this._close}>
            ${UI.membership.cancel}
          </button>
          <button
            class="action primary"
            type="button"
            ?disabled=${this._loading ||
            this._applying ||
            this._selected.size === 0 ||
            !this._hasChanges}
            @click=${this._apply}
          >
            ${this._applying ? UI.membership.applying : UI.membership.apply}
          </button>
        </footer>
      </section>
    `;
  }
}

safeDefine('light-membership-dialog', LightMembershipDialog);
