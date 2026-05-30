// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type PanelHass = {
  user: { is_admin: boolean };
  states: Record<
    string,
    { attributes?: { friendly_name?: string; entity_id?: string }; state?: string }
  >;
  callWS: ReturnType<typeof vi.fn>;
  callApi: ReturnType<typeof vi.fn>;
};

type PanelInstance = HTMLElement & {
  hass: PanelHass;
  _card: HTMLElement & {
    emitDirtyState: (dirty: boolean) => void;
    saveShouldSucceed: boolean;
    config?: { entity: string };
  };
  _lightenerEntities: Array<{ entity_id: string; name: string; config_entry_id?: string }>;
  _pendingEntity: string | null;
  _openCreateGroupModal: () => void;
  _submitCreateGroup: () => Promise<void>;
  _createGroupSelectedLights: string[];
  _createGroupAreaId: string | null;
  _createGroupStep: number;
  _ensureEntityPickerLoaded: () => Promise<void>;
  _ensureAreaPickerLoaded: () => Promise<void>;
  _renderCreateGroupLightsPicker: (openToken?: number, renderToken?: number) => Promise<void>;
  _loadLightenerEntities: () => Promise<void>;
  _setSelectedEntity: (entityId: string | null) => void;
  _goCreateGroupNext: () => void;
  _goCreateGroupBack: () => void;
  _renderCreateGroupStep: () => void;
  _assertFlowStep: (step: unknown, expectedStepId: string, fallback: string) => void;
  _createGroupSubmitting: boolean;
};

function makePanelHass(overrides: Partial<PanelHass> = {}): PanelHass {
  return {
    user: { is_admin: true },
    states: {},
    callWS: vi.fn().mockResolvedValue({ entities: [] }),
    callApi: vi.fn(),
    ...overrides,
  };
}

async function mountPanel(hass: PanelHass = makePanelHass()): Promise<PanelInstance> {
  const Panel = customElements.get('lightener-editor-panel');
  if (!Panel) {
    throw new Error('lightener-editor-panel was not defined');
  }
  const panel = new Panel() as PanelInstance;
  document.body.appendChild(panel);
  panel._ensureEntityPickerLoaded = vi.fn().mockResolvedValue(undefined);
  panel._ensureAreaPickerLoaded = vi.fn().mockResolvedValue(undefined);
  panel.hass = hass;
  await Promise.resolve();
  await Promise.resolve();
  return panel;
}

async function mountCreateGroupPanel(hass: PanelHass = makePanelHass()) {
  const panel = await mountPanel(hass);
  panel._openCreateGroupModal();
  await Promise.resolve();
  const modal = panel.shadowRoot!.querySelector('#create-group-modal') as HTMLElement;
  const nameInput = panel.shadowRoot!.querySelector('#cgf-name') as HTMLInputElement;
  const errorEl = panel.shadowRoot!.querySelector('#create-group-error') as HTMLDivElement;
  return { panel, hass, modal, nameInput, errorEl };
}

async function flushCreateGroupPickerRender() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function expectNoConfigEntriesWs(hass: { callWS: ReturnType<typeof vi.fn> }) {
  const forbidden = hass.callWS.mock.calls.filter(([msg]) =>
    /^config_entries\/(flow|remove)/.test(
      String((msg as { type?: string } | undefined)?.type ?? '')
    )
  );
  expect(forbidden).toHaveLength(0);
}

type StubEntitiesPicker = HTMLElement & {
  excludeEntitiesValue?: string[];
  includeEntitiesValue?: string[] | undefined;
  includeDomainsValue?: string[];
  valueValue?: string[];
  hassValue?: unknown;
};

function lastEntitiesPicker(): StubEntitiesPicker | undefined {
  return (window as unknown as { __LIGHTENER_TEST_LAST_ENTITIES_PICKER__?: StubEntitiesPicker })
    .__LIGHTENER_TEST_LAST_ENTITIES_PICKER__;
}

beforeAll(async () => {
  if (!customElements.get('lightener-curve-card')) {
    class FakeCurveCard extends HTMLElement {
      config?: { type: string; entity: string; embedded?: boolean };
      hass?: unknown;
      dirty = false;
      saveShouldSucceed = true;

      setConfig(config: { type: string; entity: string; embedded?: boolean }) {
        this.config = config;
      }

      emitDirtyState(dirty: boolean) {
        this.dirty = dirty;
        this.dispatchEvent(
          new CustomEvent('curve-dirty-state', {
            detail: { dirty },
            bubbles: true,
            composed: true,
          })
        );
      }

      async saveCurves() {
        if (this.saveShouldSucceed) {
          this.emitDirtyState(false);
        }
        return this.saveShouldSucceed;
      }
    }

    customElements.define('lightener-curve-card', FakeCurveCard);
  }

  // Register stub HA pickers globally so tests get deterministic behavior
  // regardless of order. Tests that need to capture setter values can read
  // from window.__LIGHTENER_TEST_LAST_ENTITY_PICKER__.
  if (!customElements.get('ha-entity-picker')) {
    class StubEntityPicker extends HTMLElement {
      excludeEntitiesValue?: string[];
      includeEntitiesValue?: string[];
      set excludeEntities(v: string[]) {
        this.excludeEntitiesValue = v;
        (
          window as unknown as { __LIGHTENER_TEST_LAST_ENTITY_PICKER__?: StubEntityPicker }
        ).__LIGHTENER_TEST_LAST_ENTITY_PICKER__ = this;
      }
      set includeEntities(v: string[]) {
        this.includeEntitiesValue = v;
        (
          window as unknown as { __LIGHTENER_TEST_LAST_ENTITY_PICKER__?: StubEntityPicker }
        ).__LIGHTENER_TEST_LAST_ENTITY_PICKER__ = this;
      }
      set hass(_v: unknown) {}
      set includeDomains(_v: string[]) {}
      set allowCustomEntity(_v: boolean) {}
      set value(_v: string) {}
    }
    customElements.define('ha-entity-picker', StubEntityPicker);
  }

  // Native plural multi-select picker. When registered, the panel prefers this
  // over the singular <ha-entity-picker>. Records the last instance + all setter
  // values to a distinct capture global so tests can assert props and the seed.
  if (!customElements.get('ha-entities-picker')) {
    class StubEntitiesPicker extends HTMLElement {
      excludeEntitiesValue?: string[];
      includeEntitiesValue?: string[] | undefined;
      includeDomainsValue?: string[];
      valueValue?: string[];
      hassValue?: unknown;
      private record() {
        (
          window as unknown as { __LIGHTENER_TEST_LAST_ENTITIES_PICKER__?: StubEntitiesPicker }
        ).__LIGHTENER_TEST_LAST_ENTITIES_PICKER__ = this;
      }
      set excludeEntities(v: string[]) {
        this.excludeEntitiesValue = v;
        this.record();
      }
      set includeEntities(v: string[] | undefined) {
        this.includeEntitiesValue = v;
        this.record();
      }
      set includeDomains(v: string[]) {
        this.includeDomainsValue = v;
        this.record();
      }
      set value(v: string[]) {
        this.valueValue = v;
        this.record();
      }
      set hass(v: unknown) {
        this.hassValue = v;
        this.record();
      }
    }
    customElements.define('ha-entities-picker', StubEntitiesPicker);
  }

  if (!customElements.get('ha-area-picker')) {
    class StubAreaPicker extends HTMLElement {
      set hass(_v: unknown) {}
      set value(_v: string) {}
    }
    customElements.define('ha-area-picker', StubAreaPicker);
  }

  // @ts-expect-error Runtime JS asset imported directly for the custom panel test.
  await import('../../custom_components/lightener/frontend/lightener-panel.js');
});

describe('lightener-editor-panel', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete (window as unknown as { __LIGHTENER_TEST_LAST_ENTITY_PICKER__?: unknown })
      .__LIGHTENER_TEST_LAST_ENTITY_PICKER__;
    delete (window as unknown as { __LIGHTENER_TEST_LAST_ENTITIES_PICKER__?: unknown })
      .__LIGHTENER_TEST_LAST_ENTITIES_PICKER__;
    // Use the panel's own published CARD_VERSION so this doesn't drift on version bumps.
    const panelVer = (window as unknown as { __LIGHTENER_PANEL_CARD_VERSION__?: string })
      .__LIGHTENER_PANEL_CARD_VERSION__;
    (
      window as unknown as { __LIGHTENER_CURVE_CARD_VERSION__?: string }
    ).__LIGHTENER_CURVE_CARD_VERSION__ = panelVer ?? '0.0.0';
  });

  it('clears the mounted curve card when no valid entity remains', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      hass: unknown;
      _card: HTMLElement | null;
      _lightenerEntities: Array<{ entity_id: string; name: string; config_entry_id?: string }>;
      _requestedConfigEntryId: string | null;
    };

    document.body.appendChild(panel);
    panel._requestedConfigEntryId = 'entry-1';
    panel._lightenerEntities = [
      { entity_id: 'light.test', name: 'Test Light', config_entry_id: 'entry-1' },
    ];
    panel.hass = makePanelHass();
    await Promise.resolve();

    const mount = panel.shadowRoot!.querySelector('#card-mount')!;
    expect(mount.children).toHaveLength(1);
    expect(panel._card).not.toBeNull();
    expect((panel._card as HTMLElement & { config?: { embedded?: boolean } }).config).toMatchObject(
      {
        entity: 'light.test',
        embedded: true,
      }
    );

    panel._lightenerEntities = [];
    panel.hass = makePanelHass();
    await Promise.resolve();

    expect(mount.children).toHaveLength(1);
    expect(panel._card).toBeNull();
    expect(panel.shadowRoot!.querySelector('#status-msg')!.textContent).toBe(
      'This Lightener integration does not have an editable group yet.'
    );
    expect(mount.textContent).toContain('No editable Lightener group yet');
  });

  it('reloads once instead of reusing a pre-registered stale curve card class', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      _ensureCardScriptLoaded: () => Promise<void>;
      _reloadForStaleCard: () => void;
    };
    let reloadRequested = false;
    (
      window as unknown as { __LIGHTENER_CURVE_CARD_VERSION__?: string }
    ).__LIGHTENER_CURVE_CARD_VERSION__ = '2.14.0';
    panel._reloadForStaleCard = () => {
      reloadRequested = true;
    };

    await panel._ensureCardScriptLoaded();

    expect(reloadRequested).toBe(true);
  });

  it('does not reload when the registered card class version matches CARD_VERSION', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      _ensureCardScriptLoaded: () => Promise<void>;
      _reloadForStaleCard: () => void;
    };
    let reloadRequested = false;
    const w = window as unknown as {
      __LIGHTENER_CURVE_CARD_VERSION__?: string;
      __LIGHTENER_PANEL_CARD_VERSION__?: string;
    };
    const prev = w.__LIGHTENER_CURVE_CARD_VERSION__;
    // Derive the expected version from the panel's own published constant rather
    // than hardcoding it — scripts/sync-version keeps it in sync with manifest.json.
    const panelCardVersion = w.__LIGHTENER_PANEL_CARD_VERSION__;
    if (!panelCardVersion)
      throw new Error('__LIGHTENER_PANEL_CARD_VERSION__ not set by panel module');
    w.__LIGHTENER_CURVE_CARD_VERSION__ = panelCardVersion;
    panel._reloadForStaleCard = () => {
      reloadRequested = true;
    };

    try {
      await panel._ensureCardScriptLoaded();
      expect(reloadRequested).toBe(false);
    } finally {
      if (prev === undefined) {
        delete w.__LIGHTENER_CURVE_CARD_VERSION__;
      } else {
        w.__LIGHTENER_CURVE_CARD_VERSION__ = prev;
      }
    }
  });

  it('builds a path-stamped card module URL without a ?v= query string', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      _ensureCardScriptLoaded: () => Promise<void>;
      _reloadForStaleCard: () => void;
      _cardModuleUrl?: string;
      _cardScriptPromise?: Promise<unknown>;
    };
    // Clear any previous promise so the URL is re-computed.
    panel._cardScriptPromise = undefined;
    // Unregister the fake card temporarily so the URL-construction branch runs.
    const savedGet = customElements.get.bind(customElements);
    vi.spyOn(customElements, 'get').mockImplementationOnce((name) => {
      if (name === 'lightener-curve-card') return undefined;
      return savedGet(name);
    });

    // Do not await: the assignment to _cardModuleUrl is synchronous (before the
    // import() call), so we can read it immediately. import() itself will reject in
    // jsdom (no real module loader) but we only need the URL here.
    panel._ensureCardScriptLoaded().catch(() => {});

    expect(panel._cardModuleUrl).toBeDefined();
    expect(panel._cardModuleUrl).toMatch(/\/lightener\/lightener-curve-card\.[^/]+\.js$/);
    expect(panel._cardModuleUrl).not.toContain('?v=');
  });

  it('reloads after fallback import when the fallback-loaded card version is stale', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      _ensureCardScriptLoaded: () => Promise<void>;
      _reloadForStaleCard: () => void;
      _cardUsedFallback: boolean;
      _cardScriptPromise?: Promise<unknown>;
    };
    let reloadRequested = false;
    panel._reloadForStaleCard = () => {
      reloadRequested = true;
    };
    // Simulate: fallback was used and the fallback-loaded card reported an old version.
    panel._cardUsedFallback = true;
    panel._cardScriptPromise = Promise.resolve();
    (
      window as unknown as { __LIGHTENER_CURVE_CARD_VERSION__?: string }
    ).__LIGHTENER_CURVE_CARD_VERSION__ = '2.14.0';
    // Mask the already-registered FakeCurveCard so _ensureCardScriptLoaded skips
    // the pre-registered-class branch and reaches the post-fallback stale check.
    const savedGet = customElements.get.bind(customElements);
    const getSpy = vi.spyOn(customElements, 'get').mockImplementation((name) => {
      if (name === 'lightener-curve-card') return undefined;
      return savedGet(name);
    });

    try {
      await panel._ensureCardScriptLoaded();
      expect(reloadRequested).toBe(true);
    } finally {
      getSpy.mockRestore();
    }
  });

  it('shows an inline save or discard guard before switching entities with unsaved changes', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      hass: unknown;
      _card: HTMLElement & { emitDirtyState: (dirty: boolean) => void };
      _lightenerEntities: Array<{ entity_id: string; name: string }>;
      _pendingEntity: string | null;
    };
    document.body.appendChild(panel);
    panel._lightenerEntities = [
      { entity_id: 'light.alpha', name: 'Alpha' },
      { entity_id: 'light.beta', name: 'Beta' },
    ];
    panel.hass = makePanelHass();
    await Promise.resolve();

    panel._card.emitDirtyState(true);

    const select = panel.shadowRoot!.querySelector('#entity-select') as HTMLSelectElement;
    select.value = 'light.beta';
    select.dispatchEvent(new Event('change'));

    expect(panel._pendingEntity).toBe('light.beta');
    expect(select.value).toBe('light.alpha');
    expect(panel.shadowRoot!.querySelector('#switch-guard')!.hasAttribute('hidden')).toBe(false);
    expect(panel.shadowRoot!.querySelector('#switch-guard-text')!.textContent).toContain(
      'Unsaved changes in Alpha'
    );
  });

  it('saves pending edits before switching entities when the inline guard save action is used', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      hass: unknown;
      _card: HTMLElement & {
        emitDirtyState: (dirty: boolean) => void;
        saveShouldSucceed: boolean;
        config?: { entity: string };
      };
      _lightenerEntities: Array<{ entity_id: string; name: string }>;
    };
    document.body.appendChild(panel);
    panel._lightenerEntities = [
      { entity_id: 'light.alpha', name: 'Alpha' },
      { entity_id: 'light.beta', name: 'Beta' },
    ];
    panel.hass = makePanelHass();
    await Promise.resolve();

    panel._card.emitDirtyState(true);
    panel._card.saveShouldSucceed = true;

    const select = panel.shadowRoot!.querySelector('#entity-select') as HTMLSelectElement;
    select.value = 'light.beta';
    select.dispatchEvent(new Event('change'));

    (panel.shadowRoot!.querySelector('#switch-save') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();

    expect(panel._card.config).toMatchObject({ entity: 'light.beta' });
    expect(select.value).toBe('light.beta');
    expect(panel.shadowRoot!.querySelector('#switch-guard')!.hasAttribute('hidden')).toBe(true);
  });

  it('completes a pending switch when the current card becomes clean outside the guard actions', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      hass: unknown;
      _card: HTMLElement & {
        emitDirtyState: (dirty: boolean) => void;
        config?: { entity: string };
      };
      _lightenerEntities: Array<{ entity_id: string; name: string }>;
      _pendingEntity: string | null;
    };
    document.body.appendChild(panel);
    panel._lightenerEntities = [
      { entity_id: 'light.alpha', name: 'Alpha' },
      { entity_id: 'light.beta', name: 'Beta' },
    ];
    panel.hass = makePanelHass();
    await Promise.resolve();

    panel._card.emitDirtyState(true);

    const select = panel.shadowRoot!.querySelector('#entity-select') as HTMLSelectElement;
    select.value = 'light.beta';
    select.dispatchEvent(new Event('change'));

    expect(panel._pendingEntity).toBe('light.beta');
    expect(select.value).toBe('light.alpha');

    panel._card.emitDirtyState(false);
    await Promise.resolve();

    expect(panel._pendingEntity).toBeNull();
    expect(panel._card.config).toMatchObject({ entity: 'light.beta' });
    expect(select.value).toBe('light.beta');
    expect(panel.shadowRoot!.querySelector('#switch-guard')!.hasAttribute('hidden')).toBe(true);
  });

  describe('submit create group flow', () => {
    it('happy path completes the config flow via callApi', async () => {
      const hass = makePanelHass({
        states: {
          'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
          'light.b': { state: 'on', attributes: { friendly_name: 'Beta' } },
        },
      });
      hass.callApi
        .mockResolvedValueOnce({ flow_id: 'F1', type: 'form', step_id: 'user' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'area' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'lights' })
        .mockResolvedValueOnce({
          type: 'create_entry',
          title: 'My Group',
          result: { entry_id: 'E1' },
        });

      const { panel, modal, nameInput } = await mountCreateGroupPanel(hass);
      vi.spyOn(panel, '_loadLightenerEntities').mockImplementation(async () => {
        panel._lightenerEntities = [
          { entity_id: 'light.my_group', name: 'My Group', config_entry_id: 'E1' },
        ];
      });
      const setSelectedEntity = vi.spyOn(panel, '_setSelectedEntity');

      nameInput.value = 'My Group';
      panel._createGroupSelectedLights = ['light.a', 'light.b'];

      await panel._submitCreateGroup();

      expect(hass.callApi.mock.calls).toEqual([
        [
          'POST',
          'config/config_entries/flow',
          { handler: 'lightener', show_advanced_options: false },
        ],
        ['POST', 'config/config_entries/flow/F1', { name: 'My Group' }],
        ['POST', 'config/config_entries/flow/F1', {}],
        ['POST', 'config/config_entries/flow/F1', { controlled_entities: ['light.a', 'light.b'] }],
      ]);
      expect(setSelectedEntity).toHaveBeenCalledWith('light.my_group');
      expect(modal.hidden).toBe(true);
      expectNoConfigEntriesWs(hass);
    });

    it('error path shows the abort reason and aborts the orphaned flow', async () => {
      const hass = makePanelHass();
      hass.callApi
        .mockResolvedValueOnce({ flow_id: 'F2', type: 'form', step_id: 'user' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'area' })
        .mockResolvedValueOnce({ type: 'abort', reason: 'no_lights_in_area' })
        .mockResolvedValueOnce(undefined);

      const { panel, errorEl, modal, nameInput } = await mountCreateGroupPanel(hass);
      nameInput.value = 'My Group';
      panel._createGroupSelectedLights = ['light.a', 'light.b'];

      await panel._submitCreateGroup();

      expect(hass.callApi.mock.calls).toEqual([
        [
          'POST',
          'config/config_entries/flow',
          { handler: 'lightener', show_advanced_options: false },
        ],
        ['POST', 'config/config_entries/flow/F2', { name: 'My Group' }],
        ['POST', 'config/config_entries/flow/F2', {}],
        ['DELETE', 'config/config_entries/flow/F2'],
      ]);
      expect(errorEl.textContent).toBe('no_lights_in_area');
      expect(errorEl.hidden).toBe(false);
      expect(modal.hidden).toBe(false);
      expectNoConfigEntriesWs(hass);
    });

    it('opens at step 0 with only the name field visible and Back hidden', async () => {
      const { panel, modal } = await mountCreateGroupPanel();
      expect(modal.hidden).toBe(false);
      expect(panel._createGroupStep).toBe(0);

      const steps = Array.from(panel.shadowRoot!.querySelectorAll<HTMLElement>('.modal-step'));
      expect(steps[0].hidden).toBe(false);
      expect(steps[1].hidden).toBe(true);
      expect(steps[2].hidden).toBe(true);

      const backBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#cgf-back')!;
      const nextBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#cgf-next')!;
      const submitBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#cgf-submit')!;
      expect(backBtn.hidden).toBe(true);
      expect(nextBtn.hidden).toBe(false);
      expect(submitBtn.hidden).toBe(true);
    });

    it('blocks Next from step 0 when the name is empty', async () => {
      const { panel } = await mountCreateGroupPanel();
      panel._goCreateGroupNext();
      expect(panel._createGroupStep).toBe(0);
    });

    it('navigates Name -> Area -> Lights and Back returns to the previous step', async () => {
      const { panel, nameInput } = await mountCreateGroupPanel();
      nameInput.value = 'Living Room';

      panel._goCreateGroupNext();
      expect(panel._createGroupStep).toBe(1);
      const steps = Array.from(panel.shadowRoot!.querySelectorAll<HTMLElement>('.modal-step'));
      expect(steps[1].hidden).toBe(false);

      panel._goCreateGroupNext();
      expect(panel._createGroupStep).toBe(2);
      const submitBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#cgf-submit')!;
      const nextBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#cgf-next')!;
      expect(submitBtn.hidden).toBe(false);
      expect(nextBtn.hidden).toBe(true);

      panel._goCreateGroupBack();
      expect(panel._createGroupStep).toBe(1);
      panel._goCreateGroupBack();
      expect(panel._createGroupStep).toBe(0);
      panel._goCreateGroupBack();
      expect(panel._createGroupStep).toBe(0);
    });

    it('skips area filter (POSTs empty body) when no area selected', async () => {
      const hass = makePanelHass();
      hass.callApi
        .mockResolvedValueOnce({ flow_id: 'F1', type: 'form', step_id: 'user' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'area' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'lights' })
        .mockResolvedValueOnce({
          type: 'create_entry',
          title: 'My Group',
          result: { entry_id: 'E1' },
        });

      const { panel, nameInput } = await mountCreateGroupPanel(hass);
      vi.spyOn(panel, '_loadLightenerEntities').mockImplementation(async () => {
        panel._lightenerEntities = [
          { entity_id: 'light.my_group', name: 'My Group', config_entry_id: 'E1' },
        ];
      });
      nameInput.value = 'My Group';
      panel._createGroupSelectedLights = ['light.a'];
      panel._createGroupAreaId = null;

      await panel._submitCreateGroup();

      expect(hass.callApi.mock.calls[2]).toEqual(['POST', 'config/config_entries/flow/F1', {}]);
    });

    it('POSTs area_id when an area was selected', async () => {
      const hass = makePanelHass();
      hass.callApi
        .mockResolvedValueOnce({ flow_id: 'F1', type: 'form', step_id: 'user' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'area' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'lights' })
        .mockResolvedValueOnce({
          type: 'create_entry',
          title: 'My Group',
          result: { entry_id: 'E1' },
        });

      const { panel, nameInput } = await mountCreateGroupPanel(hass);
      vi.spyOn(panel, '_loadLightenerEntities').mockImplementation(async () => {
        panel._lightenerEntities = [
          { entity_id: 'light.my_group', name: 'My Group', config_entry_id: 'E1' },
        ];
      });
      nameInput.value = 'My Group';
      panel._createGroupSelectedLights = ['light.a'];
      panel._createGroupAreaId = 'living_room';

      await panel._submitCreateGroup();

      expect(hass.callApi.mock.calls[2]).toEqual([
        'POST',
        'config/config_entries/flow/F1',
        { area_id: 'living_room' },
      ]);
    });

    it('passes existing Lightener entities as excludeEntities to the plural lights picker', async () => {
      const { panel } = await mountCreateGroupPanel();
      panel._lightenerEntities = [
        { entity_id: 'light.existing_lightener', name: 'Existing', config_entry_id: 'E0' },
      ];
      // Move to step 2 to trigger the lights picker render.
      const nameInput = panel.shadowRoot!.querySelector<HTMLInputElement>('#cgf-name')!;
      nameInput.value = 'Living Room';
      panel._goCreateGroupNext();
      panel._goCreateGroupNext();
      // The picker is rendered async by _renderCreateGroupLightsPicker.
      await flushCreateGroupPickerRender();

      const stub = lastEntitiesPicker();
      expect(stub?.excludeEntitiesValue).toEqual(['light.existing_lightener']);
      // includeDomains is light-only and the native plural tag is used.
      expect(stub?.includeDomainsValue).toEqual(['light']);
      expect(stub?.tagName.toLowerCase()).toBe('ha-entities-picker');
    });

    it('loads area-narrowed eligible lights from the backend as includeEntities (plural picker)', async () => {
      const hass = makePanelHass();
      hass.callWS.mockImplementation(async (msg: { type?: string; area_id?: string }) => {
        if (msg.type === 'lightener/list_entities') {
          return {
            entities: [
              { entity_id: 'light.existing_lightener', name: 'Existing', config_entry_id: 'E0' },
            ],
          };
        }
        if (msg.type === 'lightener/list_eligible_lights' && msg.area_id === 'living_room') {
          return { entities: ['light.lr_a', 'light.lr_b'] };
        }
        return { entities: [] };
      });

      const { panel, nameInput } = await mountCreateGroupPanel(hass);
      panel._lightenerEntities = [
        { entity_id: 'light.existing_lightener', name: 'Existing', config_entry_id: 'E0' },
      ];
      nameInput.value = 'Living Room';
      panel._goCreateGroupNext(); // -> step 1
      panel._createGroupAreaId = 'living_room';
      panel._goCreateGroupNext(); // -> step 2
      await flushCreateGroupPickerRender();

      const stub = lastEntitiesPicker();
      expect(stub?.includeEntitiesValue?.slice().sort()).toEqual(['light.lr_a', 'light.lr_b']);
      expect(stub?.includeEntitiesValue).not.toContain('light.existing_lightener');
      expect(hass.callWS).toHaveBeenCalledWith({
        type: 'lightener/list_eligible_lights',
        area_id: 'living_room',
      });
    });

    it('captures selected area id from <ha-area-picker> value-changed event', async () => {
      const { panel, nameInput } = await mountCreateGroupPanel();
      nameInput.value = 'Living Room';
      panel._goCreateGroupNext(); // -> step 1
      await Promise.resolve();
      await Promise.resolve();
      const picker = panel.shadowRoot!.querySelector(
        '#cgf-area-mount > ha-area-picker'
      ) as HTMLElement;
      expect(picker).toBeTruthy();
      picker.dispatchEvent(new CustomEvent('value-changed', { detail: { value: 'living_room' } }));
      expect(panel._createGroupAreaId).toBe('living_room');
      // Empty string clears back to null.
      picker.dispatchEvent(new CustomEvent('value-changed', { detail: { value: '' } }));
      expect(panel._createGroupAreaId).toBeNull();
      // Non-string value is coerced to null without throwing.
      picker.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: { value: { area_id: 'x' } as unknown as string },
        })
      );
      expect(panel._createGroupAreaId).toBeNull();
    });

    it('passes includeEntities=[] when area is selected but resolves to zero lights', async () => {
      const hass = makePanelHass();
      hass.callWS.mockImplementation(async (msg: { type?: string }) => {
        if (msg.type === 'lightener/list_eligible_lights') return { entities: [] };
        return { entities: [] };
      });
      const { panel, nameInput } = await mountCreateGroupPanel(hass);
      nameInput.value = 'Empty Area';
      panel._goCreateGroupNext();
      panel._createGroupAreaId = 'attic_with_no_lights';
      panel._goCreateGroupNext();
      await flushCreateGroupPickerRender();
      const stub = lastEntitiesPicker();
      // Empty array = "this area has no lights" — picker honors it instead of
      // silently widening to all lights.
      expect(stub?.includeEntitiesValue).toEqual([]);
      // Colorblind-safe empty-area notice is surfaced above the picker.
      const notice = panel.shadowRoot!.querySelector('#cgf-lights-mount .cgf-lights-notice');
      expect(notice?.textContent).toContain('No eligible lights in this area');
    });

    it('skips area filter (and warns) when the eligible-lights backend call fails', async () => {
      const hass = makePanelHass();
      hass.callWS.mockImplementation(async (msg: { type?: string }) => {
        if (msg.type === 'lightener/list_eligible_lights') throw new Error('boom');
        return { entities: [] };
      });
      const { panel, nameInput } = await mountCreateGroupPanel(hass);
      nameInput.value = 'Without Registry';
      panel._goCreateGroupNext();
      panel._createGroupAreaId = 'living_room';
      panel._goCreateGroupNext();
      await flushCreateGroupPickerRender();
      const stub = lastEntitiesPicker();
      // Fetch failed → fall back to ALL lights (no include filter)...
      expect(stub?.includeEntitiesValue).toBeUndefined();
      // ...but tell the user instead of silently widening.
      const notice = panel.shadowRoot!.querySelector('#cgf-lights-mount .cgf-lights-notice');
      expect(notice?.textContent).toContain("Couldn't load this area's lights");
    });

    describe('native plural lights picker', () => {
      // Drive the wizard to step 2 (Lights) so _renderCreateGroupLightsPicker runs.
      async function gotoLightsStep(panel: PanelInstance, name = 'Living Room') {
        const nameInput = panel.shadowRoot!.querySelector<HTMLInputElement>('#cgf-name')!;
        nameInput.value = name;
        panel._goCreateGroupNext(); // -> Area
        panel._goCreateGroupNext(); // -> Lights
        await flushCreateGroupPickerRender();
      }

      it('renders <ha-entities-picker> with light-only domain and seeds value from selection', async () => {
        const hass = makePanelHass({
          states: {
            'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
            'light.b': { state: 'on', attributes: { friendly_name: 'Beta' } },
          },
        });
        const { panel } = await mountCreateGroupPanel(hass);
        // Pre-seed a selection so we can assert the picker is hydrated with it.
        panel._createGroupSelectedLights = ['light.a', 'light.b'];
        await gotoLightsStep(panel);

        const picker = panel.shadowRoot!.querySelector(
          '#cgf-lights-mount > ha-entities-picker'
        ) as HTMLElement;
        expect(picker).toBeTruthy();
        const stub = lastEntitiesPicker();
        expect(stub?.includeDomainsValue).toEqual(['light']);
        // Seeded with a COPY of the current selection (not the same reference).
        expect(stub?.valueValue).toEqual(['light.a', 'light.b']);
        expect(stub?.valueValue).not.toBe(panel._createGroupSelectedLights);
        // No area filter → includeEntities undefined (means "no filter", not "[]").
        expect(stub?.includeEntitiesValue).toBeUndefined();
        // The native picker owns its own selected rows — no Lightener chip list.
        expect(panel.shadowRoot!.querySelector('#cgf-selected-lights')).toBeNull();
      });

      it('array value-changed replaces _createGroupSelectedLights and toggles the submit CTA', async () => {
        const { panel } = await mountCreateGroupPanel();
        await gotoLightsStep(panel);
        const picker = panel.shadowRoot!.querySelector(
          '#cgf-lights-mount > ha-entities-picker'
        ) as HTMLElement;
        const submitBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#cgf-submit')!;

        // Empty selection → CTA disabled (no-selection state).
        expect(submitBtn.disabled).toBe(true);

        picker.dispatchEvent(
          new CustomEvent('value-changed', { detail: { value: ['light.a', 'light.b'] } })
        );
        expect(panel._createGroupSelectedLights).toEqual(['light.a', 'light.b']);
        expect(submitBtn.disabled).toBe(false);

        // Coercion: non-array / dirty payloads collapse to a clean string[].
        picker.dispatchEvent(
          new CustomEvent('value-changed', {
            detail: { value: ['light.c', '', null as unknown as string] },
          })
        );
        expect(panel._createGroupSelectedLights).toEqual(['light.c']);

        // null detail → empty array, CTA disabled again.
        picker.dispatchEvent(new CustomEvent('value-changed', { detail: { value: null } }));
        expect(panel._createGroupSelectedLights).toEqual([]);
        expect(submitBtn.disabled).toBe(true);
      });

      it('area change PERSISTS selection (scopes selectability only) and ignores remount echoes', async () => {
        const hass = makePanelHass();
        hass.callWS.mockImplementation(async (msg: { type?: string; area_id?: string }) => {
          if (msg.type === 'lightener/list_eligible_lights' && msg.area_id === 'kitchen') {
            return { entities: ['light.kitchen_1'] };
          }
          return { entities: [] };
        });
        const { panel } = await mountCreateGroupPanel(hass);

        // Step 1: pick an area via the picker.
        const nameInput = panel.shadowRoot!.querySelector<HTMLInputElement>('#cgf-name')!;
        nameInput.value = 'Cross Area';
        panel._goCreateGroupNext(); // -> Area
        await flushCreateGroupPickerRender();
        const areaPicker = panel.shadowRoot!.querySelector(
          '#cgf-area-mount > ha-area-picker'
        ) as HTMLElement;

        // User selects an out-of-area light first (e.g. from "all lights").
        panel._createGroupSelectedLights = ['light.living_room_99'];

        areaPicker.dispatchEvent(
          new CustomEvent('value-changed', { detail: { value: 'kitchen' } })
        );
        expect(panel._createGroupAreaId).toBe('kitchen');
        // Selection persists across the area change — NOT cleared.
        expect(panel._createGroupSelectedLights).toEqual(['light.living_room_99']);

        // Remount/Back echo: the same area id is re-emitted with no user intent.
        const before = panel._createGroupSelectedLights;
        areaPicker.dispatchEvent(
          new CustomEvent('value-changed', { detail: { value: 'kitchen' } })
        );
        // No-op: area id unchanged, selection reference unchanged.
        expect(panel._createGroupAreaId).toBe('kitchen');
        expect(panel._createGroupSelectedLights).toBe(before);

        // Advance to Lights: the area only scopes SELECTABILITY (includeEntities),
        // while the already-picked out-of-area light stays in the value array.
        panel._goCreateGroupNext(); // -> Lights
        await flushCreateGroupPickerRender();
        const stub = lastEntitiesPicker();
        expect(stub?.includeEntitiesValue).toEqual(['light.kitchen_1']);
        expect(stub?.valueValue).toEqual(['light.living_room_99']);
        expect(panel._createGroupSelectedLights).toEqual(['light.living_room_99']);
      });

      it('submit payload stays {controlled_entities:[...]} after a plural value-changed', async () => {
        const hass = makePanelHass({
          states: {
            'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
            'light.b': { state: 'on', attributes: { friendly_name: 'Beta' } },
          },
        });
        hass.callApi
          .mockResolvedValueOnce({ flow_id: 'F1', type: 'form', step_id: 'user' })
          .mockResolvedValueOnce({ type: 'form', step_id: 'area' })
          .mockResolvedValueOnce({ type: 'form', step_id: 'lights' })
          .mockResolvedValueOnce({
            type: 'create_entry',
            title: 'My Group',
            result: { entry_id: 'E1' },
          });
        const { panel } = await mountCreateGroupPanel(hass);
        vi.spyOn(panel, '_loadLightenerEntities').mockImplementation(async () => {
          panel._lightenerEntities = [
            { entity_id: 'light.my_group', name: 'My Group', config_entry_id: 'E1' },
          ];
        });
        await gotoLightsStep(panel, 'My Group');
        const picker = panel.shadowRoot!.querySelector(
          '#cgf-lights-mount > ha-entities-picker'
        ) as HTMLElement;
        picker.dispatchEvent(
          new CustomEvent('value-changed', { detail: { value: ['light.a', 'light.b'] } })
        );

        await panel._submitCreateGroup();

        // The lights POST body is unchanged by the picker swap.
        expect(hass.callApi.mock.calls[3]).toEqual([
          'POST',
          'config/config_entries/flow/F1',
          { controlled_entities: ['light.a', 'light.b'] },
        ]);
        expectNoConfigEntriesWs(hass);
      });

      it('falls back to the single <ha-entity-picker> + chip loop when plural is unavailable', async () => {
        delete (window as unknown as { __LIGHTENER_TEST_LAST_ENTITY_PICKER__?: unknown })
          .__LIGHTENER_TEST_LAST_ENTITY_PICKER__;
        // Mask only the plural tag so the single-picker tier is exercised.
        const realGet = customElements.get.bind(customElements);
        const getSpy = vi.spyOn(customElements, 'get').mockImplementation((name) => {
          if (name === 'ha-entities-picker') return undefined;
          return realGet(name);
        });
        try {
          const { panel } = await mountCreateGroupPanel();
          panel._lightenerEntities = [
            { entity_id: 'light.existing_lightener', name: 'Existing', config_entry_id: 'E0' },
          ];
          await gotoLightsStep(panel);

          // Plural tag hidden → single picker is mounted, with the chip list.
          expect(
            panel.shadowRoot!.querySelector('#cgf-lights-mount > ha-entities-picker')
          ).toBeNull();
          expect(
            panel.shadowRoot!.querySelector('#cgf-lights-mount > ha-entity-picker')
          ).toBeTruthy();
          expect(panel.shadowRoot!.querySelector('#cgf-selected-lights')).toBeTruthy();

          // Single-picker tier still excludes existing Lightener entities.
          const singleStub = (
            window as unknown as {
              __LIGHTENER_TEST_LAST_ENTITY_PICKER__?: { excludeEntitiesValue?: string[] };
            }
          ).__LIGHTENER_TEST_LAST_ENTITY_PICKER__;
          expect(singleStub?.excludeEntitiesValue).toEqual(['light.existing_lightener']);

          // Adding one light at a time still populates the shared array.
          const picker = panel.shadowRoot!.querySelector(
            '#cgf-lights-mount > ha-entity-picker'
          ) as HTMLElement;
          picker.dispatchEvent(new CustomEvent('value-changed', { detail: { value: 'light.a' } }));
          expect(panel._createGroupSelectedLights).toEqual(['light.a']);
        } finally {
          getSpy.mockRestore();
        }
      });
    });

    it('aborts the flow with a clear error when backend returns an unexpected step_id', async () => {
      const hass = makePanelHass();
      // After name step, backend returns step_id="surprise" instead of "area".
      hass.callApi
        .mockResolvedValueOnce({ flow_id: 'F9', type: 'form', step_id: 'user' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'surprise' })
        .mockResolvedValueOnce(undefined); // DELETE for abort cleanup
      const { panel, errorEl, modal, nameInput } = await mountCreateGroupPanel(hass);
      nameInput.value = 'Mismatched';
      panel._createGroupSelectedLights = ['light.a'];
      await panel._submitCreateGroup();
      expect(errorEl.hidden).toBe(false);
      expect(errorEl.textContent).toMatch(/expected step "area", got "surprise"/);
      expect(modal.hidden).toBe(false);
    });

    it('_goCreateGroupNext snaps back to step 0 when name was cleared after advancing', async () => {
      const { panel, nameInput } = await mountCreateGroupPanel();
      nameInput.value = 'Living Room';
      panel._goCreateGroupNext(); // -> step 1
      expect(panel._createGroupStep).toBe(1);
      // User goes Back, clears the name, then tries to advance again from step 1.
      // The form-submit dispatcher fires _goCreateGroupNext from any input's Enter,
      // so we must defend regardless of starting step.
      nameInput.value = '';
      panel._goCreateGroupNext();
      expect(panel._createGroupStep).toBe(0);
    });

    it('_goCreateGroupNext from step 2 is a no-op', async () => {
      const { panel, nameInput } = await mountCreateGroupPanel();
      nameInput.value = 'Room';
      panel._goCreateGroupNext(); // -> step 1
      panel._goCreateGroupNext(); // -> step 2
      panel._goCreateGroupNext(); // should stay at 2
      expect(panel._createGroupStep).toBe(2);
    });

    it('step indicator marks prior steps as done and sets aria-current on the active step', async () => {
      const { panel, nameInput } = await mountCreateGroupPanel();
      nameInput.value = 'Room';
      panel._goCreateGroupNext(); // -> step 1

      const items = Array.from(
        panel.shadowRoot!.querySelectorAll<HTMLElement>('#cgf-step-indicator li')
      );
      expect(items[0].classList.contains('done')).toBe(true);
      expect(items[0].getAttribute('aria-current')).toBeNull();
      expect(items[1].classList.contains('active')).toBe(true);
      expect(items[1].getAttribute('aria-current')).toBe('step');

      // After Back, step 0 is active again but step 1 retains its done state
      // (maxStep is sticky — visiting a step is permanent in the indicator).
      panel._goCreateGroupBack(); // -> step 0
      const items2 = Array.from(
        panel.shadowRoot!.querySelectorAll<HTMLElement>('#cgf-step-indicator li')
      );
      expect(items2[0].classList.contains('active')).toBe(true);
      expect(items2[0].getAttribute('aria-current')).toBe('step');
      expect(items2[1].classList.contains('done')).toBe(true);
      expect(items2[1].getAttribute('aria-current')).toBeNull();
    });

    it('Back button click is blocked while submission is in flight', async () => {
      const { panel, nameInput } = await mountCreateGroupPanel();
      nameInput.value = 'Room';
      panel._goCreateGroupNext(); // -> step 1

      const backSpy = vi.spyOn(panel, '_goCreateGroupBack');
      panel._createGroupSubmitting = true;

      const backBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#cgf-back')!;
      backBtn.click();

      expect(backSpy).not.toHaveBeenCalled();
      expect(panel._createGroupStep).toBe(1);
    });

    it('form submit event at step < 2 calls _goCreateGroupNext (Enter to advance)', async () => {
      const { panel, nameInput } = await mountCreateGroupPanel();
      nameInput.value = 'Room';
      const form = panel.shadowRoot!.querySelector<HTMLFormElement>('#create-group-form')!;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      expect(panel._createGroupStep).toBe(1);
    });

    it('_assertFlowStep does not throw for non-form response types', async () => {
      const panel = await mountPanel();
      const assertStep = panel._assertFlowStep.bind(panel);
      expect(() =>
        assertStep({ type: 'abort', step_id: 'surprise' }, 'area', 'fallback')
      ).not.toThrow();
      expect(() =>
        assertStep({ type: 'create_entry', step_id: 'surprise' }, 'area', 'fallback')
      ).not.toThrow();
      expect(() => assertStep({ type: 'form', step_id: 'area' }, 'area', 'fallback')).not.toThrow();
      expect(() => assertStep({ type: 'form', step_id: 'surprise' }, 'area', 'fallback')).toThrow(
        /expected step "area"/
      );
    });

    it('regression: never calls callWS for config_entries/* on either path', async () => {
      const happyHass = makePanelHass();
      happyHass.callApi
        .mockResolvedValueOnce({ flow_id: 'F1', type: 'form', step_id: 'user' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'area' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'lights' })
        .mockResolvedValueOnce({
          type: 'create_entry',
          title: 'My Group',
          result: { entry_id: 'E1' },
        });
      const happy = await mountCreateGroupPanel(happyHass);
      vi.spyOn(happy.panel, '_loadLightenerEntities').mockImplementation(async () => {
        happy.panel._lightenerEntities = [
          { entity_id: 'light.my_group', name: 'My Group', config_entry_id: 'E1' },
        ];
      });
      happy.nameInput.value = 'My Group';
      happy.panel._createGroupSelectedLights = ['light.a', 'light.b'];
      await happy.panel._submitCreateGroup();

      const abortHass = makePanelHass();
      abortHass.callApi
        .mockResolvedValueOnce({ flow_id: 'F2', type: 'form', step_id: 'user' })
        .mockResolvedValueOnce({ type: 'form', step_id: 'area' })
        .mockResolvedValueOnce({ type: 'abort', reason: 'no_lights_in_area' })
        .mockResolvedValueOnce(undefined);
      const abort = await mountCreateGroupPanel(abortHass);
      abort.nameInput.value = 'My Group';
      abort.panel._createGroupSelectedLights = ['light.a', 'light.b'];
      await abort.panel._submitCreateGroup();

      expectNoConfigEntriesWs(happyHass);
      expectNoConfigEntriesWs(abortHass);
    });
  });

  describe('cog-flow handoff via ?action=new', () => {
    function setSearch(search: string) {
      const url = new URL(window.location.href);
      url.search = search;
      window.history.replaceState(null, '', url.toString());
    }

    beforeEach(() => {
      setSearch('');
    });

    it('auto-opens the create-group modal when admin lands with ?action=new', async () => {
      setSearch('?action=new');
      const panel = await mountPanel();
      // Give _maybeAutoOpenCreateGroup a microtask to fire after set hass.
      await Promise.resolve();
      const modal = panel.shadowRoot!.querySelector('#create-group-modal') as HTMLElement;
      expect(modal.hidden).toBe(false);
      // Query param stripped so a refresh doesn't reopen.
      expect(window.location.search).not.toContain('action=new');
      // Single-fire: closing then re-setting hass should NOT re-open.
      panel.shadowRoot!.dispatchEvent(new Event('click')); // noop, just wait a tick
      const m = panel as unknown as { _closeCreateGroupModal: () => void };
      m._closeCreateGroupModal();
      panel.hass = panel.hass;
      await Promise.resolve();
      expect(modal.hidden).toBe(true);
    });

    it('does NOT auto-open for non-admin users (no permission to create)', async () => {
      setSearch('?action=new');
      const hass = makePanelHass({ user: { is_admin: false } });
      const panel = await mountPanel(hass);
      await Promise.resolve();
      const modal = panel.shadowRoot!.querySelector('#create-group-modal') as HTMLElement;
      expect(modal.hidden).toBe(true);
      // Param still gets cleared so refresh doesn't keep retrying.
      expect((panel as unknown as { _pendingAction: string | null })._pendingAction).toBeNull();
    });

    it('does NOT auto-open when scoped to a single config_entry', async () => {
      setSearch('?action=new&config_entry=existing');
      const panel = await mountPanel();
      await Promise.resolve();
      const modal = panel.shadowRoot!.querySelector('#create-group-modal') as HTMLElement;
      expect(modal.hidden).toBe(true);
    });

    it('preserves other query params when stripping ?action=new', async () => {
      setSearch('?action=new&keepme=1');
      await mountPanel();
      await Promise.resolve();
      expect(window.location.search).toContain('keepme=1');
      expect(window.location.search).not.toContain('action=new');
    });

    it('does nothing when no action param is present', async () => {
      setSearch('');
      const panel = await mountPanel();
      await Promise.resolve();
      const modal = panel.shadowRoot!.querySelector('#create-group-modal') as HTMLElement;
      expect(modal.hidden).toBe(true);
    });
  });
});
