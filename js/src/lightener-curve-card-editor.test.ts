// @vitest-environment jsdom

/**
 * The Lovelace visual editor — the surface a user sees when configuring the
 * card from a dashboard. It had no tests: `connectedCallback`, the picker
 * bootstrap and every config-changed path were unreached.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Hass } from './utils/types.js';

type Editor = HTMLElement & {
  setConfig: (config: Record<string, unknown>) => void;
  hass: Hass;
  updateComplete: Promise<boolean>;
  renderRoot: ParentNode;
};

beforeAll(async () => {
  await import('./lightener-curve-card.js');
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function makeHass(entities?: Record<string, { platform: string }>): Hass {
  return {
    user: { is_admin: true },
    states: {
      'light.group_a': { state: 'on', attributes: { friendly_name: 'Group A' } },
      'light.plain': { state: 'on', attributes: { friendly_name: 'Plain' } },
    },
    entities,
  } as unknown as Hass;
}

async function mountEditor(
  config: Record<string, unknown> = {},
  hass: Hass = makeHass()
): Promise<{ editor: Editor; changes: Array<Record<string, unknown>> }> {
  const editor = document.createElement('lightener-curve-card-editor') as Editor;
  editor.setConfig(config);
  editor.hass = hass;
  const changes: Array<Record<string, unknown>> = [];
  editor.addEventListener('config-changed', ((event: CustomEvent) => {
    changes.push(event.detail.config);
  }) as EventListener);
  document.body.appendChild(editor);
  await editor.updateComplete;
  return { editor, changes };
}

describe('the card exposes its editor to Lovelace', () => {
  it('hands back a registered editor element', async () => {
    const card = customElements.get('lightener-curve-card') as CustomElementConstructor & {
      getConfigElement: () => HTMLElement;
      getStubConfig: () => Record<string, unknown>;
    };

    const element = card.getConfigElement();

    expect(element.tagName.toLowerCase()).toBe('lightener-curve-card-editor');
    expect(customElements.get('lightener-curve-card-editor')).toBeDefined();
    expect(card.getStubConfig().type).toBeTruthy();
  });
});

describe('the editor bootstraps the entity picker', () => {
  it('kicks the lazy picker load on connect, on setConfig and on hass', async () => {
    const editor = document.createElement('lightener-curve-card-editor') as Editor;
    const ensureLoaded = vi.spyOn(
      (editor as unknown as { _picker: { ensureLoaded: () => void } })._picker,
      'ensureLoaded'
    );

    editor.setConfig({ entity: 'light.group_a' });
    editor.hass = makeHass();
    document.body.appendChild(editor);
    await editor.updateComplete;

    // Whichever of the three HA calls arrives first, the picker starts loading.
    expect(ensureLoaded.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('falls back to a plain input while the picker is unavailable', async () => {
    const { editor } = await mountEditor({ entity: 'light.group_a' });

    const inputs = editor.renderRoot.querySelectorAll('input');
    expect(editor.renderRoot.querySelector('ha-entity-picker')).toBeNull();
    // Entity fallback + title field.
    expect(inputs).toHaveLength(2);
    expect(editor.renderRoot.textContent).toContain('Entity picker unavailable');
  });
});

describe('the editor narrows the picker to Lightener groups', () => {
  // The picker never registers under jsdom, so pretend it did: EntityPickerLoader
  // reads customElements.get() synchronously and marks itself ready.
  function pretendPickerIsRegistered(): void {
    const real = customElements.get.bind(customElements);
    vi.spyOn(customElements, 'get').mockImplementation((name: string) =>
      name === 'ha-entity-picker'
        ? (class extends HTMLElement {} as CustomElementConstructor)
        : real(name)
    );
  }

  it('offers only registry-confirmed Lightener lights', async () => {
    pretendPickerIsRegistered();
    const hass = makeHass({
      'light.group_a': { platform: 'lightener_studio' },
      'light.plain': { platform: 'hue' },
    });
    const { editor } = await mountEditor({ entity: 'light.group_a' }, hass);

    const picker = editor.renderRoot.querySelector('ha-entity-picker') as HTMLElement & {
      includeEntities?: string[];
      value: string;
    };
    expect(picker, 'the picker renders once HA has registered it').not.toBeNull();
    expect(picker.includeEntities).toEqual(['light.group_a']);
    expect(picker.value).toBe('light.group_a');
    expect(editor.renderRoot.textContent).toContain('Only Lightener groups are listed');
  });

  it('falls back to every light when the entity registry is not hydrated', async () => {
    pretendPickerIsRegistered();
    const { editor } = await mountEditor({ entity: 'light.group_a' }, makeHass());

    const picker = editor.renderRoot.querySelector('ha-entity-picker') as HTMLElement & {
      includeEntities?: string[];
      includeDomains: string[];
    };
    // An empty allowlist would show an empty picker; showing all lights is the
    // deliberate degraded behaviour.
    expect(picker.includeEntities).toBeUndefined();
    expect(picker.includeDomains).toEqual(['light']);
  });

  it('commits a picker selection straight through', async () => {
    pretendPickerIsRegistered();
    const { editor, changes } = await mountEditor({ entity: 'light.group_a' });

    editor.renderRoot
      .querySelector('ha-entity-picker')!
      .dispatchEvent(new CustomEvent('value-changed', { detail: { value: 'light.picked' } }));

    expect(changes).toHaveLength(1);
    expect(changes[0].entity).toBe('light.picked');
  });

  it('renders with no entity configured', async () => {
    const { editor } = await mountEditor();

    expect(editor.renderRoot.querySelector('input')!.value).toBe('');
  });
});

describe('editing the config emits config-changed', () => {
  it('commits a typed entity id on change, trimmed', async () => {
    const { editor, changes } = await mountEditor({ entity: 'light.group_a' });

    const entityInput = editor.renderRoot.querySelectorAll('input')[0] as HTMLInputElement;
    entityInput.value = '  light.other  ';
    entityInput.dispatchEvent(new Event('change'));

    expect(changes).toHaveLength(1);
    expect(changes[0].entity).toBe('light.other');
  });

  it('does not commit on every keystroke', async () => {
    const { editor, changes } = await mountEditor({ entity: 'light.group_a' });

    const entityInput = editor.renderRoot.querySelectorAll('input')[0] as HTMLInputElement;
    entityInput.value = 'light.par';
    entityInput.dispatchEvent(new Event('input'));

    expect(changes).toHaveLength(0);
  });

  it('drops the entity key entirely when the field is cleared', async () => {
    const { editor, changes } = await mountEditor({ entity: 'light.group_a' });

    const entityInput = editor.renderRoot.querySelectorAll('input')[0] as HTMLInputElement;
    entityInput.value = '   ';
    entityInput.dispatchEvent(new Event('change'));

    expect(changes[0].entity).toBeUndefined();
  });

  it('commits the title on every keystroke and keeps the entity', async () => {
    const { editor, changes } = await mountEditor({ entity: 'light.group_a' });

    const titleInput = editor.renderRoot.querySelectorAll('input')[1] as HTMLInputElement;
    titleInput.value = 'Evening shapes';
    titleInput.dispatchEvent(new Event('input'));

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      entity: 'light.group_a',
      title: 'Evening shapes',
    });
  });

  it('drops an emptied title rather than persisting an empty string', async () => {
    const { editor, changes } = await mountEditor({
      entity: 'light.group_a',
      title: 'Evening shapes',
    });

    const titleInput = editor.renderRoot.querySelectorAll('input')[1] as HTMLInputElement;
    titleInput.value = '';
    titleInput.dispatchEvent(new Event('input'));

    expect(changes[0].title).toBeUndefined();
    expect(changes[0].entity).toBe('light.group_a');
  });

  it('bubbles config-changed out of the shadow root so Lovelace hears it', async () => {
    const { editor } = await mountEditor({ entity: 'light.group_a' });
    const heard: Array<Record<string, unknown>> = [];
    document.body.addEventListener('config-changed', ((event: CustomEvent) => {
      heard.push(event.detail.config);
    }) as EventListener);

    const titleInput = editor.renderRoot.querySelectorAll('input')[1] as HTMLInputElement;
    titleInput.value = 'Bubbled';
    titleInput.dispatchEvent(new Event('input'));

    expect(heard).toHaveLength(1);
  });
});
