const CARD_VERSION = "2.18.0";
const CARD_VERSION_GLOBAL = "__LIGHTENER_CURVE_CARD_VERSION__";
const PANEL_VERSION_GLOBAL = "__LIGHTENER_PANEL_CARD_VERSION__";
const CARD_STALE_RELOAD_KEY = "lightener_curve_card_reload_version";
const MDI_MENU_PATH = "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z";
// The curve mark from images/lightener-logo.svg (the wordmark without its
// text), inlined so the panel needs no extra static route. Its colors follow
// the Home Assistant theme (see .brand-mark). The header shows the mark only;
// the group name is the headline.
const MARK_SVG = `<svg viewBox="40 80 380 310" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="lightener-mark-guide" x1="86" y1="336" x2="384" y2="126" gradientUnits="userSpaceOnUse">
      <stop class="mark-guide-start" offset="0"/>
      <stop class="mark-guide-end" offset="1"/>
    </linearGradient>
    <linearGradient id="lightener-mark-curve" x1="82" y1="340" x2="386" y2="122" gradientUnits="userSpaceOnUse">
      <stop class="mark-low" offset="0"/>
      <stop class="mark-mid" offset=".62"/>
      <stop class="mark-high" offset="1"/>
    </linearGradient>
  </defs>
  <path d="M86 336 384 126" fill="none" stroke="url(#lightener-mark-guide)" stroke-width="22" stroke-linecap="round"/>
  <path d="M82 340 C148 340 166 322 204 278 C250 224 250 164 296 142 C326 128 354 124 386 122" fill="none" stroke="url(#lightener-mark-curve)" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="mark-points" stroke-width="12">
    <circle class="mark-low-point" cx="82" cy="340" r="25"/>
    <circle class="mark-mid-point" cx="238" cy="244" r="22"/>
    <circle class="mark-high-point" cx="386" cy="122" r="25"/>
  </g>
</svg>`;
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
    this._narrow = false;
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
    this._modeObserver = null;
    this._groupMenuOpen = false;
    this._groupMenuSignature = "";
    this._onDocumentPointerDown = (event) => {
      const switcher = this.shadowRoot.querySelector(".switcher");
      if (switcher && !event.composedPath().includes(switcher)) {
        this._closeGroupMenu(false);
      }
    };
    this._onCardDirtyState = (event) => {
      if (
        event.detail?.entityId &&
        event.detail.entityId !== this._selectedEntity
      )
        return;
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
    this._onCardNewGroup = () => {
      if (this._canCreateGroup() && !this._cardMembershipOpen) {
        this._launchNativeAddFlow();
      }
    };
    try {
      this._requestedConfigEntryId = new URLSearchParams(
        window.location.search,
      ).get("config_entry");
      this._handoffToken = new URLSearchParams(window.location.search).get(
        "handoff",
      );
      // A refresh can happen before the resolved group's entity is available.
      // Keep the same bounded wait and Retry path instead of offering a new group.
      this._handoffEntityPending = Boolean(this._requestedConfigEntryId);
    } catch (err) {}
    try {
      // ?action=new lets the cog flow (HA Settings -> Add Integration -> Lightener)
      // hand off into this panel and immediately launch HA's native Add-Integration
      // flow, unifying the two onboarding entry points so users always land in the
      // same native light selector regardless of where they started. Consumed once
      // on first hass set.
      this._pendingAction = new URLSearchParams(window.location.search).get(
        "action",
      );
    } catch (err) {
      this._pendingAction = null;
    }
  }

  set narrow(narrow) {
    const nextNarrow = narrow === true;
    if (this._narrow === nextNarrow) return;
    this._narrow = nextNarrow;
    this._render();
  }

  get narrow() {
    return this._narrow;
  }

  set hass(hass) {
    this._hass = hass;
    this.toggleAttribute("dark-theme", !!hass?.themes?.darkMode);
    if (this._handoffToken) {
      if (!this._handoffDeferred) this._resolveStudioHandoff();
      this._render();
      return;
    }
    if (!this._loadingEntities && this._shouldLoadLightenerEntities(hass)) {
      this._loadLightenerEntities();
    }

    const entities = this._getEditorEntities();

    if (
      !this._selectedEntity ||
      !entities.some((entity) => entity.entity_id === this._selectedEntity)
    ) {
      this._selectedEntity = this._pickInitialEntity(entities);
      this._cardDirty = false;
      this._pendingEntity = null;
    }

    this._render();
    this._syncCard();
    this._maybeAutoOpenCreateGroup();
  }

  // ?config_entry= only chooses which group opens first; it never filters the
  // list. It wins over the stored last-selected group. A config entry that is
  // not in the loaded list (deleted, or still being set up) opens nothing, so
  // the recovery message shows beside a switcher that lists every group.
  _pickInitialEntity(entities) {
    if (this._requestedConfigEntryId) {
      const requested = entities.find(
        (entity) => entity.config_entry_id === this._requestedConfigEntryId,
      );
      return requested?.entity_id ?? null;
    }
    let saved = null;
    try {
      saved = window.localStorage.getItem("lightener_editor_entity");
    } catch {
      /* private browsing */
    }
    if (saved && entities.some((entity) => entity.entity_id === saved)) {
      return saved;
    }
    return entities[0]?.entity_id ?? null;
  }

  _maybeAutoOpenCreateGroup() {
    // Consume the ?action=new handoff exactly once — only if the panel can
    // actually launch the native add flow (admin user). A scoped
    // ?config_entry= route does not suppress it.
    if (this._pendingAction !== "new") return;
    const isAdmin = !!this._hass?.user?.is_admin;
    if (!isAdmin) {
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
    if (this._card) this._attachCardListeners(this._card);
    // Disconnect cancels the backoff timer. Resume its pending request without
    // resetting the retry budget or reopening a terminal failure.
    if (this._handoffToken) {
      if (!this._handoffDeferred) this._resolveStudioHandoff();
    } else if (this._handoffEntityPending && !this._loadEntitiesError) {
      this._loadLightenerEntities();
    }
  }

  disconnectedCallback() {
    this._closeGroupMenu(false);
    this._detachCardListeners();
    if (this._handoffTimer !== null) {
      window.clearTimeout(this._handoffTimer);
      this._handoffTimer = null;
    }
  }

  _stripHandoffQuery(configEntryId = null) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("handoff");
      if (configEntryId) url.searchParams.set("config_entry", configEntryId);
      else url.searchParams.delete("config_entry");
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
      this._stripHandoffQuery(result.config_entry_id);
      this._lightenerEntities = null;
      this._loadEntitiesError = null;
    } catch (err) {
      if (this._handoffToken !== token) return;
      const code = err?.code;
      if (
        [
          "invalid_handoff",
          "forbidden_handoff",
          "expired_handoff",
          "invalid",
          "forbidden",
          "expired",
          "unauthorized",
        ].includes(code)
      ) {
        this._handoffToken = null;
        // Terminal handoffs abandon their scope. Clear both the pending wait
        // and URL target so a manually chosen fallback survives refresh.
        this._stripHandoffQuery();
        this._requestedConfigEntryId = null;
        this._handoffEntityPending = false;
        this._handoffEntityAttempts = 0;
        this._firstRunEligible = false;
        this._handoffNotice = ["expired_handoff", "expired"].includes(code)
          ? "This setup link has expired."
          : ["invalid_handoff", "invalid"].includes(code)
            ? "This setup link is no longer valid."
            : "You cannot open this setup link with this account.";
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
        this._loadEntitiesError = "Could not open this group. Try again.";
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
      // The token is already consumed. Keep its resolved target through Retry
      // and refresh instead of silently mounting another group's editor.
      this._loadEntitiesError =
        "This group is unavailable. Try again or choose another group.";
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
    if (
      this._fallbackEntitiesCache &&
      this._fallbackEntitiesStatesRef === statesRef
    ) {
      return this._fallbackEntitiesCache;
    }
    const result = Object.keys(statesRef)
      .filter(
        (entityId) =>
          entityId.startsWith("light.") &&
          statesRef[entityId]?.attributes?.entity_id,
      )
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
    if (this._handoffToken) {
      return [];
    }
    // A loaded list is always the full list, scoped route or not. After the
    // "group unavailable" error it stays listed so the switcher can recover.
    if (Array.isArray(this._lightenerEntities)) {
      return this._lightenerEntities;
    }
    if (this._loadEntitiesError || this._requestedConfigEntryId) {
      return [];
    }
    return this._getFallbackEntities();
  }

  _shouldLoadLightenerEntities(hass) {
    if (this._lightenerEntities === null) {
      return (
        !this._fallbackEntityLoadDeferred ||
        (!!this._lastEntityLoadStatesRef &&
          this._lastEntityLoadStatesRef !== hass?.states)
      );
    }
    if (
      !Array.isArray(this._lightenerEntities) ||
      this._lightenerEntities.length !== 0
    ) {
      return false;
    }
    if (this._loadEntitiesError) {
      return false;
    }
    return (
      !!this._lastEntityLoadStatesRef &&
      this._lastEntityLoadStatesRef !== hass?.states
    );
  }

  // Single source of truth for what the panel body should show. Both the
  // status line (_render) and the #card-mount box (_syncCard) derive from
  // this so they can never contradict each other (e.g. a populated select
  // sitting above a "Loading groups" box).
  _getViewState() {
    if (this._handoffToken) {
      return this._loadEntitiesError ? "error" : "loading";
    }
    if (this._handoffEntityPending && !this._loadEntitiesError) {
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

  _getEntityOptions(entities) {
    const names = entities.map((entity) => entity.name || entity.entity_id);
    const nameCounts = new Map();
    for (const name of names) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    const options = entities.map((entity, index) => ({
      value: entity.entity_id,
      label:
        nameCounts.get(names[index]) > 1
          ? `${names[index]} (${entity.entity_id})`
          : names[index],
    }));
    const labelCounts = new Map();
    for (const { label } of options) {
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }
    // A friendly name can match an ID-qualified label. Reserve every label
    // so further suffixes cannot collide with existing or newly chosen ones.
    const usedLabels = new Set(options.map((option) => option.label));
    for (const option of options) {
      if (labelCounts.get(option.label) > 1) {
        do {
          option.label += ` (${option.value})`;
        } while (usedLabels.has(option.label));
        usedLabels.add(option.label);
      }
    }
    return options;
  }

  _getEntityLabel(entityId) {
    const option = this._getEntityOptions(this._getEditorEntities()).find(
      (item) => item.value === entityId,
    );
    return option?.label || entityId || "this Lightener Studio group";
  }

  async _loadLightenerEntities() {
    // HA state updates must not start another request during a retry's backoff.
    if (
      this._loadingEntities ||
      this._handoffTimer !== null ||
      !this._hass ||
      !this._hass.callWS
    ) {
      return;
    }

    this._loadingEntities = true;
    this._loadEntitiesError = null;
    this._fallbackEntityLoadDeferred = false;
    const requestedStatesRef = this._hass?.states ?? null;
    // Attempt token: only the newest attempt may write state, so a response
    // that arrives after its timeout still applies unless a Retry superseded it.
    const attempt = (this._entityLoadAttempt =
      (this._entityLoadAttempt || 0) + 1);
    let timeoutId = null;
    const applyResult = (result) => {
      if (this._entityLoadAttempt !== attempt) {
        return false;
      }
      this._lightenerEntities = Array.isArray(result?.entities)
        ? result.entities
        : [];
      this._loadEntitiesError = null;
      if (this._handoffEntityPending) {
        const exactEntityReady = this._lightenerEntities.some(
          (entity) => entity.config_entry_id === this._requestedConfigEntryId,
        );
        if (exactEntityReady) {
          this._handoffEntityPending = false;
          this._handoffEntityAttempts = 0;
        } else {
          this._scheduleHandoffEntityRetry();
        }
      }
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
        timeoutId = window.setTimeout(() => {
          requestTimedOut = true;
          reject(new Error("lightener/list_entities timed out"));
        }, ENTITY_LOAD_TIMEOUT_MS);
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
          this._loadEntitiesError =
            "Could not load Lightener Studio groups. Check the connection and try again.";
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
            console.error(
              "[Lightener] Lightener groups request failed after timeout:",
              lateError,
            );
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
      this._cardScriptPromise = import(/* @vite-ignore */ moduleUrl).catch(
        (err) => {
          // Import failed. Clear the cached promise so the next _syncCard() call
          // retries from scratch rather than permanently re-throwing this rejection.
          this._cardScriptPromise = null;
          throw err;
        },
      );
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
      if (
        window.sessionStorage.getItem(CARD_STALE_RELOAD_KEY) === CARD_VERSION
      ) {
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
      "). Reloading once.",
    );
    window.location.reload();
  }

  // The card reflects View or Edit as its data-mode attribute; the header
  // lives outside the card, so it follows that attribute.
  _syncHeaderMode() {
    const toolbar = this.shadowRoot.querySelector(".panel-toolbar");
    if (!toolbar) return;
    const mode =
      this._card?.dataset?.mode === "edit" && this._cardListenersAttached
        ? "edit"
        : "view";
    if (toolbar.dataset.mode !== mode) toolbar.dataset.mode = mode;
  }

  _detachCardListeners() {
    this._modeObserver?.disconnect();
    this._modeObserver = null;
    if (this._card) {
      this._cardListenersAttached = false;
      this._card.removeEventListener(
        "curve-dirty-state",
        this._onCardDirtyState,
      );
      this._card.removeEventListener(
        "lightener-group-deleted",
        this._onGroupDeleted,
      );
      this._card.removeEventListener(
        "lightener-membership-state",
        this._onCardMembershipState,
      );
      this._card.removeEventListener(
        "lightener-new-group",
        this._onCardNewGroup,
      );
    }
    this._cardMembershipOpen = false;
    this._syncHeaderMode();
  }

  _attachCardListeners(card) {
    if (this._card === card && this._cardListenersAttached) {
      return;
    }
    this._detachCardListeners();
    this._card = card;
    if (this._card) {
      this._cardListenersAttached = true;
      this._card.addEventListener("curve-dirty-state", this._onCardDirtyState);
      this._card.addEventListener(
        "lightener-group-deleted",
        this._onGroupDeleted,
      );
      this._card.addEventListener(
        "lightener-membership-state",
        this._onCardMembershipState,
      );
      this._card.addEventListener("lightener-new-group", this._onCardNewGroup);
      this._cardDirty = this._card.dirty === true;
      this._modeObserver = new MutationObserver(() => this._syncHeaderMode());
      this._modeObserver.observe(this._card, {
        attributes: true,
        attributeFilter: ["data-mode"],
      });
      this._syncHeaderMode();
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
    // integration doesn't own and produce an invalid editing state. A scoped
    // ?config_entry= route does not narrow this: any remaining group is valid.
    const candidates = Array.isArray(this._lightenerEntities)
      ? this._lightenerEntities
      : [];
    const next =
      candidates.find((e) => e.entity_id !== deletedEntityId) || null;
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

  // Keep ?config_entry= pointing at the current group so a reload returns to
  // it. Every other query param is preserved.
  _syncConfigEntryParam(configEntryId) {
    try {
      const url = new URL(window.location.href);
      if (configEntryId) url.searchParams.set("config_entry", configEntryId);
      else url.searchParams.delete("config_entry");
      window.history.replaceState(null, "", url.toString());
    } catch (err) {}
  }

  _setSelectedEntity(entityId) {
    const entity = entityId
      ? this._getEditorEntities().find((item) => item.entity_id === entityId)
      : null;
    this._selectedEntity = entityId;
    this._pendingEntity = null;
    this._switchSaving = false;
    this._cardDirty = false;
    // Choosing a group moves the route's scope to it, so a pending wait for
    // the originally requested group ends and recovery messages clear.
    this._requestedConfigEntryId = entity?.config_entry_id ?? null;
    if (entity) {
      this._handoffEntityPending = false;
      this._handoffEntityAttempts = 0;
      if (this._handoffTimer !== null) {
        window.clearTimeout(this._handoffTimer);
        this._handoffTimer = null;
      }
      if (Array.isArray(this._lightenerEntities))
        this._loadEntitiesError = null;
    }
    this._syncConfigEntryParam(this._requestedConfigEntryId);
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

    const saveCurves =
      typeof this._card.saveCurves === "function"
        ? this._card.saveCurves.bind(this._card)
        : null;
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
    this._card?.discardNavigationDraft?.();
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
      "Choose lights to control together, then adjust each light’s brightness.";

    section.append(illustration, title, body);

    // In scoped-config-entry mode, the create flow makes a different config entry that
    // would be filtered out — leaving the panel empty after "success." Match the
    // header button gating and offer an accessible route to another group.
    if (this._requestedConfigEntryId) {
      section.append(this._buildGroupRecoveryLink());
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

  _buildGroupRecoveryLink() {
    const link = document.createElement("a");
    link.className = "empty-state-cta";
    const baseUrl = (this._hass?.config?.frontend_url || "").replace(/\/$/, "");
    const isAdmin = !!this._hass?.user?.is_admin;
    link.href =
      baseUrl + (isAdmin ? "/config/integrations" : "/lightener-editor");
    // HA retains this panel on same-path navigation; reload to clear its scope.
    if (!isAdmin) link.rel = "external";
    link.textContent = isAdmin ? "Open Integrations" : "Choose another group";
    return link;
  }

  _renderEntityLoadError() {
    const mount = this.shadowRoot.querySelector("#card-mount");
    if (!mount) {
      return;
    }
    const section = document.createElement("section");
    section.className = "empty-state load-error-state";

    const title = document.createElement("h2");
    title.textContent = this._requestedConfigEntryId
      ? "Group unavailable"
      : "Groups did not load";

    const body = document.createElement("p");
    body.textContent =
      this._loadEntitiesError || "Could not load Lightener Studio groups.";

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
      if (this._handoffToken) {
        this._handoffDeferred = false;
        this._handoffAttempts = 0;
        this._resolveStudioHandoff();
      } else {
        if (this._requestedConfigEntryId) {
          this._handoffEntityPending = true;
          this._handoffEntityAttempts = 0;
        }
        this._loadLightenerEntities();
      }
      this._render();
      this._syncCard();
    });

    section.append(title, body, retry);
    if (this._requestedConfigEntryId)
      section.append(this._buildGroupRecoveryLink());
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
    body.textContent = "Looking for Lightener Studio groups in Home Assistant.";

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
    error.textContent = "Could not load the editor. Refresh to try again.";
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

    // Help in the toolbar is Show me how: an example on the editable graph.
    this._card.canvasHelp = true;
    // New group… in ⋮ follows administrator status and the setup-link handoff.
    this._card.canCreateGroup = this._canCreateGroup();
    this._attachCardListeners(this._card);
    this._card.draftSurface = "sidebar";
    this._card.setConfig({
      type: "custom:lightener-curve-card",
      entity: this._selectedEntity,
      embedded: true,
      firstRun: this._firstRunEligible,
    });
    this._card.toolbarHost = this.shadowRoot.querySelector("#toolbar-host");
    this._card.hass = this._hass;
  }

  _handleGroupChoice(nextEntity) {
    if (this._cardMembershipOpen) {
      return;
    }
    if (!nextEntity || nextEntity === this._selectedEntity) {
      return;
    }

    // Ignore a second choice while a switch is already pending (double-click race)
    if (this._pendingEntity) {
      return;
    }

    if (this._cardDirty) {
      this._pendingEntity = nextEntity;
      this._renderPendingSwitch();
      return;
    }

    this._setSelectedEntity(nextEntity);
  }

  _canCreateGroup() {
    return !!this._hass?.user?.is_admin && !this._handoffToken;
  }

  _groupMenuItems() {
    return Array.from(
      this.shadowRoot.querySelectorAll("#group-menu [role^='menuitem']"),
    );
  }

  _openGroupMenu(focusTarget = "selected") {
    const button = this.shadowRoot.querySelector("#group-switcher");
    const menu = this.shadowRoot.querySelector("#group-menu");
    if (!button || !menu || button.disabled) {
      return;
    }
    const items = this._groupMenuItems();
    if (!items.length) {
      return;
    }
    if (!this._groupMenuOpen) {
      this._groupMenuOpen = true;
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      document.addEventListener(
        "pointerdown",
        this._onDocumentPointerDown,
        true,
      );
    }
    const target =
      focusTarget === "last"
        ? items[items.length - 1]
        : focusTarget === "first"
          ? items[0]
          : items.find(
              (item) => item.getAttribute("aria-checked") === "true",
            ) || items[0];
    target.focus();
  }

  _closeGroupMenu(returnFocus = true) {
    if (!this._groupMenuOpen) {
      return;
    }
    this._groupMenuOpen = false;
    const button = this.shadowRoot.querySelector("#group-switcher");
    const menu = this.shadowRoot.querySelector("#group-menu");
    if (menu) menu.hidden = true;
    if (button) button.setAttribute("aria-expanded", "false");
    document.removeEventListener(
      "pointerdown",
      this._onDocumentPointerDown,
      true,
    );
    if (returnFocus && button) button.focus();
  }

  _onSwitcherClick() {
    if (this._groupMenuOpen) {
      this._closeGroupMenu(true);
    } else {
      this._openGroupMenu("selected");
    }
  }

  // Keyboard model for the switcher (the group switcher stays panel-owned and
  // outside the editor's shortcuts, so handled keys never leave it).
  _onSwitcherKeydown(event) {
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    const key = event.key;
    if (key === "Escape") {
      if (this._groupMenuOpen) {
        handled();
        this._closeGroupMenu(true);
      }
      return;
    }
    if (key === "Tab") {
      // Let focus move on naturally; just do not leave the menu open behind it.
      this._closeGroupMenu(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
      return;
    }
    const button = this.shadowRoot.querySelector("#group-switcher");
    if (!this._groupMenuOpen) {
      if (
        event.target === button &&
        (key === "ArrowDown" || key === "ArrowUp")
      ) {
        handled();
        this._openGroupMenu(key === "ArrowUp" ? "last" : "selected");
      }
      return;
    }
    handled();
    const items = this._groupMenuItems();
    if (!items.length) {
      return;
    }
    const index = items.indexOf(this.shadowRoot.activeElement);
    let next;
    if (key === "Home") next = 0;
    else if (key === "End") next = items.length - 1;
    else if (key === "ArrowDown")
      next = index < 0 ? 0 : (index + 1) % items.length;
    else
      next =
        index < 0
          ? items.length - 1
          : (index - 1 + items.length) % items.length;
    items[next].focus();
  }

  _onGroupMenuClick(event) {
    const item = event.target.closest?.("[role^='menuitem']");
    if (!item) {
      return;
    }
    this._closeGroupMenu(true);
    this._handleGroupChoice(item.dataset.entity);
  }

  // hass updates arrive constantly and _render runs on every one. The header
  // DOM stays put (loading, error and recovery only change its text); the menu
  // items are rebuilt only when the list actually differs, and an open menu
  // keeps focus on the same group across a rebuild.
  _updateGroupSwitcher(view, entities) {
    const button = this.shadowRoot.querySelector("#group-switcher");
    const name = this.shadowRoot.querySelector("#group-name");
    const menu = this.shadowRoot.querySelector("#group-menu");
    const options = this._getEntityOptions(entities);
    const selected = options.find(
      (item) => item.value === this._selectedEntity,
    );

    let headline;
    if (selected) {
      headline = selected.label;
    } else if (view === "ready") {
      headline = this._getEntityLabel(this._selectedEntity);
    } else if (view === "loading") {
      headline = "Loading groups…";
    } else if (view === "error") {
      headline = this._requestedConfigEntryId
        ? "Group unavailable"
        : "Groups unavailable";
    } else {
      headline = this._requestedConfigEntryId
        ? "No editable group"
        : "No groups yet";
    }
    if (name.textContent !== headline) name.textContent = headline;
    if (button.title !== headline) button.title = headline;

    const signature = JSON.stringify(options);
    if (signature !== this._groupMenuSignature) {
      const focusedEntity = menu.contains(this.shadowRoot.activeElement)
        ? this.shadowRoot.activeElement.dataset.entity
        : null;
      this._groupMenuSignature = signature;
      const makeItem = (role, label, glyph) => {
        const item = document.createElement("button");
        item.type = "button";
        item.setAttribute("role", role);
        item.className = "menu-item";
        item.tabIndex = -1;
        const mark = document.createElement("span");
        mark.className = "menu-glyph";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = glyph;
        const text = document.createElement("span");
        text.className = "menu-label";
        text.textContent = label;
        item.append(mark, text);
        return item;
      };
      const children = options.map((option) => {
        const item = makeItem("menuitemradio", option.label, "");
        item.dataset.entity = option.value;
        item.title = option.label;
        return item;
      });
      menu.replaceChildren(...children);
      if (focusedEntity) {
        const restored = this._groupMenuItems().find(
          (item) => item.dataset.entity === focusedEntity,
        );
        (restored || button).focus();
      }
    }
    for (const item of this._groupMenuItems()) {
      if (item.dataset.entity === undefined) continue;
      const checked = item.dataset.entity === this._selectedEntity;
      item.setAttribute("aria-checked", String(checked));
      const glyph = item.querySelector(".menu-glyph");
      const mark = checked ? "✓" : "";
      if (glyph.textContent !== mark) glyph.textContent = mark;
    }

    const unavailable = this._cardMembershipOpen || !options.length;
    button.disabled = unavailable;
    if (unavailable) this._closeGroupMenu(false);
  }

  _shouldShowSidebarMenu() {
    return (
      !this._hass?.kioskMode &&
      (this._narrow || this._hass?.dockedSidebar === "always_hidden")
    );
  }

  _toggleSidebarMenu() {
    // Home Assistant's shell owns sidebar state. Its native panel controls
    // use this composed event, which works across the custom panel's shadow
    // boundary without coupling Lightener to the host's internals.
    this.dispatchEvent(
      new CustomEvent("hass-toggle-menu", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  _render() {
    const entities = this._getEditorEntities();

    if (!this.shadowRoot.querySelector("#group-switcher")) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            padding: 18px 20px 28px;
            box-sizing: border-box;
            max-width: 100%;
            overflow-x: clip;
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
            /* The header bed in Edit mode: a state, not a grouping. It
               darkens a light theme and lightens a dark one on its own. */
            --edit-bed: color-mix(
              in srgb,
              var(--primary-text-color) 8%,
              var(--card-background-color)
            );
          }
          .shell {
            max-width: 1360px;
            margin: 0 auto;
            /* The shared ancestor of the header and #card-mount: both query
               it, e.g. @container lightener-shell (min-width: 1100px). */
            container: lightener-shell / inline-size;
          }
          p {
            margin: 0 0 16px;
            color: var(--secondary-text-color);
            max-width: 66ch;
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
          @media (max-width: 900px) {
            :host {
              padding: 14px 14px 22px;
            }
            .empty-state {
              padding: 14px;
              border-radius: 14px;
            }
            .switch-guard {
              align-items: stretch;
              flex-direction: column;
            }
          }
          @media (max-width: 500px) {
            :host {
              padding: 8px;
            }
            .panel-intro.ready,
            #status-msg.routine-ready-hint {
              display: none;
            }
          }
          .panel-toolbar {
            display: flex;
            align-items: center;
            gap: 0 12px;
            min-height: 48px;
            margin-bottom: 12px;
            /* The bed paints inside this inset; the header is the same size in
               View and Edit, and its content does not move. */
            margin-inline: -8px;
            padding-inline: 8px;
            box-shadow: inset 0 -2px 0 transparent;
            transition:
              background-color 150ms ease,
              box-shadow 150ms ease;
          }
          .panel-toolbar[data-mode="edit"] {
            background-color: var(--edit-bed);
            box-shadow: inset 0 -2px 0 #2563eb;
          }
          .brand {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
          }
          #sidebar-menu-button {
            flex: 0 0 auto;
            margin-inline-start: -8px;
            margin-inline-end: 4px;
            color: var(--sidebar-icon-color, var(--primary-text-color));
          }
          #sidebar-menu-button[hidden] {
            display: none;
          }
          /* Brand palette from images/lightener-logo.svg and its dark variant. */
          .brand-mark {
            display: block;
            flex: none;
            height: 34px;
            aspect-ratio: 380 / 310;
            --mark-guide-start: rgb(15 23 42 / 0.22);
            --mark-guide-end: rgb(8 145 178 / 0.36);
            --mark-low: #2563eb;
            --mark-mid: #0891b2;
            --mark-high: #f59e0b;
            --mark-point-fill: #f8fafc;
          }
          :host([dark-theme]) .brand-mark {
            --mark-guide-start: rgb(148 163 184 / 0.34);
            --mark-guide-end: rgb(103 232 249 / 0.42);
            --mark-low: #60a5fa;
            --mark-mid: #22d3ee;
            --mark-high: #fbbf24;
            --mark-point-fill: #020617;
          }
          .brand-mark svg {
            display: block;
            width: 100%;
            height: 100%;
          }
          .mark-guide-start {
            stop-color: var(--mark-guide-start);
          }
          .mark-guide-end {
            stop-color: var(--mark-guide-end);
          }
          .mark-low {
            stop-color: var(--mark-low);
          }
          .mark-mid {
            stop-color: var(--mark-mid);
          }
          .mark-high {
            stop-color: var(--mark-high);
          }
          .mark-points {
            fill: var(--mark-point-fill);
          }
          .mark-low-point {
            stroke: var(--mark-low);
          }
          .mark-mid-point {
            stroke: var(--mark-mid);
          }
          .mark-high-point {
            stroke: var(--mark-high);
          }
          /* The group name is the headline (--text-xl: 28px/32px, 600,
             tracking -0.01em) and the switcher's trigger. */
          .switcher {
            position: relative;
            flex: 0 1 auto;
            min-width: min(160px, 100%);
            max-width: 100%;
          }
          .headline {
            margin: 0;
            font: inherit;
            min-width: 0;
          }
          .group-switcher {
            display: flex;
            align-items: center;
            gap: 4px;
            box-sizing: border-box;
            max-width: 100%;
            min-height: 36px;
            margin: 0;
            padding: 2px 8px;
            border: 0;
            border-radius: 8px;
            background: transparent;
            color: var(--primary-text-color);
            font-family: inherit;
            font-size: 28px;
            font-weight: 600;
            line-height: 32px;
            letter-spacing: -0.01em;
            text-align: start;
            cursor: pointer;
            transition: background-color 150ms ease;
          }
          .group-switcher:hover:not(:disabled) {
            background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
          }
          .group-switcher:active:not(:disabled) {
            background: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
          }
          .group-switcher:focus-visible,
          .menu-item:focus-visible {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
          .group-switcher:disabled {
            color: var(--primary-text-color);
            cursor: default;
          }
          .group-name {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .switcher-chevron {
            flex: none;
            width: 20px;
            height: 20px;
            color: var(--secondary-text-color);
          }
          .group-switcher:disabled .switcher-chevron {
            opacity: 0.35;
          }
          .group-menu {
            position: absolute;
            z-index: 20;
            top: calc(100% + 4px);
            left: 0;
            box-sizing: border-box;
            min-width: 240px;
            max-width: min(420px, calc(100vw - 32px));
            max-height: min(60vh, 420px);
            overflow-y: auto;
            padding: 4px;
            border: 1px solid var(--divider-color);
            border-radius: 12px;
            background: var(--card-background-color);
            box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
          }
          .group-menu[hidden] {
            display: none;
          }
          .menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            box-sizing: border-box;
            width: 100%;
            min-height: 40px;
            margin: 0;
            padding: 8px 12px;
            border: 0;
            border-radius: 8px;
            background: transparent;
            color: var(--primary-text-color);
            font-family: inherit;
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            text-align: start;
            cursor: pointer;
            transition: background-color 150ms ease;
          }
          .menu-item:hover {
            background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
          }
          .menu-item[aria-checked="true"] {
            font-weight: 600;
          }
          .menu-glyph {
            flex: none;
            width: 16px;
            color: #2563eb;
            font-weight: 700;
            text-align: center;
          }
          .menu-label {
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          @media (prefers-reduced-motion: reduce) {
            .panel-toolbar,
            .group-switcher,
            .menu-item {
              transition: none;
            }
          }
          #toolbar-host {
            flex: 0 0 auto;
            margin-left: auto;
            min-width: 0;
          }
          #toolbar-host[hidden],
          .panel-intro.ready,
          #status-msg.routine-ready-hint {
            display: none;
          }
          /* Below 560px of header width the header takes two rows: the mark
             and the card's controls first, the headline on its own row. */
          @container lightener-shell (max-width: 559.98px) {
            .panel-toolbar {
              flex-wrap: wrap;
              gap: 4px 12px;
            }
            #toolbar-host {
              order: 1;
            }
            .switcher {
              order: 2;
              flex: 1 1 100%;
              min-width: 0;
            }
            .group-switcher,
            .menu-item {
              min-height: 44px;
            }
          }
          #status-msg:not(:empty):not(.routine-ready-hint) {
            margin-bottom: 12px;
          }
        </style>
        <div class="shell">
          <div class="panel-toolbar" data-mode="view">
            <div class="brand">
              <ha-icon-button id="sidebar-menu-button" hidden></ha-icon-button>
              <span class="brand-mark" role="img" aria-label="Lightener Studio">${MARK_SVG}</span>
            </div>
            <div class="switcher">
              <h1 class="headline">
                <button id="group-switcher" class="group-switcher" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="group-menu">
                  <span id="group-name" class="group-name"></span>
                  <svg class="switcher-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <path d="M5 8l5 5 5-5"/>
                  </svg>
                </button>
              </h1>
              <div id="group-menu" class="group-menu" role="menu" aria-label="Groups" hidden></div>
            </div>
            <div id="toolbar-host" hidden></div>
          </div>
          <p class="panel-intro">Choose a group to adjust how its lights brighten together.</p>
            <div id="status-msg"></div>
            <div id="switch-guard" class="switch-guard" hidden>
              <div id="switch-guard-text" class="switch-copy"></div>
              <div class="switch-actions">
                <button id="switch-save" class="switch-button primary" type="button">Save</button>
                <button id="switch-discard" class="switch-button secondary" type="button">Discard</button>
              </div>
            </div>
          <div id="card-mount"></div>
        </div>
      `;

      const switcher = this.shadowRoot.querySelector(".switcher");
      switcher.addEventListener("keydown", (event) => {
        this._onSwitcherKeydown(event);
      });
      this.shadowRoot
        .querySelector("#group-switcher")
        .addEventListener("click", () => {
          this._onSwitcherClick();
        });
      this.shadowRoot
        .querySelector("#group-menu")
        .addEventListener("click", (event) => {
          this._onGroupMenuClick(event);
        });
      this.shadowRoot
        .querySelector("#switch-save")
        .addEventListener("click", () => {
          this._confirmPendingSwitchSave();
        });
      this.shadowRoot
        .querySelector("#switch-discard")
        .addEventListener("click", () => {
          this._confirmPendingSwitchDiscard();
        });
      this.shadowRoot
        .querySelector("#sidebar-menu-button")
        .addEventListener("click", () => {
          this._toggleSidebarMenu();
        });
    }

    const statusMsg = this.shadowRoot.querySelector("#status-msg");
    const sidebarMenuButton = this.shadowRoot.querySelector(
      "#sidebar-menu-button",
    );
    const view = this._getViewState();
    this.shadowRoot
      .querySelector(".panel-intro")
      .classList.toggle("ready", view === "ready");

    if (sidebarMenuButton) {
      const showSidebarMenu = this._shouldShowSidebarMenu();
      sidebarMenuButton.hidden = !showSidebarMenu;
      if (showSidebarMenu) {
        sidebarMenuButton.label =
          this._hass?.localize?.("ui.sidebar.sidebar_toggle") ||
          "Toggle sidebar";
        sidebarMenuButton.path = MDI_MENU_PATH;
      }
    }

    this._updateGroupSwitcher(view, entities);

    if (view === "ready") {
      statusMsg.className = this._handoffNotice ? "notice" : "hint";
      statusMsg.textContent =
        this._handoffNotice ||
        (this._cardMembershipOpen
          ? "Finish editing lights before switching groups."
          : "Choose a group to shape its lights.");
    } else if (view === "error") {
      statusMsg.className = "error";
      statusMsg.textContent = this._loadEntitiesError;
      this._renderEntityLoadError();
    } else if (view === "loading") {
      statusMsg.className = this._handoffNotice ? "notice" : "hint";
      statusMsg.textContent =
        this._handoffNotice || "Loading Lightener Studio groups...";
      this._renderEntityLoadingState();
    } else {
      statusMsg.className = this._handoffNotice ? "notice" : "hint";
      statusMsg.textContent =
        this._handoffNotice ||
        (this._requestedConfigEntryId
          ? "This Lightener Studio setup has no editable group yet."
          : "Choose lights once; then shape how they brighten together.");
      this._renderEmptyState();
    }

    statusMsg.classList.toggle(
      "routine-ready-hint",
      view === "ready" && !this._handoffNotice && !this._cardMembershipOpen,
    );

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
    window.dispatchEvent(
      new CustomEvent("location-changed", { detail: { replace: false } }),
    );
  }
}

customElements.define("lightener-editor-panel", LightenerEditorPanel);
