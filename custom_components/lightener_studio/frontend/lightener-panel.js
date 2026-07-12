const CARD_VERSION = "2.16.0";
const CARD_VERSION_GLOBAL = "__LIGHTENER_CURVE_CARD_VERSION__";
const PANEL_VERSION_GLOBAL = "__LIGHTENER_PANEL_CARD_VERSION__";
const CARD_STALE_RELOAD_KEY = "lightener_curve_card_reload_version";
// A hung lightener/list_entities call must not wedge the panel in "loading";
// after this deadline the error + Retry UI takes over.
const ENTITY_LOAD_TIMEOUT_MS = 10000;
// Expose the panel's compiled-in card version for debugging and tests.
window[PANEL_VERSION_GLOBAL] = CARD_VERSION;

class LightenerEditorPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._selectedEntity = null;
    this._pendingEntity = null;
    this._card = null;
    this._cardDirty = false;
    this._switchSaving = false;
    this._cardScriptPromise = null;
    this._lightenerEntities = null;
    this._loadingEntities = false;
    this._loadEntitiesError = null;
    this._lastEntityLoadStatesRef = null;
    // A failed list request can leave a usable editor mounted from hass.states.
    // Keep that fallback terminal until the user retries or HA publishes a new
    // state snapshot; otherwise every hass tick would start another request.
    this._fallbackEntityLoadDeferred = false;
    this._requestedConfigEntryId = null;
    this._handoffToken = null;
    this._handoffResolving = false;
    this._handoffAttempts = 0;
    this._handoffTimer = null;
    this._handoffDeferred = false;
    this._handoffNotice = null;
    this._handoffEntityPending = false;
    this._handoffEntityAttempts = 0;
    this._firstRunEligible = false;
    this._cardMembershipOpen = false;
    this._selectRebuildScheduled = false;
    this._onCardDirtyState = (event) => {
      this._cardDirty = event.detail?.dirty === true;
      if (!this._cardDirty && !this._switchSaving) {
        if (this._pendingEntity) {
          this._setSelectedEntity(this._pendingEntity);
          return;
        }
        this._pendingEntity = null;
      }
      this._renderPendingSwitch();
    };
    this._onGroupDeleted = (event) => {
      const deletedEntityId = event.detail?.entityId;
      this._handleGroupDeleted(deletedEntityId);
    };
    this._onCardMembershipState = (event) => {
      this._cardMembershipOpen = event.detail?.open === true;
      this._render();
    };
    try {
      this._requestedConfigEntryId = new URLSearchParams(window.location.search).get("config_entry");
      this._handoffToken = new URLSearchParams(window.location.search).get("handoff");
    } catch (err) {}
    try {
      // ?action=new lets the cog flow (HA Settings -> Add Integration -> Lightener)
      // hand off into this panel and immediately launch HA's native Add-Integration
      // flow, unifying the two onboarding entry points so users always land in the
      // same native light selector regardless of where they started. Consumed once
      // on first hass set.
      this._pendingAction = new URLSearchParams(window.location.search).get("action");
    } catch (err) {
      this._pendingAction = null;
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._handoffToken) {
      if (!this._handoffDeferred) this._resolveStudioHandoff();
      this._render();
      return;
    }
    if (!this._loadingEntities && this._shouldLoadLightenerEntities(hass)) {
      this._loadLightenerEntities();
    }

    const entities = this._getEditorEntities();

    if (!this._selectedEntity || !entities.some((entity) => entity.entity_id === this._selectedEntity)) {
      let saved = null;
      try { saved = window.localStorage.getItem("lightener_editor_entity"); } catch { /* private browsing */ }
      if (saved && entities.some((entity) => entity.entity_id === saved)) {
        this._selectedEntity = saved;
      } else {
        this._selectedEntity = entities[0]?.entity_id ?? null;
      }
      this._cardDirty = false;
      this._pendingEntity = null;
    }

    this._render();
    this._syncCard();
    this._maybeAutoOpenCreateGroup();
  }

  _maybeAutoOpenCreateGroup() {
    // Consume the ?action=new handoff exactly once — only if the panel can
    // actually launch the native add flow (admin user, no scoped config-entry mode).
    if (this._pendingAction !== "new") return;
    const isAdmin = !!(this._hass?.user?.is_admin);
    if (!isAdmin || this._requestedConfigEntryId) {
      this._pendingAction = null;
      return;
    }
    this._pendingAction = null;
    // Strip ?action=new so a page refresh doesn't re-trigger the handoff. Preserve
    // every other query param (e.g. ?config_entry=X) the panel may rely on. Do this
    // before navigating away so the replaceState doesn't fight the pushState below.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      window.history.replaceState(null, "", url.toString());
    } catch (err) {}
    this._launchNativeAddFlow();
  }

  connectedCallback() {
    this._render();
  }

  disconnectedCallback() {
    this._detachCardListeners();
    if (this._handoffTimer !== null) {
      window.clearTimeout(this._handoffTimer);
      this._handoffTimer = null;
    }
  }

  _stripHandoffQuery() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("handoff");
      window.history.replaceState(null, "", url.toString());
    } catch (err) {}
  }

  async _resolveStudioHandoff() {
    // `set hass` fires on every HA state update, so this can re-enter during a
    // retry's backoff window (token still set, `_handoffResolving` already
    // reset). Bail while a timer is pending so we don't fire an immediate retry
    // that defeats the delay, orphans the pending timeout, and burns the budget.
    if (
      this._handoffResolving ||
      this._handoffTimer !== null ||
      !this._handoffToken ||
      !this._hass?.callWS
    )
      return;
    this._handoffResolving = true;
    const token = this._handoffToken;
    try {
      const result = await this._hass.callWS({
        type: "lightener/resolve_handoff",
        token,
      });
      if (this._handoffToken !== token) return;
      this._requestedConfigEntryId = result.config_entry_id;
      this._firstRunEligible = result.first_run_eligible === true;
      this._handoffToken = null;
      this._handoffAttempts = 0;
      this._handoffDeferred = false;
      this._handoffEntityPending = true;
      this._handoffEntityAttempts = 0;
      this._stripHandoffQuery();
      this._lightenerEntities = null;
      this._loadEntitiesError = null;
    } catch (err) {
      if (this._handoffToken !== token) return;
      const code = err?.code;
      if ([
        "invalid_handoff",
        "forbidden_handoff",
        "expired_handoff",
        "invalid",
        "forbidden",
        "expired",
        "unauthorized",
      ].includes(code)) {
        this._handoffToken = null;
        this._stripHandoffQuery();
        this._requestedConfigEntryId = null;
        this._firstRunEligible = false;
        this._handoffNotice = err?.message || "This Studio handoff is no longer available.";
        this._lightenerEntities = null;
        this._loadEntitiesError = null;
      } else if (this._handoffAttempts < 4) {
        const delays = [250, 500, 1000, 2000];
        const delay = delays[this._handoffAttempts++] ?? 2000;
        this._handoffTimer = window.setTimeout(() => {
          this._handoffTimer = null;
          this._resolveStudioHandoff();
        }, delay);
      } else {
        // Leave the query intact: a refresh can retry after HA finishes setup.
        this._handoffDeferred = true;
        this._loadEntitiesError = "The new group is still starting. Refresh to continue.";
      }
    } finally {
      this._handoffResolving = false;
      if (!this._handoffToken && this._hass) {
        this.hass = this._hass;
      } else {
        this._render();
      }
    }
  }

  _scheduleHandoffEntityRetry() {
    const delays = [250, 500, 1000, 2000];
    if (this._handoffEntityAttempts >= delays.length) {
      this._handoffEntityPending = false;
      this._requestedConfigEntryId = null;
      this._firstRunEligible = false;
      this._handoffNotice = "The new group is still starting. Refresh to look for it again.";
      return false;
    }
    const delay = delays[this._handoffEntityAttempts++];
    this._handoffTimer = window.setTimeout(() => {
      this._handoffTimer = null;
      this._lightenerEntities = null;
      this._loadLightenerEntities();
      this._render();
      this._syncCard();
    }, delay);
    return true;
  }

  _getFallbackEntities() {
    if (!this._hass || !this._hass.states) {
      return [];
    }
    const statesRef = this._hass.states;
    if (this._fallbackEntitiesCache && this._fallbackEntitiesStatesRef === statesRef) {
      return this._fallbackEntitiesCache;
    }
    const result = Object.keys(statesRef)
      .filter((entityId) => entityId.startsWith("light.") && statesRef[entityId]?.attributes?.entity_id)
      .map((entityId) => ({
        entity_id: entityId,
        name: statesRef[entityId].attributes.friendly_name || entityId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    this._fallbackEntitiesCache = result;
    this._fallbackEntitiesStatesRef = statesRef;
    return result;
  }

  _getEditorEntities() {
    if (this._loadEntitiesError) {
      return [];
    }
    if (Array.isArray(this._lightenerEntities)) {
      if (this._requestedConfigEntryId) {
        return this._lightenerEntities.filter((entity) => entity.config_entry_id === this._requestedConfigEntryId);
      }
      return this._lightenerEntities;
    }
    if (this._requestedConfigEntryId) {
      return [];
    }
    return this._getFallbackEntities();
  }

  _shouldLoadLightenerEntities(hass) {
    if (this._lightenerEntities === null) {
      return !this._fallbackEntityLoadDeferred ||
        (!!this._lastEntityLoadStatesRef && this._lastEntityLoadStatesRef !== hass?.states);
    }
    if (!Array.isArray(this._lightenerEntities) || this._lightenerEntities.length !== 0) {
      return false;
    }
    if (this._loadEntitiesError) {
      return false;
    }
    return !!this._lastEntityLoadStatesRef && this._lastEntityLoadStatesRef !== hass?.states;
  }

  // Single source of truth for what the panel body should show. Both the
  // status line (_render) and the #card-mount box (_syncCard) derive from
  // this so they can never contradict each other (e.g. a populated select
  // sitting above a "Loading groups" box).
  _getViewState() {
    if (this._handoffEntityPending) {
      return "loading";
    }
    if (this._getEditorEntities().length && this._selectedEntity) {
      // An editable selection always wins — fallback entities count as ready
      // even while lightener/list_entities is still in flight.
      return "ready";
    }
    if (this._loadEntitiesError) {
      return "error";
    }
    if (this._loadingEntities) {
      return "loading";
    }
    return "empty";
  }

  _getEntityLabel(entityId) {
    const entity = this._getEditorEntities().find((item) => item.entity_id === entityId);
    if (entity) {
      return entity.name;
    }
    return entityId || "this Lightener group";
  }

  async _loadLightenerEntities() {
    if (this._loadingEntities || !this._hass || !this._hass.callWS) {
      return;
    }

    this._loadingEntities = true;
    this._loadEntitiesError = null;
    this._fallbackEntityLoadDeferred = false;
    const requestedStatesRef = this._hass?.states ?? null;
    // Attempt token: only the newest attempt may write state, so a response
    // that arrives after its timeout still applies unless a Retry superseded it.
    const attempt = (this._entityLoadAttempt = (this._entityLoadAttempt || 0) + 1);
    let timeoutId = null;
    const applyResult = (result) => {
      if (this._entityLoadAttempt !== attempt) {
        return false;
      }
      this._lightenerEntities = Array.isArray(result?.entities) ? result.entities : [];
      if (this._handoffEntityPending) {
        const exactEntityReady = this._lightenerEntities.some(
          (entity) => entity.config_entry_id === this._requestedConfigEntryId
        );
        if (exactEntityReady) {
          this._handoffEntityPending = false;
          this._handoffEntityAttempts = 0;
        } else {
          this._scheduleHandoffEntityRetry();
        }
      }
      this._loadEntitiesError = null;
      this._fallbackEntityLoadDeferred = false;
      return true;
    };

    const request = this._hass.callWS({ type: "lightener/list_entities" });
    let requestTimedOut = false;
    try {
      // callWS has no client-side deadline; a hung socket would leave
      // _loadingEntities true forever. Race a timer so the error + Retry UI
      // takes over instead. The timeout is soft: a late success still lands.
      const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(
          () => {
            requestTimedOut = true;
            reject(new Error("lightener/list_entities timed out"));
          },
          ENTITY_LOAD_TIMEOUT_MS
        );
      });
      applyResult(await Promise.race([request, timeout]));
    } catch (err) {
      console.error("[Lightener] Failed to load Lightener groups:", err);
      if (this._entityLoadAttempt === attempt) {
        // Don't tear down a working editor over a slow backend: if the
        // selected group is already served by fallback entities, keep it
        // mounted (the error state would blank _getEditorEntities()).
        const fallback = this._getFallbackEntities();
        const editorAlive =
          this._selectedEntity &&
          fallback.some((entity) => entity.entity_id === this._selectedEntity);
        if (editorAlive) {
          this._fallbackEntityLoadDeferred = true;
        } else {
          this._lightenerEntities = [];
          this._loadEntitiesError = "Could not load Lightener groups. Check the connection and try again.";
        }
      }
      // Soft timeout: when the original request eventually succeeds and no
      // newer attempt superseded it, apply the result and lift the error.
      request.then(
        (result) => {
          if (applyResult(result) && this._hass) {
            this.hass = this._hass;
          }
        },
        (lateError) => {
          // A request that rejects after the soft timeout carries the most
          // useful diagnosis (socket close, auth failure, etc.). The timeout
          // was already logged above, but this second error must stay visible.
          if (requestTimedOut) {
            console.error("[Lightener] Lightener groups request failed after timeout:", lateError);
          }
        },
      );
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      this._lastEntityLoadStatesRef = requestedStatesRef;
      this._loadingEntities = false;
      if (this._hass) {
        this.hass = this._hass;
      }
    }
  }

  async _ensureCardScriptLoaded() {
    const loadedVersion = window[CARD_VERSION_GLOBAL];
    const cardAlreadyRegistered = customElements.get("lightener-curve-card");
    if (cardAlreadyRegistered) {
      if (!CARD_VERSION || loadedVersion === CARD_VERSION) {
        return;
      }
      this._reloadForStaleCard();
      return;
    }
    if (!this._cardScriptPromise) {
      // Single stable, unversioned card URL. The server always serves the current
      // on-disk bundle here (no-cache); the HA frontend service worker
      // (StaleWhileRevalidate) refreshes it in the background after an update, so a
      // new release loads without an HA restart. The card bundle stamps
      // window[CARD_VERSION_GLOBAL] with its real version at eval time.
      const moduleUrl = "/lightener/lightener-curve-card.js";
      this._cardModuleUrl = moduleUrl;
      this._cardScriptPromise = import(/* @vite-ignore */ moduleUrl).catch((err) => {
        // Import failed. Clear the cached promise so the next _syncCard() call
        // retries from scratch rather than permanently re-throwing this rejection.
        this._cardScriptPromise = null;
        throw err;
      });
    }
    await this._cardScriptPromise;
    // If the service worker served a stale cached bundle whose version differs from
    // what this panel was compiled for, reload once so the revalidated fresh bundle
    // takes over — the same guard that runs for a pre-registered class. sync-version
    // keeps the panel's CARD_VERSION and the card bundle's own
    // __LIGHTENER_CURVE_CARD_VERSION__ in lockstep, so a mismatch here only ever
    // means genuine SW staleness, never a false positive on a fresh load.
    if (CARD_VERSION && window[CARD_VERSION_GLOBAL] !== CARD_VERSION) {
      this._reloadForStaleCard();
    }
  }

  _reloadForStaleCard() {
    if (!CARD_VERSION) {
      return;
    }
    try {
      if (window.sessionStorage.getItem(CARD_STALE_RELOAD_KEY) === CARD_VERSION) {
        return;
      }
      window.sessionStorage.setItem(CARD_STALE_RELOAD_KEY, CARD_VERSION);
    } catch {
      // sessionStorage unavailable — skip reload to avoid an infinite reload loop.
      return;
    }
    console.debug(
      "[lightener] stale card detected (loaded:",
      window[CARD_VERSION_GLOBAL],
      "expected:",
      CARD_VERSION,
      "). Reloading once."
    );
    window.location.reload();
  }

  _detachCardListeners() {
    if (this._card) {
      this._card.removeEventListener("curve-dirty-state", this._onCardDirtyState);
      this._card.removeEventListener("lightener-group-deleted", this._onGroupDeleted);
      this._card.removeEventListener("lightener-membership-state", this._onCardMembershipState);
    }
    this._cardMembershipOpen = false;
  }

  _attachCardListeners(card) {
    if (this._card === card) {
      return;
    }
    this._detachCardListeners();
    this._card = card;
    if (this._card) {
      this._card.addEventListener("curve-dirty-state", this._onCardDirtyState);
      this._card.addEventListener("lightener-group-deleted", this._onGroupDeleted);
      this._card.addEventListener("lightener-membership-state", this._onCardMembershipState);
      this._cardDirty = this._card.dirty === true;
    }
    this._renderPendingSwitch();
  }

  async _handleGroupDeleted(deletedEntityId) {
    this._cardDirty = false;
    this._pendingEntity = null;
    await this._loadLightenerEntities();
    // Restrict post-delete selection to confirmed Lightener entities. Reading
    // _lightenerEntities directly avoids _getEditorEntities()'s fallback path,
    // which returns any HA light group when the Lightener list is empty —
    // selecting one of those would point the card at an entity the
    // integration doesn't own and produce an invalid editing state.
    // If _requestedConfigEntryId is set (scoped panel) we still need that
    // filter applied; _getEditorEntities() handles that case correctly.
    const candidates = this._requestedConfigEntryId
      ? this._getEditorEntities()
      : Array.isArray(this._lightenerEntities)
        ? this._lightenerEntities
        : [];
    const next = candidates.find((e) => e.entity_id !== deletedEntityId) || null;
    this._setSelectedEntity(next ? next.entity_id : null);
  }

  _clearCard() {
    const mount = this.shadowRoot.querySelector("#card-mount");
    if (mount) {
      mount.replaceChildren();
    }
    this._detachCardListeners();
    this._card = null;
    this._cardDirty = false;
  }

  _setSelectedEntity(entityId) {
    this._selectedEntity = entityId;
    this._pendingEntity = null;
    this._switchSaving = false;
    this._cardDirty = false;
    try {
      if (entityId) {
        window.localStorage.setItem("lightener_editor_entity", entityId);
      } else {
        window.localStorage.removeItem("lightener_editor_entity");
      }
    } catch {
      // Silently ignore — private browsing or quota-exceeded; entity selection just won't persist
    }
    this._render();
    this._syncCard();
  }

  async _confirmPendingSwitchSave() {
    if (!this._pendingEntity || !this._card || this._switchSaving) {
      return;
    }

    this._switchSaving = true;
    this._renderPendingSwitch();

    const saveCurves = typeof this._card.saveCurves === "function" ? this._card.saveCurves.bind(this._card) : null;
    let saved = false;
    try {
      saved = saveCurves ? await saveCurves() : false;
    } catch (err) {
      console.error("[Lightener] Entity switch save failed:", err);
    }

    if (saved) {
      this._setSelectedEntity(this._pendingEntity);
      return;
    }

    this._switchSaving = false;
    this._renderPendingSwitch();
  }

  _confirmPendingSwitchDiscard() {
    if (!this._pendingEntity) {
      return;
    }
    this._setSelectedEntity(this._pendingEntity);
  }

  _renderPendingSwitch() {
    const guard = this.shadowRoot.querySelector("#switch-guard");
    if (!guard) {
      return;
    }

    const text = this.shadowRoot.querySelector("#switch-guard-text");
    const saveButton = this.shadowRoot.querySelector("#switch-save");
    const discardButton = this.shadowRoot.querySelector("#switch-discard");

    if (!this._pendingEntity || !this._cardDirty) {
      guard.hidden = true;
      text.textContent = "";
      saveButton.disabled = false;
      saveButton.textContent = "Save";
      discardButton.disabled = false;
      return;
    }

    guard.hidden = false;
    text.textContent = `Unsaved changes in ${this._getEntityLabel(this._selectedEntity)}. Save or discard before switching to ${this._getEntityLabel(this._pendingEntity)}.`;
    saveButton.disabled = this._switchSaving;
    saveButton.textContent = this._switchSaving ? "Saving..." : "Save";
    discardButton.disabled = this._switchSaving;
  }

  _buildEmptyState() {
    const section = document.createElement("section");
    section.className = "empty-state";

    const illustration = document.createElement("div");
    illustration.className = "empty-state-illustration";
    illustration.innerHTML = `
      <svg viewBox="0 0 240 120" aria-hidden="true">
        <defs>
          <linearGradient id="curve-grad-1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#2563eb"/>
            <stop offset="1" stop-color="#2563eb" stop-opacity="0.4"/>
          </linearGradient>
        </defs>
        <line x1="20" y1="100" x2="220" y2="100" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
        <line x1="20" y1="20" x2="20" y2="100" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
        <path d="M 20 100 C 70 100, 110 90, 220 20" fill="none" stroke="url(#curve-grad-1)" stroke-width="3" stroke-linecap="round"/>
        <path d="M 20 100 C 80 70, 140 50, 220 20" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-opacity="0.7"/>
        <path d="M 20 100 C 100 100, 140 30, 220 20" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-opacity="0.7"/>
      </svg>
    `;

    const title = document.createElement("h2");
    title.textContent = this._requestedConfigEntryId
      ? "No editable group yet"
      : "Create your first group";

    const body = document.createElement("p");
    body.textContent =
      "Choose the lights once, then shape how each one brightens with the group.";

    section.append(illustration, title, body);

    // In scoped-config-entry mode, the create flow makes a different config entry that
    // would be filtered out — leaving the panel empty after "success." Match the
    // header button gating and link out to HA Integrations instead.
    if (this._requestedConfigEntryId) {
      const link = document.createElement("a");
      link.className = "empty-state-cta";
      const baseUrl = (this._hass?.config?.frontend_url || "").replace(/\/$/, "");
      link.href = baseUrl + "/config/integrations";
      link.textContent = "Open Integrations";
      section.append(link);
    } else {
      const isAdmin = !!this._hass?.user?.is_admin;
      if (isAdmin) {
        const cta = document.createElement("button");
        cta.type = "button";
        cta.className = "empty-state-cta";
        cta.textContent = "Create group";
        cta.addEventListener("click", () => this._launchNativeAddFlow());
        section.append(cta);
      } else {
        const note = document.createElement("p");
        note.className = "empty-state-note";
        note.textContent = "Ask an admin to create a group.";
        section.append(note);
      }
    }

    return section;
  }

  _renderEmptyState() {
    const mount = this.shadowRoot.querySelector("#card-mount");
    if (!mount) {
      return;
    }
    mount.replaceChildren(this._buildEmptyState());
  }

  _renderEntityLoadError() {
    const mount = this.shadowRoot.querySelector("#card-mount");
    if (!mount) {
      return;
    }
    const section = document.createElement("section");
    section.className = "empty-state load-error-state";

    const title = document.createElement("h2");
    title.textContent = "Groups did not load";

    const body = document.createElement("p");
    body.textContent = this._loadEntitiesError || "Could not load Lightener groups.";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "empty-state-cta";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => {
      // Reset to first-load semantics so the view state reads "loading"
      // while the retry is in flight — leaving the failed attempt's [] in
      // place made the panel claim "empty" for up to the whole timeout.
      this._lightenerEntities = null;
      this._loadEntitiesError = null;
      this._loadLightenerEntities();
      this._render();
      this._syncCard();
    });

    section.append(title, body, retry);
    mount.replaceChildren(section);
  }

  _renderEntityLoadingState() {
    const mount = this.shadowRoot.querySelector("#card-mount");
    if (!mount) {
      return;
    }
    const section = document.createElement("section");
    section.className = "empty-state loading-state";

    const title = document.createElement("h2");
    title.textContent = "Loading groups";

    const body = document.createElement("p");
    body.textContent = "Looking for Lightener groups in Home Assistant.";

    section.append(title, body);
    mount.replaceChildren(section);
  }

  _renderCardLoadError() {
    const mount = this.shadowRoot.querySelector("#card-mount");
    if (!mount) {
      return;
    }
    const error = document.createElement("div");
    error.className = "error";
    error.textContent = "Failed to load curve editor card. Check browser console.";
    mount.replaceChildren(error);
  }

  async _syncCard() {
    const view = this._getViewState();
    if (view !== "ready") {
      this._clearCard();
      if (view === "error") {
        this._renderEntityLoadError();
      } else if (view === "loading") {
        this._renderEntityLoadingState();
      } else {
        this._renderEmptyState();
      }
      return;
    }

    if (!this._hass) {
      return;
    }

    try {
      await this._ensureCardScriptLoaded();
    } catch (err) {
      this._clearCard();
      this._renderCardLoadError();
      return;
    }

    const mount = this.shadowRoot.querySelector("#card-mount");
    if (!mount) {
      return;
    }

    if (!this._card) {
      this._attachCardListeners(document.createElement("lightener-curve-card"));
      mount.replaceChildren(this._card);
    }

    this._card.setConfig({
      type: "custom:lightener-curve-card",
      entity: this._selectedEntity,
      embedded: true,
      firstRun: this._firstRunEligible,
    });
    this._card.hass = this._hass;
  }

  _handleEntitySelectChange(event) {
    const nextEntity = event.target.value || null;
    if (this._cardMembershipOpen) {
      event.target.value = this._selectedEntity || "";
      return;
    }
    if (!nextEntity || nextEntity === this._selectedEntity) {
      return;
    }

    // Ignore a second change while a switch is already pending (double-click race)
    if (this._pendingEntity) {
      event.target.value = this._selectedEntity || "";
      return;
    }

    if (this._cardDirty) {
      this._pendingEntity = nextEntity;
      event.target.value = this._selectedEntity || "";
      this._renderPendingSwitch();
      return;
    }

    this._setSelectedEntity(nextEntity);
  }

  // hass updates arrive constantly and _render runs on every one. Rebuilding
  // the <option>s each time breaks the native select: mutating a focused
  // select's children (especially in the same turn as its own change event)
  // wedges the browser picker until blur. Only touch the DOM when the
  // rendered options actually differ, and never rebuild synchronously while
  // the select owns focus.
  _updateEntitySelect(select, entities, forceRebuild = false) {
    const desired = entities.map((entity) => ({
      value: entity.entity_id,
      label: `${entity.name} (${entity.entity_id})`,
    }));
    const options = Array.from(select.options);
    const listMatches =
      options.length === desired.length &&
      desired.every(
        (item, index) =>
          options[index].value === item.value && options[index].textContent === item.label
      );

    if (listMatches) {
      const value = this._selectedEntity || "";
      if (select.value !== value) {
        select.value = value;
      }
      return;
    }

    if (!forceRebuild && this.shadowRoot.activeElement === select) {
      // Never mutate a focused select's children — the browser collapses the
      // open picker and leaves it inert until blur. Rebuild when focus
      // leaves; the handler re-reads entities so stacked hass updates
      // coalesce into a single rebuild.
      if (!this._selectRebuildScheduled) {
        this._selectRebuildScheduled = true;
        select.addEventListener(
          "blur",
          () => {
            this._selectRebuildScheduled = false;
            const current = this.shadowRoot.querySelector("#entity-select");
            if (current) {
              this._updateEntitySelect(current, this._getEditorEntities(), true);
            }
          },
          { once: true }
        );
      }
      return;
    }

    this._selectRebuildScheduled = false;
    select.replaceChildren(
      ...desired.map((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        return option;
      })
    );
    select.value = this._selectedEntity || "";
  }

  _render() {
    const entities = this._getEditorEntities();

    if (!this.shadowRoot.querySelector("#entity-select")) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            padding: 18px 20px 28px;
            box-sizing: border-box;
            max-width: 100%;
            overflow-x: hidden;
            --lightener-panel-surface: color-mix(
              in srgb,
              var(--card-background-color) 95%,
              var(--primary-text-color) 5%
            );
            --lightener-panel-border: color-mix(
              in srgb,
              var(--divider-color) 70%,
              transparent
            );
          }
          .shell {
            max-width: 1360px;
            margin: 0 auto;
          }
          h1 {
            margin: 0 0 8px;
            font-size: clamp(1.45rem, 2vw, 1.8rem);
            line-height: 1.1;
            letter-spacing: -0.02em;
          }
          p {
            margin: 0 0 16px;
            color: var(--secondary-text-color);
            max-width: 66ch;
          }
          label {
            display: block;
            margin: 0 0 6px;
            font-size: 0.9rem;
            color: var(--secondary-text-color);
          }
          .control-row {
            margin-bottom: 16px;
            padding: 16px 18px;
            border-radius: 18px;
            border: 1px solid var(--lightener-panel-border);
            background:
              linear-gradient(
                180deg,
                color-mix(in srgb, var(--lightener-panel-surface) 92%, transparent),
                color-mix(in srgb, var(--lightener-panel-surface) 98%, transparent)
              );
          }
          .select-wrapper {
            position: relative;
            display: inline-block;
            width: 100%;
            max-width: 640px;
          }
          select {
            width: 100%;
            height: 44px;
            padding: 0 40px 0 14px;
            border-radius: 12px;
            border: 1px solid var(--divider-color);
            background: var(--card-background-color);
            color: var(--primary-text-color);
            appearance: none;
            -webkit-appearance: none;
            font-family: var(--mdc-typography-body1-font-family, var(--paper-font-body1_-_font-family, 'Roboto', sans-serif));
            font-size: 14px;
            cursor: pointer;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          select:hover {
            border-color: var(--primary-color, #2563eb);
          }
          select:focus {
            border-color: var(--primary-color, #2563eb);
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
          }
          .select-arrow {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            color: var(--secondary-text-color);
            opacity: 0.6;
          }
          .hint {
            font-size: 0.9rem;
            margin-top: 10px;
            color: var(--secondary-text-color);
          }
          .notice {
            font-size: 0.9rem;
            margin-top: 10px;
            color: var(--warning-color, #8a5a00);
          }
          .error {
            color: var(--error-color);
            margin-top: 10px;
          }
          .switch-guard {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 14px;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid color-mix(in srgb, var(--warning-color, #f59e0b) 35%, transparent);
            background: color-mix(in srgb, var(--warning-color, #f59e0b) 10%, transparent);
            color: var(--primary-text-color);
          }
          .switch-guard[hidden] {
            display: none;
          }
          .switch-copy {
            font-size: 0.92rem;
            line-height: 1.4;
          }
          .switch-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .switch-button {
            border: none;
            border-radius: 999px;
            padding: 9px 14px;
            font: inherit;
            cursor: pointer;
          }
          .switch-button.primary {
            background: #2563eb;
            color: #fff;
          }
          .switch-button.secondary {
            background: transparent;
            color: var(--primary-text-color);
            border: 1px solid var(--lightener-panel-border);
          }
          .switch-button:disabled {
            opacity: 0.6;
            cursor: default;
          }
          #card-mount {
            min-height: 320px;
          }
          .empty-state {
            display: grid;
            gap: 14px;
            padding: 28px 18px;
            border-radius: 18px;
            border: 1px solid var(--lightener-panel-border);
            background:
              radial-gradient(circle at top right, rgba(37, 99, 235, 0.1), transparent 30%),
              linear-gradient(
                180deg,
                color-mix(in srgb, var(--lightener-panel-surface) 92%, transparent),
                color-mix(in srgb, var(--lightener-panel-surface) 98%, transparent)
              );
          }
          .empty-state h2 {
            margin: 0;
            font-size: 1.15rem;
            letter-spacing: -0.01em;
          }
          .empty-state p {
            margin: 0;
            max-width: 56ch;
          }
          .empty-state-steps {
            margin: 0;
            padding-left: 1.2rem;
            color: var(--secondary-text-color);
          }
          .empty-state-cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: fit-content;
            padding: 10px 18px;
            border-radius: 999px;
            background: #2563eb;
            color: #fff;
            border: none;
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.15s ease;
          }
          .empty-state-cta:hover {
            opacity: 0.9;
          }
          .empty-state-note {
            margin: 0;
            color: var(--secondary-text-color);
            font-size: 14px;
          }
          .empty-state-illustration {
            color: var(--secondary-text-color);
            max-width: 240px;
          }
          .empty-state-illustration svg {
            width: 100%;
            height: auto;
            display: block;
          }
          .entity-select-row {
            display: flex;
            gap: 10px;
            align-items: stretch;
          }
          .new-group-btn {
            min-width: 44px;
            height: 44px;
            padding: 0 14px;
            border-radius: 12px;
            border: 1px solid var(--divider-color);
            background: var(--card-background-color);
            color: var(--primary-text-color);
            font-family: inherit;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            transition: border-color 0.15s ease, color 0.15s ease;
          }
          .new-group-btn:hover {
            border-color: var(--primary-color, #2563eb);
            color: var(--primary-color, #2563eb);
          }
          .new-group-btn svg {
            width: 16px;
            height: 16px;
          }
          @media (max-width: 900px) {
            :host {
              padding: 14px 14px 22px;
            }
            .control-row,
            .empty-state {
              padding: 14px;
              border-radius: 14px;
            }
            .switch-guard {
              align-items: stretch;
              flex-direction: column;
            }
          }
        </style>
        <div class="shell">
          <h1>Lightener Studio</h1>
          <p>Pick a group, then shape how each light responds to brightness.</p>
          <div class="control-row">
            <label for="entity-select">Group</label>
            <div class="entity-select-row">
              <div class="select-wrapper">
                <select id="entity-select"></select>
                <svg class="select-arrow" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </div>
              <button id="new-group-btn" class="new-group-btn" type="button" hidden title="Create new group">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New group
              </button>
            </div>
            <div id="status-msg"></div>
            <div id="switch-guard" class="switch-guard" hidden>
              <div id="switch-guard-text" class="switch-copy"></div>
              <div class="switch-actions">
                <button id="switch-save" class="switch-button primary" type="button">Save</button>
                <button id="switch-discard" class="switch-button secondary" type="button">Discard</button>
              </div>
            </div>
          </div>
          <div id="card-mount"></div>
        </div>
      `;

      this.shadowRoot.querySelector("#entity-select").addEventListener("change", (event) => {
        this._handleEntitySelectChange(event);
      });
      this.shadowRoot.querySelector("#switch-save").addEventListener("click", () => {
        this._confirmPendingSwitchSave();
      });
      this.shadowRoot.querySelector("#switch-discard").addEventListener("click", () => {
        this._confirmPendingSwitchDiscard();
      });
      this.shadowRoot.querySelector("#new-group-btn").addEventListener("click", () => {
        this._launchNativeAddFlow();
      });
    }

    const select = this.shadowRoot.querySelector("#entity-select");
    const statusMsg = this.shadowRoot.querySelector("#status-msg");
    const newGroupBtn = this.shadowRoot.querySelector("#new-group-btn");
    const view = this._getViewState();

    // Never force-disable a select the user currently has open/focused: a
    // late soft-timeout result (see _loadLightenerEntities) can flip the
    // view away from "ready" mid-interaction, and disabling collapses and
    // blurs the picker out from under them — the same wedged-dropdown class
    // of bug the option-rebuild guard above already exists to prevent.
    const selectIsActive = this.shadowRoot.activeElement === select;

    if (view === "ready") {
      select.disabled = this._cardMembershipOpen;
      this._updateEntitySelect(select, entities);
      statusMsg.className = this._handoffNotice ? "notice" : "hint";
      statusMsg.textContent = this._handoffNotice ||
        (this._cardMembershipOpen
          ? "Finish editing lights before switching groups."
          : "Choose a group to shape its lights.");
    } else if (view === "error") {
      if (!selectIsActive) select.disabled = true;
      this._updateEntitySelect(select, []);
      statusMsg.className = "error";
      statusMsg.textContent = this._loadEntitiesError;
      this._renderEntityLoadError();
    } else if (view === "loading") {
      if (!selectIsActive) select.disabled = true;
      this._updateEntitySelect(select, []);
      statusMsg.className = this._handoffNotice ? "notice" : "hint";
      statusMsg.textContent = this._handoffNotice || "Loading Lightener groups...";
      this._renderEntityLoadingState();
    } else {
      if (!selectIsActive) select.disabled = true;
      this._updateEntitySelect(select, []);
      statusMsg.className = this._handoffNotice ? "notice" : "hint";
      statusMsg.textContent = this._handoffNotice ||
        (this._requestedConfigEntryId
          ? "This Lightener setup has no editable group yet."
          : "Choose lights once; then shape how they brighten together.");
      this._renderEmptyState();
    }

    if (newGroupBtn) {
      const isAdmin = !!(this._hass?.user?.is_admin);
      newGroupBtn.hidden = !isAdmin || !!this._requestedConfigEntryId;
      newGroupBtn.disabled = this._cardMembershipOpen;
    }

    this._renderPendingSwitch();
  }

  _launchNativeAddFlow() {
    // Group creation (name -> area -> native multi-light selector) lives entirely
    // in HA's native Add-Integration config flow now. Hand the user off to HA's
    // add route with the Lightener brand focused. HA 2026.2 ignores the older
    // ?domain= deep link for this custom integration, while ?brand= opens the
    // native provider dialog scoped to Lightener Studio.
    const path = "/config/integrations/dashboard/add?brand=lightener_studio";
    window.history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }
}

customElements.define("lightener-editor-panel", LightenerEditorPanel);
