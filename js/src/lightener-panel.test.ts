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
  dockedSidebar?: 'auto' | 'docked' | 'always_hidden';
  kioskMode?: boolean;
  localize?: (key: string) => string;
};

type PanelInstance = HTMLElement & {
  hass: PanelHass;
  narrow: boolean;
  _card: HTMLElement & {
    emitDirtyState: (dirty: boolean) => void;
    emitMembershipState: (open: boolean) => void;
    saveShouldSucceed: boolean;
    config?: { entity: string; firstRun?: boolean };
  };
  _lightenerEntities: Array<{ entity_id: string; name: string; config_entry_id?: string }>;
  _pendingEntity: string | null;
  _launchNativeAddFlow: () => void;
  _loadLightenerEntities: () => Promise<void>;
  _setSelectedEntity: (entityId: string | null) => void;
  _handoffNotice: string | null;
  _requestedConfigEntryId: string | null;
  _selectedEntity: string | null;
  _loadingEntities: boolean;
  _loadEntitiesError: string | null;
  _render: () => void;
  _getEntityLabel: (entityId: string | null) => string;
  _renderEntityLoadError: () => void;
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

      emitMembershipState(open: boolean) {
        this.dispatchEvent(
          new CustomEvent('lightener-membership-state', {
            detail: { open },
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

  it('marks only routine ready guidance for compact hiding and keeps the picker stable', async () => {
    const panel = await mountPanel(
      makePanelHass({
        callWS: vi
          .fn()
          .mockResolvedValue({ entities: [{ entity_id: 'light.alpha', name: 'Alpha' }] }),
      })
    );
    await flushPanel();
    const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
    const intro = panel.shadowRoot!.querySelector('.panel-intro')!;
    const status = panel.shadowRoot!.querySelector('#status-msg')!;
    expect(intro.classList.contains('ready')).toBe(true);
    expect(status.classList.contains('routine-ready-hint')).toBe(true);

    panel._card.emitMembershipState(true);
    expect(status.classList.contains('routine-ready-hint')).toBe(false);
    expect(status.textContent).toContain('Finish editing lights');
    panel._card.emitMembershipState(false);
    expect(status.classList.contains('routine-ready-hint')).toBe(true);

    select.focus();
    const option = select.options[0];
    panel._handoffNotice = 'The group is still starting.';
    panel._render();
    expect(status.classList.contains('routine-ready-hint')).toBe(false);
    expect(status.classList.contains('notice')).toBe(true);
    expect(status.textContent).toBe(panel._handoffNotice);
    panel._handoffNotice = null;
    panel._render();
    expect(status.classList.contains('routine-ready-hint')).toBe(true);
    expect(panel.shadowRoot!.querySelector('#entity-select')).toBe(select);
    expect(select.options[0]).toBe(option);
    expect(panel.shadowRoot!.activeElement).toBe(select);
  });

  it.each(['loading', 'empty', 'error'] as const)(
    'restores guidance through ready → %s → ready',
    async (view) => {
      const entities = [{ entity_id: 'light.alpha', name: 'Alpha' }];
      const panel = await mountPanel(
        makePanelHass({ callWS: vi.fn().mockResolvedValue({ entities }) })
      );
      await flushPanel();
      const intro = panel.shadowRoot!.querySelector('.panel-intro')!;
      const status = panel.shadowRoot!.querySelector('#status-msg')!;
      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
      select.focus();
      panel._lightenerEntities = [];
      panel._selectedEntity = null;
      panel._loadingEntities = view === 'loading';
      panel._loadEntitiesError =
        view === 'error' ? 'Could not load Lightener Studio groups.' : null;
      panel._render();
      expect(intro.classList.contains('ready')).toBe(false);
      expect(status.classList.contains('routine-ready-hint')).toBe(false);
      expect(status.textContent!.length).toBeGreaterThan(0);
      expect(panel.shadowRoot!.activeElement).toBe(select);

      panel._lightenerEntities = entities;
      panel._selectedEntity = 'light.alpha';
      panel._loadingEntities = false;
      panel._loadEntitiesError = null;
      panel._render();
      expect(intro.classList.contains('ready')).toBe(true);
      expect(status.classList.contains('routine-ready-hint')).toBe(true);
      expect(panel.shadowRoot!.querySelector('#entity-select')).toBe(select);
      expect(panel.shadowRoot!.activeElement).toBe(select);
    }
  );

  it('opens Home Assistant navigation from a narrow editor panel', async () => {
    const panel = await mountPanel(
      makePanelHass({
        localize: (key) =>
          key === 'ui.sidebar.sidebar_toggle' ? 'Open Home Assistant navigation' : key,
      })
    );
    panel.narrow = true;
    await flushPanel();

    const menu = panel.shadowRoot!.querySelector<HTMLElement & { label?: string }>(
      '#sidebar-menu-button'
    );
    expect(menu).not.toBeNull();
    expect(menu?.hidden).toBe(false);
    expect(menu?.label).toBe('Open Home Assistant navigation');

    const events: Event[] = [];
    const onToggle = (event: Event) => events.push(event);
    document.body.addEventListener('hass-toggle-menu', onToggle);
    try {
      menu!.click();
    } finally {
      document.body.removeEventListener('hass-toggle-menu', onToggle);
    }

    expect(events).toHaveLength(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });

  it('matches Home Assistant menu visibility for hidden, docked, and kiosk layouts', async () => {
    const hass = makePanelHass({ dockedSidebar: 'always_hidden' });
    const panel = await mountPanel(hass);
    const menu = panel.shadowRoot!.querySelector<HTMLElement>('#sidebar-menu-button');

    expect(menu).not.toBeNull();
    expect(menu?.hidden).toBe(false);

    const events: Event[] = [];
    const onToggle = (event: Event) => events.push(event);
    document.body.addEventListener('hass-toggle-menu', onToggle);
    try {
      menu!.click();
    } finally {
      document.body.removeEventListener('hass-toggle-menu', onToggle);
    }

    expect(events).toHaveLength(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);

    panel.hass = { ...hass, dockedSidebar: 'auto' };
    await flushPanel();
    expect(menu?.hidden).toBe(true);

    panel.hass = { ...hass, dockedSidebar: 'docked' };
    await flushPanel();
    expect(menu?.hidden).toBe(true);

    panel.narrow = true;
    await flushPanel();
    expect(menu?.hidden).toBe(false);

    panel.hass = { ...hass, kioskMode: true };
    await flushPanel();
    expect(menu?.hidden).toBe(true);
  });

  it.each([true, false])(
    'clears a missing group and offers an accessible escape (admin: %s)',
    async (isAdmin) => {
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
      panel.hass = makePanelHass({ user: { is_admin: isAdmin } });
      await Promise.resolve();

      const mount = panel.shadowRoot!.querySelector('#card-mount')!;
      expect(mount.children).toHaveLength(1);
      expect(panel._card).not.toBeNull();
      expect(
        (panel._card as HTMLElement & { config?: { embedded?: boolean } }).config
      ).toMatchObject({
        entity: 'light.test',
        embedded: true,
      });
      // The sidebar inherits the card's Joy defaults without separate state.
      expect((panel._card as HTMLElement & { config?: object }).config).not.toHaveProperty('joy');

      panel._lightenerEntities = [];
      panel.hass = makePanelHass({ user: { is_admin: isAdmin } });
      await Promise.resolve();

      expect(mount.children).toHaveLength(1);
      expect(panel._card).toBeNull();
      expect(panel.shadowRoot!.querySelector('#status-msg')!.textContent).toBe(
        'This Lightener Studio setup has no editable group yet.'
      );
      expect(mount.textContent).toContain('No editable group yet');
      const escape = mount.querySelector<HTMLAnchorElement>('a')!;
      expect(escape.textContent).toBe(isAdmin ? 'Open Integrations' : 'Choose another group');
      expect(escape.getAttribute('href')).toBe(
        isAdmin ? '/config/integrations' : '/lightener-editor'
      );
      expect(escape.rel).toBe(isAdmin ? '' : 'external');
    }
  );

  it('renders a retryable load error instead of the no-groups empty state', async () => {
    const hass = makePanelHass({
      callWS: vi.fn().mockRejectedValueOnce(new Error('list failed')),
    });

    const panel = await mountPanel(hass);
    await flushPanel();

    const status = panel.shadowRoot!.querySelector('#status-msg')!;
    const mount = panel.shadowRoot!.querySelector('#card-mount')!;
    expect(status.className).toBe('error');
    expect(status.textContent).toBe(
      'Could not load Lightener Studio groups. Check the connection and try again.'
    );
    expect(mount.textContent).toContain('Groups did not load');
    expect(mount.textContent).toContain('Retry');
    expect(mount.textContent).not.toContain('Create your first group');
  });

  it('uses the full product name in the unnamed-group and load-error fallbacks', async () => {
    const panel = await mountPanel();
    await flushPanel();

    expect(panel._getEntityLabel(null)).toBe('this Lightener Studio group');
    panel._loadEntitiesError = null;
    panel._renderEntityLoadError();
    expect(panel.shadowRoot!.querySelector('.load-error-state p')!.textContent).toBe(
      'Could not load Lightener Studio groups.'
    );
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
        expect(status.textContent).toContain('Could not load Lightener Studio groups');
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

    it('keeps a fallback-served editor mounted when the group list call times out', async () => {
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

        // Fallback entities make 'light.alpha' selectable and editable
        // before the slow lightener/list_entities call ever settles.
        const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
        expect(select.value).toBe('light.alpha');

        await vi.advanceTimersByTimeAsync(10_000);
        await flushPanel();

        const status = panel.shadowRoot!.querySelector('#status-msg')!;
        const mount = panel.shadowRoot!.querySelector('#card-mount')!;
        // The editor is still alive via fallback entities — no error UI,
        // no torn-down card, even though the real list call never returned.
        expect(status.className).not.toBe('error');
        expect(mount.textContent).not.toContain('Groups did not load');
        expect(mount.querySelector('lightener-curve-card')).not.toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('defers fallback-backed retries until HA publishes a new state snapshot', async () => {
      vi.useFakeTimers();
      try {
        const states = {
          'light.alpha': {
            state: 'on',
            attributes: { friendly_name: 'Alpha', entity_id: 'light.a' },
          },
        };
        const hass = makePanelHass({
          states,
          callWS: vi
            .fn()
            .mockReturnValueOnce(new Promise(() => {}))
            .mockResolvedValueOnce({ entities: [{ entity_id: 'light.alpha', name: 'Alpha' }] }),
        });

        const panel = await mountPanel(hass);
        await vi.advanceTimersByTimeAsync(10_000);
        await flushPanel();

        // The panel's finally block re-applies hass. That tick, plus any later
        // tick using the same snapshot, must preserve the fallback editor
        // without starting another list_entities request.
        expect(hass.callWS).toHaveBeenCalledTimes(1);
        panel.hass = { ...hass, states };
        await flushPanel();
        expect(hass.callWS).toHaveBeenCalledTimes(1);

        // A new HA states object is the automatic retry boundary.
        panel.hass = {
          ...hass,
          states: {
            ...states,
            'light.beta': {
              state: 'off',
              attributes: { friendly_name: 'Beta', entity_id: 'light.b' },
            },
          },
        };
        await flushPanel();
        expect(hass.callWS).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('logs a late WebSocket failure after preserving a fallback editor', async () => {
      vi.useFakeTimers();
      const lateFailure = new Error('socket closed');
      let rejectRequest: (error: Error) => void = () => {};
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const hass = makePanelHass({
          states: {
            'light.alpha': {
              state: 'on',
              attributes: { friendly_name: 'Alpha', entity_id: 'light.a' },
            },
          },
          callWS: vi.fn().mockReturnValue(
            new Promise((_, reject: (error: Error) => void) => {
              rejectRequest = reject;
            })
          ),
        });

        await mountPanel(hass);
        await vi.advanceTimersByTimeAsync(10_000);
        rejectRequest(lateFailure);
        await flushPanel();

        expect(errorSpy).toHaveBeenLastCalledWith(
          '[Lightener] Lightener groups request failed after timeout:',
          lateFailure
        );
      } finally {
        errorSpy.mockRestore();
        vi.useRealTimers();
      }
    });

    it.each([
      {
        title: 'Unique names stand alone',
        entities: [
          { entity_id: 'light.beta', name: 'Beta' },
          { entity_id: 'light.alpha', name: 'Alpha' },
        ],
        labels: ['Beta', 'Alpha'],
      },
      {
        title: 'Duplicate names include IDs',
        entities: [
          { entity_id: 'light.alpha', name: 'Room' },
          { entity_id: 'light.beta', name: 'Room' },
          { entity_id: 'light.gamma', name: 'Other room' },
        ],
        labels: ['Room (light.alpha)', 'Room (light.beta)', 'Other room'],
      },
      {
        title: 'Unnamed groups fall back to IDs',
        entities: [{ entity_id: 'light.unnamed', name: '' }],
        labels: ['light.unnamed'],
      },
      {
        title: 'Formatted labels do not collide with literal names',
        entities: [
          { entity_id: 'light.alpha', name: 'Room' },
          { entity_id: 'light.beta', name: 'Room' },
          { entity_id: 'light.gamma', name: 'Room (light.alpha)' },
        ],
        labels: [
          'Room (light.alpha) (light.alpha)',
          'Room (light.beta)',
          'Room (light.alpha) (light.gamma)',
        ],
      },
      {
        title: 'Disambiguation skips existing literal suffix chains',
        entities: [
          { entity_id: 'light.alpha', name: 'Room' },
          { entity_id: 'light.beta', name: 'Room' },
          { entity_id: 'light.gamma', name: 'Room (light.alpha)' },
          { entity_id: 'light.delta', name: 'Room (light.alpha) (light.alpha)' },
          { entity_id: 'light.epsilon', name: 'Room (light.alpha) (light.alpha) (light.alpha)' },
          { entity_id: 'light.zeta', name: 'Room (light.alpha) (light.gamma)' },
        ],
        labels: [
          'Room (light.alpha) (light.alpha) (light.alpha) (light.alpha)',
          'Room (light.beta)',
          'Room (light.alpha) (light.gamma) (light.gamma)',
          'Room (light.alpha) (light.alpha)',
          'Room (light.alpha) (light.alpha) (light.alpha)',
          'Room (light.alpha) (light.gamma)',
        ],
      },
      {
        title: 'Fallback labels do not collide with literal names',
        entities: [
          { entity_id: 'light.alpha', name: '' },
          { entity_id: 'light.beta', name: 'light.alpha' },
          { entity_id: 'light.gamma', name: 'light.alpha (light.alpha)' },
        ],
        labels: [
          'light.alpha (light.alpha) (light.alpha)',
          'light.alpha (light.beta)',
          'light.alpha (light.alpha) (light.gamma)',
        ],
      },
    ])('$title', async ({ entities, labels }) => {
      const panel = await mountPanel(
        makePanelHass({ callWS: vi.fn().mockResolvedValue({ entities }) })
      );
      await flushPanel();
      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
      expect(Array.from(select.options, (option) => option.textContent)).toEqual(labels);
      expect(new Set(Array.from(select.options, (option) => option.textContent)).size).toBe(
        entities.length
      );
      expect(Array.from(select.options, (option) => option.value)).toEqual(
        entities.map((entity) => entity.entity_id)
      );
    });

    it('updates duplicate labels in both directions without changing selection', async () => {
      const panel = await mountPanel(
        makePanelHass({
          callWS: vi.fn().mockResolvedValue({
            entities: [
              { entity_id: 'light.alpha', name: 'Alpha' },
              { entity_id: 'light.beta', name: 'Beta' },
            ],
          }),
        })
      );
      await flushPanel();
      panel._setSelectedEntity('light.beta');
      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;

      panel._lightenerEntities = [
        { entity_id: 'light.alpha', name: 'Room' },
        { entity_id: 'light.beta', name: 'Room' },
      ];
      panel.hass = makePanelHass();
      expect(Array.from(select.options, (option) => option.textContent)).toEqual([
        'Room (light.alpha)',
        'Room (light.beta)',
      ]);
      expect(select.value).toBe('light.beta');

      panel._lightenerEntities = [{ entity_id: 'light.beta', name: 'Room' }];
      panel.hass = makePanelHass();
      expect(Array.from(select.options, (option) => option.textContent)).toEqual(['Room']);
      expect(select.value).toBe('light.beta');
    });

    it('defers label-only changes until blur and coalesces to the latest names', async () => {
      const panel = await mountPanel(
        makePanelHass({
          callWS: vi.fn().mockResolvedValue({
            entities: [
              { entity_id: 'light.alpha', name: 'Room' },
              { entity_id: 'light.beta', name: 'Room' },
            ],
          }),
        })
      );
      await flushPanel();
      panel._setSelectedEntity('light.beta');
      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
      select.focus();
      const before = Array.from(select.options);

      for (const name of ['Earlier name', 'Latest name']) {
        panel._lightenerEntities = [
          { entity_id: 'light.alpha', name: 'Room' },
          { entity_id: 'light.beta', name },
        ];
        panel.hass = makePanelHass();
        await flushPanel();
        expect(Array.from(select.options)).toEqual(before);
        expect(Array.from(select.options, (option) => option.textContent)).toEqual([
          'Room (light.alpha)',
          'Room (light.beta)',
        ]);
      }

      select.blur();
      expect(Array.from(select.options, (option) => option.textContent)).toEqual([
        'Room',
        'Latest name',
      ]);
      expect(select.value).toBe('light.beta');

      select.focus();
      panel._lightenerEntities = [
        { entity_id: 'light.alpha', name: 'Room' },
        { entity_id: 'light.beta', name: 'Room' },
      ];
      panel.hass = makePanelHass();
      expect(Array.from(select.options, (option) => option.textContent)).toEqual([
        'Room',
        'Latest name',
      ]);
      select.blur();
      expect(Array.from(select.options, (option) => option.textContent)).toEqual([
        'Room (light.alpha)',
        'Room (light.beta)',
      ]);
      expect(select.value).toBe('light.beta');
    });

    it('defers formatted-label collisions until blur and keeps the selection', async () => {
      const panel = await mountPanel(
        makePanelHass({
          callWS: vi.fn().mockResolvedValue({
            entities: [
              { entity_id: 'light.alpha', name: 'Room' },
              { entity_id: 'light.beta', name: 'Room' },
              { entity_id: 'light.gamma', name: 'Other room' },
            ],
          }),
        })
      );
      await flushPanel();
      panel._setSelectedEntity('light.beta');
      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
      const before = Array.from(select.options);
      select.focus();

      for (const name of ['Room (light.alpha)', 'Room (light.beta)']) {
        panel._lightenerEntities = [
          { entity_id: 'light.alpha', name: 'Room' },
          { entity_id: 'light.beta', name: 'Room' },
          { entity_id: 'light.gamma', name },
        ];
        panel.hass = makePanelHass();
        await flushPanel();
        expect(Array.from(select.options)).toEqual(before);
        expect(select.options[2].textContent).toBe('Other room');
      }

      select.blur();
      expect(Array.from(select.options, (option) => option.textContent)).toEqual([
        'Room (light.alpha)',
        'Room (light.beta) (light.beta)',
        'Room (light.beta) (light.gamma)',
      ]);
      expect(Array.from(select.options, (option) => option.value)).toEqual([
        'light.alpha',
        'light.beta',
        'light.gamma',
      ]);
      expect(select.value).toBe('light.beta');

      panel._lightenerEntities[2] = { entity_id: 'light.gamma', name: 'Other room' };
      panel.hass = makePanelHass();
      expect(Array.from(select.options, (option) => option.textContent)).toEqual([
        'Room (light.alpha)',
        'Room (light.beta)',
        'Other room',
      ]);
      expect(select.value).toBe('light.beta');
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
        expect(mount.textContent).toContain(
          'Looking for Lightener Studio groups in Home Assistant.'
        );
        expect(panel.shadowRoot!.querySelector('#status-msg')!.textContent).toBe(
          'Loading Lightener Studio groups...'
        );
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

  it('imports the card from the single stable unversioned URL (no path stamp, no ?v=)', async () => {
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

    // Restart-free releases depend on the card being served from one stable route:
    // no path-stamped .<version>.js segment, no ?v= query.
    expect(panel._cardModuleUrl).toBe('/lightener/lightener-curve-card.js');
  });

  it('reloads after import when the service-worker-served card version is stale', async () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      _ensureCardScriptLoaded: () => Promise<void>;
      _reloadForStaleCard: () => void;
      _cardScriptPromise?: Promise<unknown>;
    };
    let reloadRequested = false;
    panel._reloadForStaleCard = () => {
      reloadRequested = true;
    };
    // Simulate: the SW served a stale cached bundle that reported an old version at
    // eval time. A pre-resolved promise stands in for the completed import().
    panel._cardScriptPromise = Promise.resolve();
    (
      window as unknown as { __LIGHTENER_CURVE_CARD_VERSION__?: string }
    ).__LIGHTENER_CURVE_CARD_VERSION__ = '2.14.0';
    // Mask the already-registered FakeCurveCard so _ensureCardScriptLoaded skips
    // the pre-registered-class branch and reaches the post-import stale check.
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

  // Upgrade-scenario backstop: with the card served from a stable URL, the HA
  // service worker can serve a stale cached bundle after an update. The stale-card
  // reload guard is what forces the fresh (background-revalidated) bundle to take
  // over. It MUST reload exactly once and never loop — a loop would trap the user
  // in a reload cycle. (The full "update, then refresh" SW behavior needs
  // validation with a real HA service worker; jsdom has no SW/caches.)
  // window.location.reload is non-configurable in jsdom and cannot be spied, so
  // these assert the reload-once / no-loop guarantee via its actual mechanism: the
  // sessionStorage guard. _reloadForStaleCard writes CARD_VERSION to sessionStorage
  // immediately before window.location.reload(), and returns early (no reload) when
  // that key is already present or when sessionStorage throws. setItem-called-once
  // therefore stands in for reload-attempted-once.
  it('arms the reload guard exactly once and suppresses a repeat for the same version', () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & { _reloadForStaleCard: () => void };
    window.sessionStorage.clear();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    try {
      panel._reloadForStaleCard();
      // Second call for the same version is blocked by the sessionStorage guard,
      // so it never reaches the setItem-then-reload path again.
      panel._reloadForStaleCard();
      expect(setItemSpy).toHaveBeenCalledTimes(1);
    } finally {
      setItemSpy.mockRestore();
      window.sessionStorage.clear();
    }
  });

  it('does not throw or arm a reload when sessionStorage is unavailable (no reload loop)', () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & { _reloadForStaleCard: () => void };
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('sessionStorage blocked');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    try {
      // The read throws inside the guard's try/catch, so it bails before reloading.
      expect(() => panel._reloadForStaleCard()).not.toThrow();
      expect(setItemSpy).not.toHaveBeenCalled();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  });

  it('does not throw or reload when the sessionStorage write is blocked (read ok)', () => {
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & { _reloadForStaleCard: () => void };
    window.sessionStorage.clear();
    // Read succeeds (no prior key), but the write throws — e.g. Safari private mode
    // historically. The write is inside the same try/catch, so the guard must bail
    // (return before reload) rather than throw.
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sessionStorage write blocked');
    });
    try {
      expect(() => panel._reloadForStaleCard()).not.toThrow();
    } finally {
      setItemSpy.mockRestore();
      window.sessionStorage.clear();
    }
  });

  it('does not reload a second time across a reload boundary when the card stays stale', async () => {
    // The real loop risk: page loads → stale → reload → page reloads → the SW is
    // STILL serving the stale bundle → the guard must NOT reload again. The
    // sessionStorage key (persisted across the reload) is what defends against it.
    // Modeled as two fresh panels sharing sessionStorage, both seeing a stale global.
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const w = window as unknown as { __LIGHTENER_CURVE_CARD_VERSION__?: string };
    const prev = w.__LIGHTENER_CURVE_CARD_VERSION__;
    window.sessionStorage.clear();
    // SW keeps serving a stale card bundle across reloads: never matches CARD_VERSION.
    w.__LIGHTENER_CURVE_CARD_VERSION__ = '2.14.0';
    // Mask the pre-registered class so both loads reach the post-import stale check.
    const savedGet = customElements.get.bind(customElements);
    const getSpy = vi.spyOn(customElements, 'get').mockImplementation((name) => {
      if (name === 'lightener-curve-card') return undefined;
      return savedGet(name);
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    try {
      // First load: stale detected → real guard arms (writes the key) → reload.
      const first = new Panel() as HTMLElement & {
        _ensureCardScriptLoaded: () => Promise<void>;
        _cardScriptPromise?: Promise<unknown>;
      };
      first._cardScriptPromise = Promise.resolve();
      await first._ensureCardScriptLoaded();
      // Second load AFTER the reload: key persists, card still stale. The guard must
      // short-circuit on the persisted key and NOT arm/reload again.
      const second = new Panel() as HTMLElement & {
        _ensureCardScriptLoaded: () => Promise<void>;
        _cardScriptPromise?: Promise<unknown>;
      };
      second._cardScriptPromise = Promise.resolve();
      await second._ensureCardScriptLoaded();
      // Exactly one arm across both loads → no reload loop.
      expect(setItemSpy).toHaveBeenCalledTimes(1);
    } finally {
      getSpy.mockRestore();
      setItemSpy.mockRestore();
      window.sessionStorage.clear();
      if (prev === undefined) {
        delete w.__LIGHTENER_CURVE_CARD_VERSION__;
      } else {
        w.__LIGHTENER_CURVE_CARD_VERSION__ = prev;
      }
    }
  });

  it('does not reload after import when the loaded card version matches CARD_VERSION', async () => {
    // Negative arm of the post-import stale check (lightener-panel.js): a
    // freshly-served card whose version matches the panel must NOT trigger a reload.
    const Panel = customElements.get('lightener-editor-panel');
    if (!Panel) {
      throw new Error('lightener-editor-panel was not defined');
    }
    const panel = new Panel() as HTMLElement & {
      _ensureCardScriptLoaded: () => Promise<void>;
      _reloadForStaleCard: () => void;
      _cardScriptPromise?: Promise<unknown>;
    };
    let reloadRequested = false;
    panel._reloadForStaleCard = () => {
      reloadRequested = true;
    };
    const w = window as unknown as {
      __LIGHTENER_CURVE_CARD_VERSION__?: string;
      __LIGHTENER_PANEL_CARD_VERSION__?: string;
    };
    const prev = w.__LIGHTENER_CURVE_CARD_VERSION__;
    const panelCardVersion = w.__LIGHTENER_PANEL_CARD_VERSION__;
    if (!panelCardVersion) {
      throw new Error('__LIGHTENER_PANEL_CARD_VERSION__ not set by panel module');
    }
    // The (revalidated) card reports the same version the panel was compiled for.
    w.__LIGHTENER_CURVE_CARD_VERSION__ = panelCardVersion;
    panel._cardScriptPromise = Promise.resolve();
    const savedGet = customElements.get.bind(customElements);
    const getSpy = vi.spyOn(customElements, 'get').mockImplementation((name) => {
      if (name === 'lightener-curve-card') return undefined;
      return savedGet(name);
    });
    try {
      await panel._ensureCardScriptLoaded();
      expect(reloadRequested).toBe(false);
    } finally {
      getSpy.mockRestore();
      if (prev === undefined) {
        delete w.__LIGHTENER_CURVE_CARD_VERSION__;
      } else {
        w.__LIGHTENER_CURVE_CARD_VERSION__ = prev;
      }
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

  it.each([
    {
      title: 'Duplicate group names',
      names: ['Room', 'Room'],
      labels: ['Room (light.alpha)', 'Room (light.beta)'],
    },
    { title: 'Unnamed groups', names: ['', ''], labels: ['light.alpha', 'light.beta'] },
    { title: 'Unique group names', names: ['Alpha', 'Beta'], labels: ['Alpha', 'Beta'] },
  ])('$title match between picker and unsaved-switch message', async ({ names, labels }) => {
    const panel = await mountPanel(
      makePanelHass({
        callWS: vi.fn().mockResolvedValue({
          entities: [
            { entity_id: 'light.alpha', name: names[0] },
            { entity_id: 'light.beta', name: names[1] },
          ],
        }),
      })
    );
    await flushPanel();
    panel._card.emitDirtyState(true);
    const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
    expect(Array.from(select.options, (option) => option.textContent)).toEqual(labels);
    select.value = 'light.beta';
    select.dispatchEvent(new Event('change'));

    expect(panel._pendingEntity).toBe('light.beta');
    expect(select.value).toBe('light.alpha');
    expect(panel.shadowRoot!.querySelector('#switch-guard-text')!.textContent).toBe(
      `Unsaved changes in ${labels[0]}. Save or discard before switching to ${labels[1]}.`
    );
  });

  it('disambiguates formatted labels in both the picker and dirty-switch message', async () => {
    const panel = await mountPanel(
      makePanelHass({
        callWS: vi.fn().mockResolvedValue({
          entities: [
            { entity_id: 'light.alpha', name: 'Room' },
            { entity_id: 'light.beta', name: 'Room' },
            { entity_id: 'light.gamma', name: 'Room (light.alpha)' },
          ],
        }),
      })
    );
    await flushPanel();
    panel._card.emitDirtyState(true);
    const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
    const labels = Array.from(select.options, (option) => option.textContent);
    expect(labels[0]).not.toBe(labels[2]);
    select.value = 'light.gamma';
    select.dispatchEvent(new Event('change'));

    expect(panel._pendingEntity).toBe('light.gamma');
    expect(select.value).toBe('light.alpha');
    expect(panel._card.config?.entity).toBe('light.alpha');
    expect(panel.shadowRoot!.querySelector('#switch-guard-text')!.textContent).toBe(
      `Unsaved changes in ${labels[0]}. Save or discard before switching to ${labels[2]}.`
    );
  });

  it('gates group switching and new-group navigation while Edit lights is open', async () => {
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

    panel._card.emitMembershipState(true);
    const select = panel.shadowRoot!.querySelector('#entity-select') as HTMLSelectElement;
    const newGroup = panel.shadowRoot!.querySelector('#new-group-btn') as HTMLButtonElement;
    expect(select.disabled).toBe(true);
    expect(newGroup.disabled).toBe(true);

    select.value = 'light.beta';
    select.dispatchEvent(new Event('change'));
    expect(panel._card.config).toMatchObject({ entity: 'light.alpha' });

    panel._card.emitMembershipState(false);
    expect(select.disabled).toBe(false);
    expect(newGroup.disabled).toBe(false);
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

  describe('exact Lightener Studio handoff', () => {
    const oldGroup = { entity_id: 'light.old', name: 'Old', config_entry_id: 'old-entry' };
    const newGroup = { entity_id: 'light.new', name: 'New', config_entry_id: 'new-entry' };
    const groupList = { entities: [oldGroup, newGroup] };

    function rejectedHandoff(code: string, entities = groupList.entities) {
      return makePanelHass({
        callWS: vi
          .fn()
          .mockImplementation(({ type }: { type: string }) =>
            type === 'lightener/resolve_handoff'
              ? Promise.reject({ code, message: 'Handoff expired' })
              : Promise.resolve({ entities })
          ),
      });
    }

    async function selectGroupAndReopen(panel: PanelInstance, hass: PanelHass) {
      const select = panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!;
      select.value = 'light.new';
      select.dispatchEvent(new Event('change'));
      await flushPanel();
      expect(panel._card.config).toMatchObject({ entity: 'light.new', firstRun: false });
      panel.remove();

      const returned = await mountPanel(hass);
      await flushPanel();
      expect(returned._card.config).toMatchObject({ entity: 'light.new', firstRun: false });
      expect(
        hass.callWS.mock.calls.filter(([message]) => message.type === 'lightener/resolve_handoff')
      ).toHaveLength(1);
      expect(hass.callApi).not.toHaveBeenCalled();
    }

    function setSearch(search: string) {
      const url = new URL(window.location.href);
      url.search = search;
      window.history.replaceState(null, '', url.toString());
    }

    beforeEach(() => setSearch(''));

    it('resolves the token to one config entry and enables first-run coaching', async () => {
      setSearch('?handoff=one-time-token&keepme=1');
      const hass = makePanelHass({
        callWS: vi.fn().mockImplementation((message: { type: string; token?: string }) => {
          if (message.type === 'lightener/resolve_handoff') {
            expect(message.token).toBe('one-time-token');
            return Promise.resolve({ config_entry_id: 'new-entry', first_run_eligible: true });
          }
          if (message.type === 'lightener/list_entities') {
            return Promise.resolve(groupList);
          }
          return Promise.reject(new Error(`Unexpected ${message.type}`));
        }),
      });

      const panel = await mountPanel(hass);
      await flushPanel();
      await flushPanel();

      expect(panel._card.config).toMatchObject({
        entity: 'light.new',
        firstRun: true,
      });
      expect(window.location.search).toContain('keepme=1');
      expect(window.location.search).not.toContain('handoff');
    });

    it('keeps the query while setup retries, then strips it after success', async () => {
      vi.useFakeTimers();
      try {
        setSearch('?handoff=slow-token');
        const hass = makePanelHass({
          callWS: vi
            .fn()
            .mockRejectedValueOnce({ code: 'unknown_command' })
            .mockResolvedValueOnce({ config_entry_id: 'new-entry', first_run_eligible: true })
            .mockResolvedValueOnce({
              entities: [{ entity_id: 'light.new', name: 'New', config_entry_id: 'new-entry' }],
            }),
        });

        const panel = await mountPanel(hass);
        await flushPanel();
        expect(window.location.search).toContain('handoff=slow-token');
        await vi.advanceTimersByTimeAsync(250);
        await flushPanel();
        await flushPanel();

        expect(panel._card.config).toMatchObject({ entity: 'light.new', firstRun: true });
        expect(window.location.search).not.toContain('handoff');
      } finally {
        vi.useRealTimers();
      }
    });

    it('recovers the exact group on refresh after setup outlasts automatic retries', async () => {
      vi.useFakeTimers();
      try {
        setSearch('?handoff=delayed-token');
        let setupReady = false;
        const hass = makePanelHass({
          callWS: vi.fn().mockImplementation((message: { type: string }) => {
            if (message.type === 'lightener/resolve_handoff') {
              return setupReady
                ? Promise.resolve({ config_entry_id: 'new-entry', first_run_eligible: false })
                : Promise.reject({ code: 'unknown_command' });
            }
            return Promise.resolve(groupList);
          }),
        });
        const waiting = await mountPanel(hass);
        await flushPanel();
        await vi.advanceTimersByTimeAsync(3750);
        await flushPanel();
        expect(waiting._card).toBeNull();
        expect(waiting.shadowRoot!.textContent).toContain('Could not open this group. Try again.');
        expect(window.location.search).toContain('handoff=delayed-token');

        waiting.remove();
        setupReady = true;
        const refreshed = await mountPanel(hass);
        await flushPanel();
        await flushPanel();

        expect(refreshed._card.config).toMatchObject({ entity: 'light.new' });
        expect(window.location.search).not.toContain('handoff');
        expect(hass.callApi).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it.each([false, true])(
      'retries an exhausted handoff without opening another group (state fallback: %s)',
      async (withFallback) => {
        vi.useFakeTimers();
        try {
          setSearch('?handoff=retry-exhausted-token&keepme=1');
          window.localStorage.setItem('lightener_editor_entity', 'light.old');
          let setupReady = false;
          const hass = makePanelHass({
            states: withFallback
              ? { 'light.old': { attributes: { entity_id: 'light.member' } } }
              : {},
            callWS: vi.fn().mockImplementation((message: { type: string }) => {
              if (message.type === 'lightener/resolve_handoff') {
                return setupReady
                  ? Promise.resolve({ config_entry_id: 'new-entry', first_run_eligible: false })
                  : Promise.reject({ code: 'unknown_command' });
              }
              return Promise.resolve(groupList);
            }),
          });
          const panel = await mountPanel(hass);
          await flushPanel();
          expect(panel.shadowRoot!.querySelector('.loading-state')).not.toBeNull();
          await vi.advanceTimersByTimeAsync(3750);
          await flushPanel();
          expect(hass.callWS).toHaveBeenCalledTimes(5);

          const retry = panel.shadowRoot!.querySelector<HTMLButtonElement>(
            '.load-error-state button'
          )!;
          expect(retry.textContent).toBe('Retry');
          retry.click();
          await flushPanel();
          // A failed manual retry gets a fresh automatic retry budget. It must
          // neither list unrelated groups nor offer creation while unresolved.
          expect(hass.callWS).toHaveBeenCalledTimes(6);
          expect(
            hass.callWS.mock.calls.every(
              ([message]) => message.type === 'lightener/resolve_handoff'
            )
          ).toBe(true);
          expect(panel._card).toBeNull();
          expect(panel.shadowRoot!.querySelector('.loading-state')).not.toBeNull();
          expect(panel.shadowRoot!.textContent).not.toContain('Create group');
          expect(panel.shadowRoot!.querySelector<HTMLButtonElement>('#new-group-btn')!.hidden).toBe(
            true
          );
          expect(window.location.search).toContain('handoff=retry-exhausted-token');
          panel.hass = hass;
          await flushPanel();
          expect(hass.callWS).toHaveBeenCalledTimes(6);

          setupReady = true;
          await vi.advanceTimersByTimeAsync(250);
          await flushPanel();
          expect(panel._card.config).toMatchObject({ entity: 'light.new', firstRun: false });
          expect(panel._requestedConfigEntryId).toBe('new-entry');
          expect(window.location.search).toContain('config_entry=new-entry');
          expect(window.location.search).toContain('keepme=1');
          expect(window.location.search).not.toContain('handoff');
          expect(hass.callApi).not.toHaveBeenCalled();
        } finally {
          vi.useRealTimers();
        }
      }
    );

    it('opens the first group through the sidebar and after an ordinary return visit', async () => {
      const hass = makePanelHass({
        callWS: vi.fn().mockResolvedValue({
          entities: [{ entity_id: 'light.first', name: 'First', config_entry_id: 'first-entry' }],
        }),
      });

      const sidebar = await mountPanel(hass);
      await flushPanel();
      expect(sidebar._card.config).toMatchObject({ entity: 'light.first', firstRun: false });
      sidebar.remove();

      const returned = await mountPanel(hass);
      await flushPanel();
      expect(returned._card.config).toMatchObject({ entity: 'light.first', firstRun: false });
      expect(
        hass.callWS.mock.calls.every(([message]) => message.type === 'lightener/list_entities')
      ).toBe(true);
      expect(hass.callApi).not.toHaveBeenCalled();
    });

    it('does not re-fire resolve while a retry backoff timer is pending', async () => {
      vi.useFakeTimers();
      try {
        setSearch('?handoff=retry-token');
        let resolveCalls = 0;
        const hass = makePanelHass({
          callWS: vi.fn().mockImplementation((message: { type: string }) => {
            if (message.type === 'lightener/resolve_handoff') {
              resolveCalls += 1;
              return Promise.reject({ code: 'unknown_command' });
            }
            return Promise.resolve({ entities: [] });
          }),
        });

        const panel = await mountPanel(hass);
        await flushPanel();
        // First attempt failed and scheduled a 250ms retry; token still set.
        expect(resolveCalls).toBe(1);

        // HA pushes several state updates during the backoff window. Each drives
        // `set hass` -> _resolveStudioHandoff(); the pending-timer guard must
        // block them so no extra resolve fires and the timer is not orphaned.
        panel.hass = hass;
        panel.hass = hass;
        panel.hass = hass;
        await flushPanel();
        expect(resolveCalls).toBe(1);

        // The single scheduled retry still fires exactly once when it elapses.
        await vi.advanceTimersByTimeAsync(250);
        await flushPanel();
        expect(resolveCalls).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('waits for the resolved config entry entity instead of guessing another group', async () => {
      vi.useFakeTimers();
      try {
        setSearch('?handoff=entity-lag-token');
        const hass = makePanelHass({
          callWS: vi
            .fn()
            .mockResolvedValueOnce({ config_entry_id: 'new-entry', first_run_eligible: true })
            .mockResolvedValueOnce({ entities: [oldGroup] })
            .mockResolvedValueOnce(groupList),
        });

        const panel = await mountPanel(hass);
        await flushPanel();
        expect(panel._card).toBeNull();
        expect(panel.shadowRoot!.textContent).toContain('Loading Lightener Studio groups');

        await vi.advanceTimersByTimeAsync(250);
        await flushPanel();
        expect(panel._card.config).toMatchObject({ entity: 'light.new', firstRun: true });
      } finally {
        vi.useRealTimers();
      }
    });

    it.each(['?config_entry=new-entry', '?handoff=entity-lag-token'])(
      'keeps entity retries bounded during state updates from %s',
      async (search) => {
        vi.useFakeTimers();
        try {
          setSearch(search);
          let entityReady = false;
          const hass = makePanelHass({
            callWS: vi
              .fn()
              .mockImplementation((message: { type: string }) =>
                Promise.resolve(
                  message.type === 'lightener/resolve_handoff'
                    ? { config_entry_id: 'new-entry', first_run_eligible: false }
                    : { entities: entityReady ? [oldGroup, newGroup] : [] }
                )
              ),
          });
          const panel = await mountPanel(hass);
          await flushPanel();
          const listCalls = () =>
            hass.callWS.mock.calls.filter(([message]) => message.type === 'lightener/list_entities')
              .length;
          const publishStates = async () => {
            for (let update = 0; update < 4; update++) {
              panel.hass = { ...hass, states: {} };
              await flushPanel();
            }
          };

          for (const [index, delay] of [250, 500, 1000, 2000].entries()) {
            await publishStates();
            expect(listCalls()).toBe(index + 1);
            expect(panel.shadowRoot!.querySelector('.loading-state')).not.toBeNull();
            await vi.advanceTimersByTimeAsync(delay);
            await flushPanel();
          }

          await publishStates();
          await vi.advanceTimersByTimeAsync(10_000);
          expect(listCalls()).toBe(5);
          expect(panel._card).toBeNull();
          expect(panel._requestedConfigEntryId).toBe('new-entry');
          const retry = panel.shadowRoot!.querySelector<HTMLButtonElement>(
            '.load-error-state button'
          );
          expect(retry?.textContent).toBe('Retry');

          entityReady = true;
          retry!.click();
          await flushPanel();
          await flushPanel();
          expect(listCalls()).toBe(6);
          expect(panel._card.config).toMatchObject({ entity: 'light.new' });
          panel.remove();
        } finally {
          vi.useRealTimers();
        }
      }
    );

    it.each(['native', 'resolved handoff', 'unresolved handoff'])(
      'resumes %s retries after reconnect without resetting the budget',
      async (entry) => {
        vi.useFakeTimers();
        try {
          setSearch(entry === 'native' ? '?config_entry=new-entry' : '?handoff=retry-token');
          let ready = false;
          const hass = makePanelHass({
            callWS: vi.fn().mockImplementation(({ type }: { type: string }) => {
              if (type === 'lightener/resolve_handoff') {
                return entry === 'unresolved handoff' && !ready
                  ? Promise.reject({ code: 'unknown_command' })
                  : Promise.resolve({ config_entry_id: 'new-entry' });
              }
              return Promise.resolve({ entities: ready ? groupList.entities : [oldGroup] });
            }),
          });
          const requestType =
            entry === 'unresolved handoff'
              ? 'lightener/resolve_handoff'
              : 'lightener/list_entities';
          const calls = () =>
            hass.callWS.mock.calls.filter(([message]) => message.type === requestType).length;
          const panel = await mountPanel(hass);
          await flushPanel();
          await vi.advanceTimersByTimeAsync(250);
          expect(calls()).toBe(2);

          panel.remove();
          await vi.advanceTimersByTimeAsync(5000);
          expect(calls()).toBe(2);
          document.body.append(panel);
          await flushPanel();
          expect(calls()).toBe(3);
          expect(panel._card).toBeNull();
          panel.hass = { ...hass, states: {} };
          await flushPanel();
          expect(calls()).toBe(3);

          await vi.advanceTimersByTimeAsync(3000);
          expect(calls()).toBe(5);
          expect(panel.shadowRoot!.querySelector('.load-error-state')).not.toBeNull();
          // Returning to a terminal failure must keep Retry and the spent budget.
          panel.remove();
          document.body.append(panel);
          await flushPanel();
          expect(calls()).toBe(5);
          expect(panel._card).toBeNull();

          ready = true;
          panel.shadowRoot!.querySelector<HTMLButtonElement>('.load-error-state button')!.click();
          await flushPanel();
          await flushPanel();
          expect(calls()).toBe(6);
          expect(panel._requestedConfigEntryId).toBe('new-entry');
          expect(panel._card.config).toMatchObject({ entity: 'light.new' });
          panel.remove();
        } finally {
          vi.useRealTimers();
        }
      }
    );

    it.each([
      ['invalid_handoff', 'This setup link is no longer valid.'],
      ['invalid', 'This setup link is no longer valid.'],
      ['expired_handoff', 'This setup link has expired.'],
      ['expired', 'This setup link has expired.'],
      ['forbidden_handoff', 'You cannot open this setup link with this account.'],
      ['forbidden', 'You cannot open this setup link with this account.'],
      ['unauthorized', 'You cannot open this setup link with this account.'],
    ])('maps %s to a recovery notice and opens the group picker', async (code, notice) => {
      setSearch('?handoff=bad-token');
      const hass = rejectedHandoff(code);

      const panel = await mountPanel(hass);
      await flushPanel();

      expect(panel._card.config).toMatchObject({ entity: 'light.old', firstRun: false });
      expect(panel.shadowRoot!.textContent).toContain(notice);
      expect(panel.shadowRoot!.textContent).not.toContain('Handoff expired');
      expect(window.location.search).not.toContain('handoff');
    });

    it('recovers an expired handoff by choosing a group and reopening it', async () => {
      setSearch('?handoff=bad-token');
      const hass = rejectedHandoff('expired_handoff');
      const panel = await mountPanel(hass);
      await flushPanel();
      await selectGroupAndReopen(panel, hass);
    });

    it.each(['invalid_handoff', 'expired_handoff'])(
      'clears a scoped pending target after %s without retrying a missing target',
      async (code) => {
        vi.useFakeTimers();
        try {
          setSearch('?config_entry=missing-entry&handoff=bad-token&keepme=1');
          const hass = rejectedHandoff(code);
          const panel = await mountPanel(hass);
          await flushPanel();
          await flushPanel();

          expect(panel._requestedConfigEntryId).toBeNull();
          expect(panel._card.config).toMatchObject({ entity: 'light.old', firstRun: false });
          expect(panel.shadowRoot!.querySelector('.loading-state')).toBeNull();
          expect(panel.shadowRoot!.textContent).toContain(
            code === 'expired_handoff'
              ? 'This setup link has expired.'
              : 'This setup link is no longer valid.'
          );
          const params = new URLSearchParams(window.location.search);
          expect(params.has('handoff')).toBe(false);
          expect(params.has('config_entry')).toBe(false);
          expect(params.get('keepme')).toBe('1');

          await vi.advanceTimersByTimeAsync(3750);
          await flushPanel();
          expect(panel._card.config).toMatchObject({ entity: 'light.old' });
          expect(panel.shadowRoot!.querySelector('.load-error-state')).toBeNull();
          expect(
            hass.callWS.mock.calls.filter(([message]) => message.type === 'lightener/list_entities')
          ).toHaveLength(1);

          await selectGroupAndReopen(panel, hass);
        } finally {
          vi.useRealTimers();
        }
      }
    );

    it('keeps a terminal handoff notice visible when there are no groups', async () => {
      setSearch('?handoff=empty-bad-token');
      const hass = rejectedHandoff('expired_handoff', []);

      const panel = await mountPanel(hass);
      await flushPanel();

      expect(panel._card).toBeNull();
      expect(panel.shadowRoot!.querySelector('#status-msg')?.textContent).toContain(
        'This setup link has expired.'
      );
      expect(panel.shadowRoot!.querySelector('#status-msg')?.className).toBe('notice');
    });

    it('retains the resolved group through entity retry exhaustion and refresh', async () => {
      vi.useFakeTimers();
      try {
        setSearch('?handoff=slow-entity-token&keepme=1');
        let entityReady = false;
        const hass = makePanelHass({
          callWS: vi.fn().mockImplementation((message: { type: string }) => {
            if (message.type === 'lightener/resolve_handoff') {
              return Promise.resolve({ config_entry_id: 'new-entry', first_run_eligible: false });
            }
            return Promise.resolve({ entities: entityReady ? [oldGroup, newGroup] : [oldGroup] });
          }),
        });

        const waiting = await mountPanel(hass);
        await flushPanel();
        await flushPanel();
        await vi.advanceTimersByTimeAsync(3750);
        await flushPanel();

        // Exhausting retries must not silently open an unrelated editable group.
        expect(waiting._card).toBeNull();
        expect(waiting._requestedConfigEntryId).toBe('new-entry');
        expect(
          waiting.shadowRoot!.querySelector('.load-error-state .empty-state-cta')
        ).not.toBeNull();
        expect(window.location.search).toContain('config_entry=new-entry');
        expect(window.location.search).toContain('keepme=1');
        expect(window.location.search).not.toContain('handoff');

        waiting.remove();
        entityReady = true;
        const refreshed = await mountPanel(hass);
        await flushPanel();
        await flushPanel();
        expect(refreshed._card.config).toMatchObject({ entity: 'light.new' });
        expect(
          hass.callWS.mock.calls.filter(([message]) => message.type === 'lightener/resolve_handoff')
        ).toHaveLength(1);
        expect(hass.callApi).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps a refreshed target recoverable when its entity is still missing', async () => {
      vi.useFakeTimers();
      try {
        setSearch('?config_entry=new-entry');
        window.localStorage.setItem('lightener_editor_entity', 'light.old');
        let entityReady = false;
        const hass = makePanelHass({
          callWS: vi
            .fn()
            .mockImplementation(() =>
              Promise.resolve({ entities: entityReady ? [oldGroup, newGroup] : [oldGroup] })
            ),
        });
        const panel = await mountPanel(hass);
        await flushPanel();
        expect(panel._card).toBeNull();
        expect(panel.shadowRoot!.querySelector('.loading-state')).not.toBeNull();

        await vi.advanceTimersByTimeAsync(3750);
        await flushPanel();
        expect(panel._card).toBeNull();
        const retry = panel.shadowRoot!.querySelector<HTMLButtonElement>(
          '.load-error-state .empty-state-cta'
        );
        expect(retry).not.toBeNull();
        expect(panel.shadowRoot!.textContent).not.toContain('No Lightener Studio groups yet');

        entityReady = true;
        retry!.click();
        await flushPanel();
        await flushPanel();
        expect(panel._card.config).toMatchObject({ entity: 'light.new' });
        expect(
          hass.callWS.mock.calls.every(([message]) => message.type === 'lightener/list_entities')
        ).toBe(true);
        expect(hass.callApi).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it.each([true, false])(
      'offers an accessible escape after a missing target exhausts each scoped retry (admin: %s)',
      async (isAdmin) => {
        vi.useFakeTimers();
        try {
          setSearch('?config_entry=deleted-entry');
          const hass = makePanelHass({
            user: { is_admin: isAdmin },
            callWS: vi.fn().mockResolvedValue(groupList),
          });
          const panel = await mountPanel(hass);
          await flushPanel();
          for (let cycle = 0; cycle < 2; cycle++) {
            await vi.advanceTimersByTimeAsync(3750);
            await flushPanel();
            const error = panel.shadowRoot!.querySelector('.load-error-state')!;
            expect(error.textContent).toContain('This group is unavailable.');
            expect(error.textContent).not.toContain('still starting');
            const escape = error.querySelector<HTMLAnchorElement>('a')!;
            expect(escape.textContent).toBe(isAdmin ? 'Open Integrations' : 'Choose another group');
            expect(escape.getAttribute('href')).toBe(
              isAdmin ? '/config/integrations' : '/lightener-editor'
            );
            expect(escape.rel).toBe(isAdmin ? '' : 'external');
            expect(panel._card).toBeNull();
            expect(panel._requestedConfigEntryId).toBe('deleted-entry');
            expect(window.location.search).toBe('?config_entry=deleted-entry');
            expect(
              panel.shadowRoot!.querySelector<HTMLSelectElement>('#entity-select')!.disabled
            ).toBe(true);
            if (cycle === 0) {
              error.querySelector<HTMLButtonElement>('button')!.click();
              await flushPanel();
            }
          }
          expect(hass.callWS).toHaveBeenCalledTimes(10);
          expect(hass.callApi).not.toHaveBeenCalled();
        } finally {
          vi.useRealTimers();
        }
      }
    );

    it.each(['rejection', 'timeout'] as const)(
      'lets a scoped group recover from list %s through Retry',
      async (failure) => {
        vi.useFakeTimers();
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
          setSearch('?config_entry=new-entry');
          const hass = makePanelHass({
            callWS: vi
              .fn()
              .mockImplementationOnce(() =>
                failure === 'rejection'
                  ? Promise.reject(new Error('Socket closed'))
                  : new Promise(() => undefined)
              )
              .mockResolvedValue(groupList),
          });
          const panel = await mountPanel(hass);
          await flushPanel();
          if (failure === 'timeout') await vi.advanceTimersByTimeAsync(10_000);
          await flushPanel();

          expect(panel._card).toBeNull();
          expect(panel.shadowRoot!.querySelector('.loading-state')).toBeNull();
          const retry = panel.shadowRoot!.querySelector<HTMLButtonElement>(
            '.load-error-state .empty-state-cta'
          );
          expect(retry).not.toBeNull();
          retry!.click();
          await flushPanel();
          await flushPanel();
          expect(panel._card.config).toMatchObject({ entity: 'light.new' });
          expect(panel._requestedConfigEntryId).toBe('new-entry');
          expect(hass.callApi).not.toHaveBeenCalled();
        } finally {
          consoleError.mockRestore();
          vi.useRealTimers();
        }
      }
    );
  });
});
