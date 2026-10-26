import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import {
  MEMBERSHIP_ERROR_DISABLED_ENTITY,
  normalizeCandidateResponse,
  sortCandidatesAtDialogOpen,
  type CandidateMetadataMode,
} from '../utils/candidate-lights.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';
import type { CandidateLight, Hass, MembershipResponse } from '../utils/types.js';

interface AreaOption {
  id: string;
  name: string;
}

/** The single filtered pass the dialog renders from. */
interface CandidateView {
  visible: CandidateLight[];
  /** Selected lights among `visible` — drives the "N of M selected shown" copy. */
  visibleSelected: number;
  /** Scope-matching lights hidden purely because they are hidden/disabled. */
  exceptionalCount: number;
}

export class LightMembershipDialog extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @property({ type: String }) groupEntityId = '';
  /** Host's document reservation guard, rechecked at the actual mutation boundary. */
  @property({ attribute: false }) beginApply:
    | ((ids: readonly string[]) => (() => void) | null)
    | null = null;

  @state() private _lights: CandidateLight[] = [];
  @state() private _observedOrder: string[] = [];
  @state() private _pendingSelectedIds = new Set<string>();
  @state() private _metadataMode: CandidateMetadataMode = 'legacy';
  @state() private _search = '';
  @state() private _areaId = '';
  @state() private _currentGroupOnly = false;
  @state() private _showExceptional = false;
  @state() private _loading = true;
  @state() private _applying = false;
  @state() private _loadError: string | null = null;
  @state() private _applyError: string | null = null;
  @state() private _applyErrorCode: string | null = null;
  @state() private _announcedResultSummary = '';

  private _initialMemberIds = new Set<string>();
  private _candidateOrder: string[] = [];
  private _loadInFlight = false;
  private _loaded = false;
  private _loadSerial = 0;
  private _metadataWarningEmitted = false;
  private _resultAnnouncementTimer: ReturnType<typeof setTimeout> | null = null;
  // Area options and the collator only change when _lights does, i.e. once per
  // dialog open — never per render.
  private _areaOptions: AreaOption[] = [];

  private _boundKeydown = (event: KeyboardEvent) => this._onKeydown(event);
  private static readonly RESULT_ANNOUNCEMENT_DELAY_MS = 250;

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
      grid-template-rows: auto auto minmax(96px, 1fr) auto;
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
    .group-name {
      color: var(--primary-text-color, #20252a);
      font-weight: 650;
    }
    .close {
      width: 44px;
      height: 44px;
      margin: -3px -5px -3px auto;
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
    .controls {
      display: grid;
      gap: 10px;
      padding: 14px 22px;
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(150px, 0.45fr);
      gap: 10px;
    }
    .field {
      display: grid;
      gap: 5px;
      min-width: 0;
    }
    .field-label {
      color: var(--secondary-text-color, #66717b);
      font-size: 12px;
      font-weight: 650;
    }
    input[type='search'],
    select {
      width: 100%;
      height: 44px;
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
    .scope-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 18px;
    }
    .scope-option {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      box-sizing: border-box;
      color: var(--primary-text-color, #20252a);
      font-size: 13px;
      cursor: pointer;
    }
    .scope-option input,
    .light-row input {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      accent-color: var(--primary-color, #1590ad);
    }
    .result-summary {
      min-height: 18px;
      color: var(--secondary-text-color, #66717b);
      font-size: 12px;
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
    .light-row:hover:not(.new-disabled) {
      background: color-mix(in srgb, var(--primary-color, #1590ad) 6%, transparent);
    }
    .light-row.new-disabled {
      cursor: default;
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
    .empty-copy,
    .loading-copy {
      color: var(--secondary-text-color, #66717b);
      font-size: 12px;
    }
    .area {
      max-width: 150px;
      text-align: right;
    }
    .state-message {
      min-height: 96px;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 12px;
      padding: 24px 22px;
      box-sizing: border-box;
      text-align: center;
    }
    .skeletons {
      width: min(320px, 80vw);
      display: grid;
      gap: 8px;
    }
    .skeleton {
      height: 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--secondary-text-color, #66717b) 14%, transparent);
    }
    .skeleton:nth-child(2) {
      width: 84%;
    }
    .skeleton:nth-child(3) {
      width: 70%;
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
      color: var(--error-color, #b3261e);
      font-size: 13px;
    }
    footer .error {
      flex-basis: 100%;
      margin-bottom: 4px;
    }
    .action {
      min-height: 44px;
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
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
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
      header {
        padding-top: calc(17px + env(safe-area-inset-top));
      }
      .filters {
        grid-template-columns: 1fr;
      }
      .scope-option {
        width: 100%;
      }
      .light-row {
        grid-template-columns: 24px minmax(0, 1fr);
        padding-inline: 16px;
      }
      .area {
        grid-column: 2;
        max-width: none;
        text-align: left;
      }
      footer {
        padding-right: calc(16px + env(safe-area-inset-right));
        padding-bottom: calc(14px + env(safe-area-inset-bottom));
        padding-left: calc(16px + env(safe-area-inset-left));
      }
      .count {
        flex-basis: 100%;
      }
    }
    @media (max-height: 420px) {
      header {
        padding-block: 10px 8px;
      }
      header p {
        margin-top: 3px;
      }
      .controls {
        gap: 4px;
        padding-block: 7px;
      }
      footer {
        padding-block: 7px;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('keydown', this._boundKeydown);
    if (this.hasUpdated) this._loadIfReady();
  }

  disconnectedCallback(): void {
    this._loadSerial += 1;
    this._loadInFlight = false;
    if (!this._loaded) this._loading = false;
    this._clearResultAnnouncementTimer();
    document.removeEventListener('keydown', this._boundKeydown);
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    const loadError = this.renderRoot.querySelector<HTMLElement>('.load-error');
    if (loadError) {
      loadError.focus();
      return;
    }
    const search = this.renderRoot.querySelector<HTMLInputElement>('#membership-search');
    if (search && !search.disabled) {
      search.focus();
    } else {
      this.renderRoot.querySelector<HTMLElement>('#membership-title')?.focus();
    }
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    const groupChanged =
      changed.has('groupEntityId') && changed.get('groupEntityId') !== this.groupEntityId;
    const inputBecameUnavailable =
      (changed.has('hass') && !this.hass) || (changed.has('groupEntityId') && !this.groupEntityId);
    if (groupChanged || inputBecameUnavailable) {
      this._resetForGroup();
    }
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('hass') || changed.has('groupEntityId')) {
      this._loadIfReady();
    }

    if (
      changed.has('_lights') ||
      changed.has('_pendingSelectedIds') ||
      changed.has('_search') ||
      changed.has('_areaId') ||
      changed.has('_currentGroupOnly') ||
      changed.has('_showExceptional') ||
      changed.has('_loaded') ||
      changed.has('_loadError')
    ) {
      this._scheduleResultAnnouncement();
    }
  }

  private _resetForGroup(): void {
    this._loadSerial += 1;
    this._loadInFlight = false;
    this._loaded = false;
    this._lights = [];
    this._observedOrder = [];
    this._initialMemberIds = new Set();
    this._pendingSelectedIds = new Set();
    this._candidateOrder = [];
    this._areaOptions = [];
    this._metadataMode = 'legacy';
    this._search = '';
    this._areaId = '';
    this._currentGroupOnly = false;
    this._showExceptional = false;
    this._loading = true;
    this._applying = false;
    this._loadError = null;
    this._applyError = null;
    this._applyErrorCode = null;
    this._announcedResultSummary = '';
    this._clearResultAnnouncementTimer();
    if (!this.hass || !this.groupEntityId) this._loading = false;
  }

  private _loadIfReady(): void {
    if (
      !this.isConnected ||
      !this.hass ||
      !this.groupEntityId ||
      this._loadInFlight ||
      this._loaded ||
      this._loadError
    ) {
      return;
    }
    void this._load();
  }

  private async _load(): Promise<void> {
    if (!this.hass || !this.groupEntityId || this._loadInFlight) return;

    const hass = this.hass;
    const groupEntityId = this.groupEntityId;
    const serial = ++this._loadSerial;
    this._loadInFlight = true;
    this._loading = true;
    this._loadError = null;
    this._applyError = null;
    this._applyErrorCode = null;

    try {
      let rawResponse: unknown;
      try {
        rawResponse = await hass.callWS<unknown>({
          type: 'lightener/list_candidate_lights',
          entity_id: groupEntityId,
        });
      } catch (error) {
        if (serial === this._loadSerial && groupEntityId === this.groupEntityId) {
          this._setLoadFailure(error, 'request');
        }
        return;
      }
      if (serial !== this._loadSerial || groupEntityId !== this.groupEntityId) return;

      let response;
      try {
        response = normalizeCandidateResponse(rawResponse);
      } catch (error) {
        if (serial === this._loadSerial && groupEntityId === this.groupEntityId) {
          this._setLoadFailure(error, 'response');
        }
        return;
      }

      if (response.metadataWarning && !this._metadataWarningEmitted) {
        this._metadataWarningEmitted = true;
        console.warn(response.metadataWarning);
      }

      this._initialMemberIds = new Set(response.observedControlledEntityIds);
      this._candidateOrder = response.lights.map((light) => light.entity_id);
      this._lights = sortCandidatesAtDialogOpen(
        response.lights,
        this._initialMemberIds,
        hass.locale?.language
      );
      this._observedOrder = response.observedControlledEntityIds;
      this._pendingSelectedIds = new Set(response.observedControlledEntityIds);
      this._metadataMode = response.metadataMode;
      this._rebuildAreaOptions();
      this._loaded = true;
      this._loadError = null;
      this._loading = false;

      this._afterNextRender('focus the loaded membership dialog', () => {
        if (serial !== this._loadSerial || groupEntityId !== this.groupEntityId) return;
        const heading = this.renderRoot.querySelector<HTMLElement>('#membership-title');
        const active = this.shadowRoot?.activeElement ?? null;
        if (active === null || active === heading) {
          this._focusOrHeading(
            this.renderRoot.querySelector<HTMLInputElement>('#membership-search')
          );
        }
      });
    } catch (error) {
      if (serial === this._loadSerial && groupEntityId === this.groupEntityId) {
        this._setLoadFailure(error, 'process');
      }
    } finally {
      if (serial === this._loadSerial) {
        this._loadInFlight = false;
        this._loading = false;
      }
    }
  }

  private _setLoadFailure(error: unknown, stage: 'request' | 'response' | 'process'): void {
    console.error(`[Lightener] Failed to ${stage} candidate lights:`, error);
    this._loaded = false;
    this._loadError = UI.membership.loadError;
    this._loading = false;
    this._afterNextRender('focus the membership load error', () => {
      this._focusOrHeading(this.renderRoot.querySelector<HTMLElement>('.load-error'));
    });
  }

  private _afterNextRender(context: string, action: () => void): void {
    void this.updateComplete.then(action).catch((error: unknown) => {
      console.error(`[Lightener] Failed to ${context}:`, error);
    });
  }

  private _retryLoad(): void {
    if (this._loadInFlight || this._applying || !this._loadError) return;
    this._loaded = false;
    this._loadError = null;
    this._loadIfReady();
  }

  private _errorMessage(error: unknown, fallback: string): string {
    const value = error as { code?: unknown } | null;
    if (value?.code === 'conflict') return UI.membership.conflictError;
    if (value?.code === MEMBERSHIP_ERROR_DISABLED_ENTITY) {
      return UI.membership.disabledError;
    }
    if (value?.code === 'reload_failed') return UI.membership.reloadError;
    if (value?.code === 'rollback_reload_failed') return UI.membership.rollbackError;
    if (value?.code === 'preview_active') return UI.restoration.membershipBlocked;
    return fallback;
  }

  private get _groupName(): string {
    return this.hass?.states[this.groupEntityId]?.attributes.friendly_name ?? this.groupEntityId;
  }

  private _isExceptional(light: CandidateLight): boolean {
    return this._metadataMode === 'v1' && (light.hidden || light.disabled);
  }

  private _matchesSearchAndArea(light: CandidateLight, query: string): boolean {
    if (this._areaId && light.area_id !== this._areaId) return false;
    if (
      query &&
      !light.name.toLocaleLowerCase().includes(query) &&
      !light.entity_id.toLocaleLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  }

  private _matchesScopeAndDiscovery(light: CandidateLight, query: string): boolean {
    return (
      (!this._currentGroupOnly || this._initialMemberIds.has(light.entity_id)) &&
      this._matchesSearchAndArea(light, query)
    );
  }

  private _isSuppressedExceptional(light: CandidateLight): boolean {
    return (
      this._isExceptional(light) &&
      !this._initialMemberIds.has(light.entity_id) &&
      !this._pendingSelectedIds.has(light.entity_id)
    );
  }

  /**
   * Filter, count the visible selection, and count the suppressed exceptional
   * rows in ONE pass. Callers compute this once per update cycle and thread the
   * result down rather than re-deriving it per consumer.
   *
   * Deliberately NOT memoized. Benchmarked at 1,000 candidates the filter pass
   * is not the cost — DOM commit of the rows is — so a cache here would buy no
   * measurable time while adding an invalidation invariant that has to stay in
   * lockstep with every filter input. Two honest passes beat five, and beat a
   * cache nobody can see go stale.
   *
   * The query IS normalized once here rather than inside the per-light
   * predicate, which previously re-ran `trim().toLocaleLowerCase()` per light.
   */
  private _computeView(): CandidateView {
    const query = this._search.trim().toLocaleLowerCase();
    const visible: CandidateLight[] = [];
    let visibleSelected = 0;
    let exceptionalCount = 0;
    for (const light of this._lights) {
      if (!this._matchesScopeAndDiscovery(light, query)) continue;
      // `_isSuppressedExceptional` is v1-gated via `_isExceptional`, so this
      // stays 0 in legacy mode without a second guard.
      const suppressed = this._isSuppressedExceptional(light);
      if (suppressed) exceptionalCount += 1;
      if (this._showExceptional || !suppressed) {
        visible.push(light);
        if (this._pendingSelectedIds.has(light.entity_id)) visibleSelected += 1;
      }
    }
    return { visible, visibleSelected, exceptionalCount };
  }

  /** Area options, computed once per load in `_rebuildAreaOptions`. */
  private get _areas(): AreaOption[] {
    return this._areaOptions;
  }

  private _rebuildAreaOptions(): void {
    const seen = new Map<string, string>();
    for (const light of this._lights) {
      if (light.area_id && light.area_name) seen.set(light.area_id, light.area_name);
    }
    const collator = new Intl.Collator(this.hass?.locale?.language, {
      sensitivity: 'base',
    });
    this._areaOptions = [...seen]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => collator.compare(left.name, right.name));
  }

  private get _hasChanges(): boolean {
    return (
      this._pendingSelectedIds.size !== this._observedOrder.length ||
      this._observedOrder.some((entityId) => !this._pendingSelectedIds.has(entityId))
    );
  }

  private get _applyBlockedByConflict(): boolean {
    return this._applyErrorCode === 'conflict';
  }

  private _statuses(light: CandidateLight): string[] {
    const statuses: string[] = [];
    if (light.hidden) statuses.push(UI.membership.hidden);
    if (light.disabled) statuses.push(UI.membership.disabled);
    if (light.missing) {
      statuses.push(UI.membership.missing);
    } else if (!light.available && !light.disabled) {
      statuses.push(UI.membership.unavailable);
    }
    return statuses;
  }

  private _isNewDisabled(light: CandidateLight): boolean {
    return light.disabled && !this._initialMemberIds.has(light.entity_id);
  }

  private _toggle(light: CandidateLight): void {
    if (this._applying || this._isNewDisabled(light)) return;
    const next = new Set(this._pendingSelectedIds);
    const wasSelected = next.has(light.entity_id);
    if (wasSelected) next.delete(light.entity_id);
    else next.add(light.entity_id);
    const willDisappear =
      wasSelected &&
      !this._showExceptional &&
      this._isExceptional(light) &&
      !this._initialMemberIds.has(light.entity_id);
    this._pendingSelectedIds = next;
    if (!this._applyBlockedByConflict) {
      this._applyError = null;
      this._applyErrorCode = null;
    }
    if (willDisappear) {
      this._afterNextRender('restore focus after hiding an exceptional light', () => {
        this._focusOrHeading(
          this.renderRoot.querySelector<HTMLInputElement>('.exceptional-filter')
        );
      });
    }
  }

  private _clearSearchAndArea(): void {
    this._search = '';
    this._areaId = '';
    this._afterNextRender('restore focus after clearing membership filters', () => {
      this._focusOrHeading(this.renderRoot.querySelector<HTMLInputElement>('#membership-search'));
    });
  }

  private _showAllLights(): void {
    this._currentGroupOnly = false;
    this._afterNextRender('restore focus after showing all lights', () => {
      this._focusOrHeading(
        this.renderRoot.querySelector<HTMLInputElement>('.light-row input:not(:disabled)')
      );
    });
  }

  private _revealExceptional(): void {
    const query = this._search.trim().toLocaleLowerCase();
    const firstRevealed = this._lights.find(
      (light) =>
        this._matchesScopeAndDiscovery(light, query) && this._isSuppressedExceptional(light)
    )?.entity_id;
    this._showExceptional = true;
    this._afterNextRender('restore focus after revealing exceptional lights', () => {
      const target = firstRevealed
        ? [...this.renderRoot.querySelectorAll<HTMLInputElement>('input[data-entity-id]')].find(
            (input) => input.dataset.entityId === firstRevealed && !input.disabled
          )
        : null;
      this._focusOrHeading(target ?? null);
    });
  }

  private _focusOrHeading(target: HTMLElement | null): void {
    if (target && !target.matches(':disabled')) {
      target.focus();
      if (this.shadowRoot?.activeElement === target) return;
    }
    this.renderRoot.querySelector<HTMLElement>('#membership-title')?.focus();
  }

  private _clearResultAnnouncementTimer(): void {
    if (this._resultAnnouncementTimer === null) return;
    clearTimeout(this._resultAnnouncementTimer);
    this._resultAnnouncementTimer = null;
  }

  private _scheduleResultAnnouncement(): void {
    this._clearResultAnnouncementTimer();
    if (!this._loaded || this._loadError) {
      this._announcedResultSummary = '';
      return;
    }
    const { visible, visibleSelected } = this._computeView();
    const summary = UI.membership.resultSummary(
      visible.length,
      visibleSelected,
      this._pendingSelectedIds.size
    );
    this._resultAnnouncementTimer = setTimeout(() => {
      this._resultAnnouncementTimer = null;
      if (this.isConnected && this._loaded && !this._loadError) {
        this._announcedResultSummary = summary;
      }
    }, LightMembershipDialog.RESULT_ANNOUNCEMENT_DELAY_MS);
  }

  private _close(): void {
    if (this._applying) return;
    this.dispatchEvent(new CustomEvent('membership-close', { bubbles: true, composed: true }));
  }

  private async _apply(): Promise<void> {
    if (
      !this.hass ||
      !this.groupEntityId ||
      this._applying ||
      this._loading ||
      this._applyBlockedByConflict
    ) {
      return;
    }
    if (this._pendingSelectedIds.size === 0) {
      this._applyError = UI.membership.emptyError;
      this._afterNextRender('focus the empty membership error', () => {
        this._focusOrHeading(this.renderRoot.querySelector<HTMLElement>('.apply-error'));
      });
      return;
    }
    if (!this._hasChanges) return;

    this._applying = true;
    this._applyError = null;
    this._applyErrorCode = null;
    const group = this.groupEntityId,
      user = this.hass.user.id,
      serial = this._loadSerial;
    let failed = false;
    let settleReservation: (() => void) | null = null;
    let safeDisposition = false;
    try {
      const observed = new Set(this._observedOrder);
      const controlled = this._observedOrder.filter((entityId) =>
        this._pendingSelectedIds.has(entityId)
      );
      controlled.push(
        ...this._candidateOrder.filter(
          (entityId) => this._pendingSelectedIds.has(entityId) && !observed.has(entityId)
        )
      );
      if (this.beginApply) {
        settleReservation = this.beginApply([...this._observedOrder, ...controlled]);
        if (!settleReservation) {
          throw { code: 'preview_active' };
        }
      }
      const result = await this.hass.callWS<MembershipResponse>({
        type: 'lightener/set_controlled_lights',
        entity_id: this.groupEntityId,
        controlled_entity_ids: controlled,
        observed_controlled_entity_ids: this._observedOrder,
      });
      safeDisposition =
        !!result &&
        !!result.entities &&
        Array.isArray(result.added_entity_ids) &&
        Array.isArray(result.removed_entity_ids);
      if (settleReservation && !safeDisposition) throw new Error(UI.membership.applyError);
      if (
        !this.isConnected ||
        group !== this.groupEntityId ||
        user !== this.hass?.user.id ||
        serial !== this._loadSerial
      )
        return;
      this.dispatchEvent(
        new CustomEvent('membership-applied', {
          detail: result,
          bubbles: true,
          composed: true,
        })
      );
    } catch (error) {
      failed = true;
      this._applyErrorCode =
        typeof (error as { code?: unknown } | null)?.code === 'string'
          ? ((error as { code: string }).code ?? null)
          : null;
      this._applyError = this._errorMessage(error, UI.membership.applyError);
      // Only validation refusals proven before mutation release this lease.
      // Runtime/rollback errors and transport failures retain the safety barrier.
      safeDisposition = new Set([
        'empty_selection',
        'too_many',
        'duplicate',
        'self_reference',
        'not_a_light',
        'recursive_lightener',
        'disabled_entity',
        'conflict',
        'invalid_format',
        'unauthorized',
      ]).has(this._applyErrorCode ?? '');
    } finally {
      if (safeDisposition) settleReservation?.();
      this._applying = false;
    }
    if (failed) {
      this._afterNextRender('focus the membership update error', () => {
        this._focusOrHeading(this.renderRoot.querySelector<HTMLElement>('.apply-error'));
      });
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
    if (focusable.length === 0) {
      event.preventDefault();
      this.renderRoot.querySelector<HTMLElement>('#membership-title')?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.shadowRoot?.activeElement ?? null;
    if (!focusable.includes(active as HTMLElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private _renderEmptyState(view: CandidateView): TemplateResult {
    if (this._lights.length === 0) {
      return html`<div class="state-message">
        <div class="empty-copy">${UI.membership.sourceEmpty}</div>
      </div>`;
    }
    // Suppressed rows are only "hidden by this filter" while the reveal
    // toggle is off; with it on they are already in `visible`.
    const hiddenByExceptionalFilter = this._showExceptional ? 0 : view.exceptionalCount;
    if (hiddenByExceptionalFilter > 0) {
      return html`<div class="state-message">
        <div class="empty-copy">${UI.membership.exceptionalEmpty(hiddenByExceptionalFilter)}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._revealExceptional}
        >
          ${UI.membership.showExceptionalAction}
        </button>
      </div>`;
    }
    if (this._search.trim() || this._areaId) {
      return html`<div class="state-message">
        <div class="empty-copy">${UI.membership.filterEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._clearSearchAndArea}
        >
          ${UI.membership.clearFilters}
        </button>
      </div>`;
    }
    if (this._currentGroupOnly) {
      return html`<div class="state-message">
        <div class="empty-copy">${UI.membership.scopeEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._showAllLights}
        >
          ${UI.membership.showAllLights}
        </button>
      </div>`;
    }
    return html`<div class="state-message">
      <div class="empty-copy">${UI.membership.filterEmpty}</div>
    </div>`;
  }

  private _renderList(view: CandidateView): TemplateResult {
    if (this._loading) {
      return html`<div class="state-message" role="status" aria-live="polite">
        <div class="loading-copy">${UI.membership.loading}</div>
        <div class="skeletons" aria-hidden="true">
          <div class="skeleton"></div>
          <div class="skeleton"></div>
          <div class="skeleton"></div>
        </div>
      </div>`;
    }
    if (this._loadError) {
      return html`<div class="state-message">
        <div class="error load-error" role="alert" aria-live="assertive" tabindex="-1">
          ${this._loadError}
        </div>
        <button class="action" type="button" @click=${this._retryLoad}>
          ${UI.membership.tryAgain}
        </button>
      </div>`;
    }

    const { visible } = view;
    if (visible.length === 0) return this._renderEmptyState(view);

    return html`${repeat(
      visible,
      (light) => light.entity_id,
      (light) => {
        const statuses = this._statuses(light);
        const metadataId = `membership-light-meta-${light.entity_id.replace(
          /[^a-zA-Z0-9_-]/g,
          '-'
        )}`;
        const newDisabled = this._isNewDisabled(light);
        return html`
          <label class="light-row ${newDisabled ? 'new-disabled' : ''}">
            <input
              type="checkbox"
              data-entity-id=${light.entity_id}
              .checked=${this._pendingSelectedIds.has(light.entity_id)}
              ?disabled=${this._applying || newDisabled}
              aria-label=${UI.membership.lightCheckboxLabel(light.name, statuses)}
              aria-describedby=${metadataId}
              @change=${() => this._toggle(light)}
            />
            <span>
              <span class="name">${light.name}</span>
              <span class="entity-id"
                ><span id=${metadataId}>${light.entity_id}</span>${statuses.length > 0
                  ? ` · ${statuses.join(' · ')}`
                  : ''}</span
              >
            </span>
            ${light.area_name ? html`<span class="area">${light.area_name}</span>` : nothing}
          </label>
        `;
      }
    )}`;
  }

  render() {
    const view = this._computeView();
    const { visible, visibleSelected } = view;
    const disabled = this._loading || this._applying || !this._loaded;
    const zeroSelection = this._loaded && this._pendingSelectedIds.size === 0;

    return html`
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-title"
        aria-describedby="membership-context"
        aria-busy=${this._applying ? 'true' : 'false'}
        @click=${(event: Event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="membership-title" tabindex="-1">${UI.membership.title}</h2>
            <p id="membership-context">
              <span class="group-name">${this._groupName}</span>
              <span aria-hidden="true"> · </span>${UI.membership.subtitle}
            </p>
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

        <div class="controls">
          <div class="filters">
            <label class="field">
              <span class="field-label">${UI.membership.search}</span>
              <input
                id="membership-search"
                type="search"
                placeholder=${UI.membership.searchPlaceholder}
                .value=${this._search}
                ?disabled=${disabled}
                @input=${(event: Event) => {
                  this._search = (event.target as HTMLInputElement).value;
                }}
              />
            </label>
            <label class="field">
              <span class="field-label">${UI.membership.areaFilter}</span>
              <select
                .value=${this._areaId}
                ?disabled=${disabled}
                @change=${(event: Event) => {
                  this._areaId = (event.target as HTMLSelectElement).value;
                }}
              >
                <option value="">${UI.membership.allAreas}</option>
                ${this._areas.map((area) => html`<option value=${area.id}>${area.name}</option>`)}
              </select>
            </label>
          </div>

          <div class="scope-filters">
            ${this._loaded
              ? html`<label class="scope-option">
                  <input
                    class="current-group-filter"
                    type="checkbox"
                    .checked=${this._currentGroupOnly}
                    ?disabled=${disabled}
                    @change=${(event: Event) => {
                      this._currentGroupOnly = (event.target as HTMLInputElement).checked;
                    }}
                  />
                  <span>${UI.membership.currentGroupOnly(this._initialMemberIds.size)}</span>
                </label>`
              : nothing}
            ${this._loaded && this._metadataMode === 'v1'
              ? html`<label class="scope-option">
                  <input
                    class="exceptional-filter"
                    type="checkbox"
                    .checked=${this._showExceptional}
                    ?disabled=${disabled}
                    @change=${(event: Event) => {
                      this._showExceptional = (event.target as HTMLInputElement).checked;
                    }}
                  />
                  <span>${UI.membership.showExceptional(view.exceptionalCount)}</span>
                </label>`
              : nothing}
          </div>

          ${this._loaded && !this._loadError
            ? html`<div class="result-summary">
                  ${UI.membership.resultSummary(
                    visible.length,
                    visibleSelected,
                    this._pendingSelectedIds.size
                  )}
                </div>
                <span
                  class="sr-only result-announcement"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  >${this._announcedResultSummary}</span
                >`
            : html`<div class="result-summary" aria-hidden="true"></div>`}
        </div>

        <div
          class="list"
          role="region"
          aria-label=${UI.membership.candidateList}
          aria-busy=${this._loading ? 'true' : 'false'}
        >
          ${this._renderList(view)}
        </div>

        <footer>
          ${this._applyError
            ? html`<div class="error apply-error" role="alert" aria-live="assertive" tabindex="-1">
                ${this._applyError}
              </div>`
            : zeroSelection
              ? html`<div class="error selection-error" role="status">
                  ${UI.membership.emptyError}
                </div>`
              : nothing}
          ${this._applying
            ? html`<span class="sr-only applying-status" role="status" aria-live="polite"
                >${UI.membership.applyingStatus}</span
              >`
            : nothing}
          <span class="count">${UI.membership.selectedCount(this._pendingSelectedIds.size)}</span>
          <button class="action" type="button" ?disabled=${this._applying} @click=${this._close}>
            ${UI.membership.cancel}
          </button>
          <button
            class="action primary"
            type="button"
            ?disabled=${disabled ||
            zeroSelection ||
            !this._hasChanges ||
            this._applyBlockedByConflict}
            @click=${this._apply}
          >
            ${this._applying
              ? UI.membership.applying
              : this._applyError && !this._applyBlockedByConflict
                ? UI.membership.tryAgain
                : UI.membership.apply}
          </button>
        </footer>
      </section>
    `;
  }
}

safeDefine('light-membership-dialog', LightMembershipDialog);
