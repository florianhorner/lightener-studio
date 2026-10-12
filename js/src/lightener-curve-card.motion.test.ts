// @vitest-environment jsdom

/**
 * The card's side of the opt-in "joy" moments: the `joy:` config key is read
 * into per-moment flags and handed to the graph.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { CurveGraph } from './components/curve-graph.js';
import type { Hass } from './utils/types.js';
import { JOY_DEFAULTS } from './utils/motion.js';

beforeAll(async () => {
  if (!window.matchMedia) {
    (window as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
      query: string
    ) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }
  await import('./lightener-curve-card.js');
});

afterEach(() => {
  document.body.replaceChildren();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

function makeHass(): Hass {
  return {
    user: { is_admin: true },
    callWS: vi.fn().mockResolvedValue({
      entities: { 'light.a': { brightness: { '100': '100' } } },
    }),
    callApi: vi.fn().mockResolvedValue(undefined),
    callService: vi.fn().mockResolvedValue(undefined),
    states: {
      'light.lightener': { state: 'on', attributes: { friendly_name: 'Lightener' } },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
    },
  } as unknown as Hass;
}

async function mountCard(config: Record<string, unknown>): Promise<LightenerCurveCard> {
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.setConfig({ entity: 'light.lightener', ...config });
  card.hass = makeHass();
  document.body.appendChild(card);
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  return card;
}

async function graphOf(card: LightenerCurveCard): Promise<CurveGraph> {
  const graph = card.shadowRoot!.querySelector('curve-graph') as CurveGraph;
  expect(graph).not.toBeNull();
  await graph.updateComplete;
  return graph;
}

describe('the joy config key reaches the graph', () => {
  it('keeps every moment off without a joy key', async () => {
    const graph = await graphOf(await mountCard({}));
    expect(graph.joy).toEqual(JOY_DEFAULTS);
  });

  it('turns settle on with joy: { settle: true }', async () => {
    const graph = await graphOf(await mountCard({ joy: { settle: true } }));
    expect(graph.joy.settle).toBe(true);
  });

  it('turns diagonal on with joy: { diagonal: true }, independent of settle', async () => {
    const graph = await graphOf(await mountCard({ joy: { diagonal: true } }));
    expect(graph.joy).toEqual({ ...JOY_DEFAULTS, diagonal: true });
  });

  it.each([[{ settle: 'yes' }], [true], [['settle']], [null]])(
    'keeps every moment off for joy: %j',
    async (joy) => {
      const graph = await graphOf(await mountCard({ joy }));
      expect(graph.joy).toEqual(JOY_DEFAULTS);
    }
  );

  it('follows a config change without reloading the light', async () => {
    const card = await mountCard({ joy: { settle: true } });
    const callWS = (card as unknown as { _hass: { callWS: ReturnType<typeof vi.fn> } })._hass
      .callWS;
    const loadsBefore = callWS.mock.calls.length;
    card.setConfig({ entity: 'light.lightener', joy: { settle: false } });
    await card.updateComplete;
    const graph = await graphOf(card);
    expect(graph.joy.settle).toBe(false);
    expect(callWS.mock.calls.length).toBe(loadsBefore);
  });
});
