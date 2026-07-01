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
  _launchNativeAddFlow: () => void;
  _loadLightenerEntities: () => Promise<void>;
  _setSelectedEntity: (entityId: string | null) => void;
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
  panel.hass = hass;
  await Promise.resolve();
  await Promise.resolve();
  return panel;
}

async function flushPanel(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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

  // @ts-expect-error Runtime JS asset imported directly for the custom panel test.
  await import('../../custom_components/lightener_studio/frontend/lightener-panel.js');
});

describe('lightener-editor-panel', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    window.localStorage.clear();
    window.sessionStorage.clear();
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
      'This Lightener setup has no editable group yet.'
    );
    expect(mount.textContent).toContain('No editable group yet');
  });

  it('renders a retryable load error instead of the no-groups empty state', async () => {
    const hass = makePanelHass({
      callWS: vi.fn().mockRejectedValueOnce(new Error('list failed')),
    });

    const panel = await mountPanel(hass);
    await flushPanel();

    const status = panel.shadowRoot!.querySelector('#status-msg')!;
    const mount = panel.shadowRoot!.querySelector('#card-mount')!;
    expect(status.className).toBe('error');
    expect(status.textContent).toContain('Could not load Lightener groups');
    expect(mount.textContent).toContain('Groups did not load');
    expect(mount.textContent).toContain('Retry');
    expect(mount.textContent).not.toContain('Create your first group');
  });

  it('reloads groups when the retry action succeeds after a list failure', async () => {
    const hass = makePanelHass({
      callWS: vi
        .fn()
        .mockRejectedValueOnce(new Error('list failed'))
        .mockResolvedValueOnce({
          entities: [{ entity_id: 'light.alpha', name: 'Alpha' }],
        }),
    });

    const panel = await mountPanel(hass);
    await flushPanel();

    panel
      .shadowRoot!.querySelector<HTMLButtonElement>('.load-error-state .empty-state-cta')!
      .click();
    await flushPanel();

    const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('light.alpha');
    expect(panel.shadowRoot!.querySelector('#card-mount')!.textContent).not.toContain(
      'Groups did not load'
    );
  });

  it('ignores duplicate retry clicks while a group reload is still in flight', async () => {
    let resolveRetryList: (value: {
      entities: Array<{ entity_id: string; name: string }>;
    }) => void = () => {};
    const retryList = new Promise<{ entities: Array<{ entity_id: string; name: string }> }>(
      (resolve) => {
        resolveRetryList = resolve;
      }
    );
    const hass = makePanelHass({
      callWS: vi
        .fn()
        .mockRejectedValueOnce(new Error('list failed'))
        .mockReturnValueOnce(retryList),
    });

    const panel = await mountPanel(hass);
    await flushPanel();

    const retry = panel.shadowRoot!.querySelector<HTMLButtonElement>(
      '.load-error-state .empty-state-cta'
    )!;
    retry.click();
    retry.click();
    expect(hass.callWS).toHaveBeenCalledTimes(2);

    resolveRetryList({ entities: [{ entity_id: 'light.alpha', name: 'Alpha' }] });
    await flushPanel();

    const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('light.alpha');
    expect(panel.shadowRoot!.querySelector('#card-mount')!.textContent).not.toContain(
      'Groups did not load'
    );
  });

  it('rechecks an empty group list when HA states change after native setup returns', async () => {
    const firstStates = {};
    const nextStates = {
      'light.alpha': {
        state: 'on',
        attributes: { friendly_name: 'Alpha', entity_id: 'light.a' },
      },
    };
    const hass = makePanelHass({
      states: firstStates,
      callWS: vi
        .fn()
        .mockResolvedValueOnce({ entities: [] })
        .mockResolvedValueOnce({
          entities: [{ entity_id: 'light.alpha', name: 'Alpha' }],
        }),
    });

    const panel = await mountPanel(hass);
    await flushPanel();
    expect(panel.shadowRoot!.querySelector('#card-mount')!.textContent).toContain(
      'Create your first group'
    );

    panel.hass = { ...hass, states: nextStates };
    await flushPanel();

    const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('light.alpha');
  });

  it('rechecks when HA states change while an empty group list request is in flight', async () => {
    const firstStates = {};
    const nextStates = {
      'light.alpha': {
        state: 'on',
        attributes: { friendly_name: 'Alpha', entity_id: 'light.a' },
      },
    };
    let resolveFirstList: (value: { entities: never[] }) => void = () => {};
    const firstList = new Promise<{ entities: never[] }>((resolve) => {
      resolveFirstList = resolve;
    });
    const hass = makePanelHass({
      states: firstStates,
      callWS: vi
        .fn()
        .mockReturnValueOnce(firstList)
        .mockResolvedValueOnce({
          entities: [{ entity_id: 'light.alpha', name: 'Alpha' }],
        }),
    });

    const panel = await mountPanel(hass);
    panel.hass = { ...hass, states: nextStates };

    resolveFirstList({ entities: [] });
    await flushPanel();

    const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('light.alpha');
  });

  describe('load state machine and select stability', () => {
    it('times out a hung group list call and shows the retryable error state', async () => {
      vi.useFakeTimers();
      try {
        const hass = makePanelHass({
          callWS: vi
            .fn()
            // First call hangs forever — only the panel's own timeout can end it.
            .mockReturnValueOnce(new Promise(() => {}))
            .mockResolvedValueOnce({
              entities: [{ entity_id: 'light.alpha', name: 'Alpha' }],
            }),
        });

        const panel = await mountPanel(hass);
        const internals = panel as unknown as { _loadingEntities: boolean };
        expect(internals._loadingEntities).toBe(true);
        expect(panel.shadowRoot!.querySelector('#card-mount')!.textContent).toContain(
          'Loading groups'
        );

        await vi.advanceTimersByTimeAsync(10_000);
        await flushPanel();

        const status = panel.shadowRoot!.querySelector('#status-msg')!;
        const mount = panel.shadowRoot!.querySelector('#card-mount')!;
        expect(internals._loadingEntities).toBe(false);
        expect(status.className).toBe('error');
        expect(status.textContent).toContain('Could not load Lightener groups');
        expect(mount.textContent).toContain('Groups did not load');
        expect(mount.textContent).toContain('Retry');

        // Retry re-arms the load and recovers.
        panel
          .shadowRoot!.querySelector<HTMLButtonElement>('.load-error-state .empty-state-cta')!
          .click();
        await flushPanel();

        const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
        expect(hass.callWS).toHaveBeenCalledTimes(2);
        expect(select.disabled).toBe(false);
        expect(select.value).toBe('light.alpha');
        expect(mount.textContent).not.toContain('Groups did not load');
      } finally {
        vi.useRealTimers();
      }
    });

    it('mounts the card from fallback entities while the group list call is still pending', async () => {
      // Fake timers keep the panel's 10s load timeout from firing for real
      // after this test ends and mutating a stale panel mid-suite.
      vi.useFakeTimers();
      try {
        const hass = makePanelHass({
          states: {
            'light.alpha': {
              state: 'on',
              attributes: { friendly_name: 'Alpha', entity_id: 'light.a' },
            },
          },
          callWS: vi.fn().mockReturnValue(new Promise(() => {})),
        });

        const panel = await mountPanel(hass);
        await flushPanel();

        const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
        const mount = panel.shadowRoot!.querySelector('#card-mount')!;
        // Fallback entities make the panel editable — no contradictory
        // "populated select above a Loading groups box" state.
        expect(select.disabled).toBe(false);
        expect(select.value).toBe('light.alpha');
        expect(mount.textContent).not.toContain('Loading groups');
        expect(mount.querySelector('lightener-curve-card')).not.toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not rebuild select options when the entity list is unchanged', async () => {
      const Panel = customElements.get('lightener-editor-panel');
      if (!Panel) {
        throw new Error('lightener-editor-panel was not defined');
      }
      const panel = new Panel() as PanelInstance;
      document.body.appendChild(panel);
      panel._lightenerEntities = [
        { entity_id: 'light.alpha', name: 'Alpha' },
        { entity_id: 'light.beta', name: 'Beta' },
      ];
      panel.hass = makePanelHass();
      await flushPanel();

      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
      const before = Array.from(select.options);
      expect(before).toHaveLength(2);

      // Another hass tick with the same entity list must not touch the options.
      panel.hass = makePanelHass();
      await flushPanel();

      const after = Array.from(select.options);
      expect(after).toHaveLength(2);
      expect(after[0]).toBe(before[0]);
      expect(after[1]).toBe(before[1]);

      // Selection change with an identical list only writes select.value.
      panel._setSelectedEntity('light.beta');
      await flushPanel();
      expect(select.value).toBe('light.beta');
      expect(Array.from(select.options)[0]).toBe(before[0]);
      expect(Array.from(select.options)[1]).toBe(before[1]);
    });

    it('shows the loading state while a retry is in flight, not the empty state', async () => {
      vi.useFakeTimers();
      try {
        const hass = makePanelHass({
          callWS: vi.fn().mockReturnValue(new Promise(() => {})),
        });

        const panel = await mountPanel(hass);
        await vi.advanceTimersByTimeAsync(10_000);
        await flushPanel();

        const mount = panel.shadowRoot!.querySelector('#card-mount')!;
        expect(mount.textContent).toContain('Groups did not load');

        // Retry resets to first-load semantics: the panel must say it is
        // looking for groups again, not claim there are none.
        panel
          .shadowRoot!.querySelector<HTMLButtonElement>('.load-error-state .empty-state-cta')!
          .click();
        await flushPanel();

        expect(mount.textContent).toContain('Loading groups');
        expect(mount.textContent).not.toContain('Groups did not load');
      } finally {
        vi.useRealTimers();
      }
    });

    it('applies a slow-but-successful group list response after the timeout fired', async () => {
      vi.useFakeTimers();
      try {
        let resolveLate!: (value: unknown) => void;
        const late = new Promise((resolve) => {
          resolveLate = resolve;
        });
        const hass = makePanelHass({ callWS: vi.fn().mockReturnValue(late) });

        const panel = await mountPanel(hass);
        await vi.advanceTimersByTimeAsync(10_000);
        await flushPanel();

        const mount = panel.shadowRoot!.querySelector('#card-mount')!;
        expect(mount.textContent).toContain('Groups did not load');

        // The original request finally answers. The timeout must be soft:
        // the result lands, the error lifts, no Retry click required.
        resolveLate({ entities: [{ entity_id: 'light.alpha', name: 'Alpha' }] });
        await flushPanel();

        const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
        expect(select.disabled).toBe(false);
        expect(select.value).toBe('light.alpha');
        expect(mount.textContent).not.toContain('Groups did not load');
      } finally {
        vi.useRealTimers();
      }
    });

    it('defers a focused select rebuild until blur, not one frame later', async () => {
      const Panel = customElements.get('lightener-editor-panel');
      if (!Panel) {
        throw new Error('lightener-editor-panel was not defined');
      }
      const panel = new Panel() as PanelInstance;
      document.body.appendChild(panel);
      panel._lightenerEntities = [{ entity_id: 'light.alpha', name: 'Alpha' }];
      panel.hass = makePanelHass();
      await flushPanel();

      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
      select.focus();
      expect(panel.shadowRoot!.activeElement).toBe(select);
      const before = Array.from(select.options);

      // The list changes while the user holds the picker open. Mutating a
      // focused select collapses the native picker, so nothing may change yet
      // — not even one animation frame later.
      panel._lightenerEntities = [
        { entity_id: 'light.alpha', name: 'Alpha' },
        { entity_id: 'light.beta', name: 'Beta' },
      ];
      panel.hass = makePanelHass();
      await flushPanel();
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      await flushPanel();
      expect(Array.from(select.options)).toHaveLength(before.length);
      expect(Array.from(select.options)[0]).toBe(before[0]);

      // Focus leaves: now the rebuild flushes with the fresh list.
      select.blur();
      select.dispatchEvent(new Event('blur'));
      await flushPanel();
      expect(Array.from(select.options)).toHaveLength(2);
    });
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

  it('does not import or reload when the registered card class version matches CARD_VERSION', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      _ensureCardScriptLoaded: () => Promise<void>;
      _reloadForStaleCard: () => void;
      _cardScriptPromise: Promise<unknown> | null;
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
      // The pre-registered branch returns before the import() path: the cached
      // script promise must stay at its constructor-initialized null.
      expect(panel._cardScriptPromise).toBeNull();
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

  describe('native Add-Integration handoff', () => {
    const ADD_FLOW_PATH = '/config/integrations/dashboard/add?brand=lightener_studio';

    // Capture the pushState path + the location-changed event in one helper so each
    // test can assert "we navigated the HA UI to the native add flow".
    function spyNavigation() {
      const pushStateSpy = vi.spyOn(window.history, 'pushState');
      let locationChangedDetail: { replace?: boolean } | null = null;
      const onLocationChanged = (event: Event) => {
        locationChangedDetail = (event as CustomEvent).detail ?? {};
      };
      window.addEventListener('location-changed', onLocationChanged);
      return {
        pushStateSpy,
        getLocationChangedDetail: () => locationChangedDetail,
        cleanup: () => {
          window.removeEventListener('location-changed', onLocationChanged);
          pushStateSpy.mockRestore();
        },
      };
    }

    it('"New group" button navigates to the native Add Lightener flow', async () => {
      const panel = await mountPanel();
      const nav = spyNavigation();
      try {
        const newGroupBtn = panel.shadowRoot!.querySelector<HTMLButtonElement>('#new-group-btn')!;
        // Admin, unscoped panel → the button is visible.
        expect(newGroupBtn.hidden).toBe(false);

        newGroupBtn.click();

        // pushState was called with the native add-flow route (domain pre-selected).
        expect(nav.pushStateSpy).toHaveBeenCalledTimes(1);
        const [, , path] = nav.pushStateSpy.mock.calls[0];
        expect(path).toBe(ADD_FLOW_PATH);
        // ...and the HA router was notified via a location-changed event.
        expect(nav.getLocationChangedDetail()).toEqual({ replace: false });
      } finally {
        nav.cleanup();
      }
    });

    it('empty-state CTA navigates to the native Add Lightener flow', async () => {
      // No Lightener entities → the empty state renders its "Create group"
      // CTA, which must also hand off to the native flow.
      const panel = await mountPanel();
      const nav = spyNavigation();
      try {
        const cta = panel.shadowRoot!.querySelector<HTMLButtonElement>(
          '#card-mount .empty-state-cta'
        )!;
        expect(cta).toBeTruthy();
        expect(cta.textContent).toBe('Create group');

        cta.click();

        expect(nav.pushStateSpy).toHaveBeenCalledTimes(1);
        const [, , path] = nav.pushStateSpy.mock.calls[0];
        expect(path).toBe(ADD_FLOW_PATH);
        expect(nav.getLocationChangedDetail()).toEqual({ replace: false });
      } finally {
        nav.cleanup();
      }
    });
  });

  describe('cog-flow handoff via ?action=new', () => {
    const ADD_FLOW_PATH = '/config/integrations/dashboard/add?brand=lightener_studio';

    function setSearch(search: string) {
      const url = new URL(window.location.href);
      url.search = search;
      window.history.replaceState(null, '', url.toString());
    }

    function spyNavigation() {
      const pushStateSpy = vi.spyOn(window.history, 'pushState');
      let locationChangedFired = false;
      const onLocationChanged = () => {
        locationChangedFired = true;
      };
      window.addEventListener('location-changed', onLocationChanged);
      return {
        pushStateSpy,
        getLocationChangedFired: () => locationChangedFired,
        cleanup: () => {
          window.removeEventListener('location-changed', onLocationChanged);
          pushStateSpy.mockRestore();
        },
      };
    }

    beforeEach(() => {
      setSearch('');
    });

    it('auto-launches the native add flow when an admin lands with ?action=new', async () => {
      setSearch('?action=new');
      const nav = spyNavigation();
      try {
        await mountPanel();
        // Give _maybeAutoOpenCreateGroup a microtask to fire after set hass.
        await Promise.resolve();

        // Navigated to the native add flow exactly once.
        const addFlowCalls = nav.pushStateSpy.mock.calls.filter(([, , p]) => p === ADD_FLOW_PATH);
        expect(addFlowCalls).toHaveLength(1);
        expect(nav.getLocationChangedFired()).toBe(true);
        // ?action=new is stripped so a refresh doesn't re-trigger the handoff.
        expect(window.location.search).not.toContain('action=new');
      } finally {
        nav.cleanup();
      }
    });

    it('does NOT auto-launch for non-admin users (no permission to create)', async () => {
      setSearch('?action=new');
      const nav = spyNavigation();
      try {
        const hass = makePanelHass({ user: { is_admin: false } });
        const panel = await mountPanel(hass);
        await Promise.resolve();

        const addFlowCalls = nav.pushStateSpy.mock.calls.filter(([, , p]) => p === ADD_FLOW_PATH);
        expect(addFlowCalls).toHaveLength(0);
        // Param still gets cleared so refresh doesn't keep retrying.
        expect((panel as unknown as { _pendingAction: string | null })._pendingAction).toBeNull();
      } finally {
        nav.cleanup();
      }
    });

    it('does NOT auto-launch when scoped to a single config_entry', async () => {
      setSearch('?action=new&config_entry=existing');
      const nav = spyNavigation();
      try {
        await mountPanel();
        await Promise.resolve();
        const addFlowCalls = nav.pushStateSpy.mock.calls.filter(([, , p]) => p === ADD_FLOW_PATH);
        expect(addFlowCalls).toHaveLength(0);
      } finally {
        nav.cleanup();
      }
    });

    it('strips ?action=new from the panel history entry while preserving other params', async () => {
      // The handoff rewrites the CURRENT history entry (replaceState) to drop
      // action=new before navigating away (pushState) to the native add flow.
      // That keeps the panel's own back-button entry clean — other params like
      // keepme=1 survive on it. We assert the replaceState URL directly because
      // the subsequent pushState navigation moves location.search to the add route.
      setSearch('?action=new&keepme=1');
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      const nav = spyNavigation();
      try {
        await mountPanel();
        await Promise.resolve();
        const stripCall = replaceStateSpy.mock.calls.find(([, , url]) =>
          String(url ?? '').includes('keepme=1')
        );
        expect(stripCall).toBeTruthy();
        const strippedUrl = String(stripCall![2]);
        expect(strippedUrl).toContain('keepme=1');
        expect(strippedUrl).not.toContain('action=new');
      } finally {
        nav.cleanup();
        replaceStateSpy.mockRestore();
      }
    });

    it('does nothing when no action param is present', async () => {
      setSearch('');
      const nav = spyNavigation();
      try {
        await mountPanel();
        await Promise.resolve();
        const addFlowCalls = nav.pushStateSpy.mock.calls.filter(([, , p]) => p === ADD_FLOW_PATH);
        expect(addFlowCalls).toHaveLength(0);
      } finally {
        nav.cleanup();
      }
    });
  });
});
