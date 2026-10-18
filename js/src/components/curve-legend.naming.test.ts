// @vitest-environment jsdom

/**
 * Per-row name rendering and truncation contracts.
 *
 * Friendly names lead; IDs distinguish otherwise identical rendered names.
 * Preserve prefix shortening, truncation, full tooltips, and fixed row sizing.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CurveLegend } from './curve-legend.js';
import { CurveLegend as CurveLegendClass } from './curve-legend.js';
import type { LightCurve } from '../utils/types.js';

beforeAll(async () => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
  }
  if (!customElements.get('ha-entity-picker')) {
    customElements.define(
      'ha-entity-picker',
      class extends HTMLElement {
        excludeEntities: string[] = [];
        value = '';
        hass: unknown = null;
        includeDomains: string[] = [];
      }
    );
  }
  await import('./curve-legend.js');
});

function makeLegend(curves: LightCurve[]): CurveLegend {
  const el = document.createElement('curve-legend') as CurveLegend;
  el.curves = curves;
  document.body.appendChild(el);
  return el;
}

const longName = 'Example Room - Fixture Group Accent';
const longEntityId = 'light.example_room_fixture_group_accent';

const sampleCurves: LightCurve[] = [
  {
    entityId: longEntityId,
    friendlyName: longName,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 100, target: 100 },
    ],
    visible: true,
    color: '#2563eb',
  },
];

describe('friendly-name and entity_id rendering', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it.each([null, longEntityId])(
    'omits IDs for unique names with selection %s',
    async (selected) => {
      const el = makeLegend(sampleCurves);
      el.selectedCurveId = selected;
      await el.updateComplete;

      const root = el.renderRoot as ShadowRoot;
      const primary = root.querySelector('.name');
      expect(primary?.textContent?.trim()).toBe(longName);

      root.querySelector<HTMLButtonElement>('.row-select-btn')!.focus();
      expect(root.querySelector('.entity-id')).toBeNull();
      expect(root.querySelector('.eye-btn')?.getAttribute('aria-label')).toBe(`Hide ${longName}`);
    }
  );

  it('shows duplicate-name IDs, including hidden lights, and disambiguates every row control', async () => {
    const otherId = 'light.other_lamp';
    const el = makeLegend([
      sampleCurves[0],
      { ...sampleCurves[0], entityId: otherId, visible: false },
    ]);
    el.selectedCurveId = longEntityId;
    await el.updateComplete;

    const rows = [...el.renderRoot.querySelectorAll('.legend-item')];
    for (const [index, row] of rows.entries()) {
      const id = index === 0 ? longEntityId : otherId;
      const label = `${longName} (${id})`;
      expect(row.querySelector('.name')?.getAttribute('title')).toBe(longName);
      expect(row.querySelector('.entity-id')?.textContent).toBe(id);
      expect(row.querySelector('.entity-id')?.getAttribute('title')).toBe(id);
      expect(row.querySelector('.row-select-btn')?.getAttribute('aria-label')).toBe(label);
      expect(row.querySelector('.eye-btn')?.getAttribute('aria-label')).toBe(
        `${index === 0 ? 'Hide' : 'Show'} ${label}`
      );
    }
    expect(rows[0].querySelector('.clear-edit-icon')?.getAttribute('aria-label')).toBe(
      `Clear selection for ${longName} (${longEntityId})`
    );
  });

  it('detects collisions in displayed lines after shared-prefix shortening', async () => {
    const el = makeLegend([
      { ...sampleCurves[0], friendlyName: 'Room - Lamp' },
      { ...sampleCurves[0], entityId: 'light.second', friendlyName: 'Room : Lamp' },
    ]);
    await el.updateComplete;

    expect(
      [...el.renderRoot.querySelectorAll('.name')].map((node) => node.textContent?.trim())
    ).toEqual(['Lamp', 'Lamp']);
    expect([...el.renderRoot.querySelectorAll('.prefix')].map((node) => node.textContent)).toEqual([
      'Room',
      'Room',
    ]);
    expect(el.renderRoot.querySelectorAll('.entity-id')).toHaveLength(2);
  });

  it('omits IDs when shortened names remain distinct', async () => {
    const el = makeLegend([
      { ...sampleCurves[0], friendlyName: 'Room - Ceiling' },
      { ...sampleCurves[0], entityId: 'light.second', friendlyName: 'Room - Lamp' },
    ]);
    await el.updateComplete;
    expect(el.renderRoot.querySelectorAll('.prefix')).toHaveLength(2);
    expect(el.renderRoot.querySelector('.entity-id')).toBeNull();
  });

  it.each(['Reading  lamp', 'Reading\tlamp', 'Reading\nlamp', ' Reading lamp '])(
    'disambiguates names that render identically after whitespace collapse: %j',
    async (name) => {
      const el = makeLegend([
        { ...sampleCurves[0], friendlyName: 'Reading lamp' },
        { ...sampleCurves[0], entityId: 'light.second', friendlyName: name },
        { ...sampleCurves[0], entityId: 'light.desk', friendlyName: 'Desk light' },
      ]);
      await el.updateComplete;

      const rows = [...el.renderRoot.querySelectorAll('.legend-item')];
      expect(rows[0].querySelector('.entity-id')?.textContent).toBe(longEntityId);
      expect(rows[1].querySelector('.entity-id')?.textContent).toBe('light.second');
      expect(rows[2].querySelector('.entity-id')).toBeNull();
      expect(rows[1].querySelector('.name')?.getAttribute('title')).toBe(name);
    }
  );

  it('keeps non-collapsing spaces distinct when comparing displayed names', async () => {
    const el = makeLegend([
      { ...sampleCurves[0], friendlyName: 'Reading lamp' },
      { ...sampleCurves[0], entityId: 'light.second', friendlyName: 'Reading\u00a0 lamp' },
      { ...sampleCurves[0], entityId: 'light.desk', friendlyName: 'Desk light' },
    ]);
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.entity-id')).toBeNull();
  });

  it.each([null, 0, 50, 100])(
    "preserves duplicate rows' accessible brightness at scrubber position %s",
    async (position) => {
      const el = makeLegend([
        sampleCurves[0],
        { ...sampleCurves[0], entityId: 'light.second', visible: false },
      ]);
      el.scrubberPosition = position;
      await el.updateComplete;

      for (const row of el.renderRoot.querySelectorAll('.legend-item')) {
        const id = row.querySelector('.entity-id')!.textContent;
        const brightness = position === null ? '' : ` ${position}%`;
        expect(row.querySelector('.row-select-btn')?.getAttribute('aria-label')).toBe(
          `${longName} (${id})${brightness}`
        );
        expect(row.querySelector('.eye-btn')?.getAttribute('aria-label')).not.toMatch(/%/);
      }

      el.scrubberPosition = position === null ? 50 : null;
      await el.updateComplete;
      expect(el.renderRoot.querySelector('.row-select-btn')?.getAttribute('aria-label')).toBe(
        `${longName} (${longEntityId})${position === null ? ' 50%' : ''}`
      );
    }
  );

  it('announces sampled duplicate brightness after scrubber moves and curve edits', async () => {
    const capped = {
      ...sampleCurves[0],
      entityId: 'light.capped',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 40 },
      ],
    };
    const el = makeLegend([sampleCurves[0], capped]);
    el.scrubberPosition = 50;
    await el.updateComplete;
    const rows = [...el.renderRoot.querySelectorAll('.legend-item')];
    const select = rows[1].querySelector('.row-select-btn')!;
    const badge = rows[1].querySelector('.brightness-value')!;
    expect(select.getAttribute('aria-label')).toBe(`${longName} (light.capped) 20%`);
    expect(badge.textContent).toBe('20%');

    el.curves = [
      sampleCurves[0],
      {
        ...capped,
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 80 },
        ],
      },
    ];
    await el.updateComplete;
    expect(select.getAttribute('aria-label')).toBe(`${longName} (light.capped) 40%`);
    expect(badge.textContent).toBe('40%');

    el.scrubberPosition = 75;
    await el.updateComplete;
    expect(select.getAttribute('aria-label')).toBe(`${longName} (light.capped) 60%`);
    expect(badge.textContent).toBe('60%');
    expect(rows[0].querySelector('.row-select-btn')!.getAttribute('aria-label')).toBe(
      `${longName} (${longEntityId}) 75%`
    );
  });

  it('recalculates collisions after adding, renaming, and removing lights', async () => {
    const first = sampleCurves[0];
    const second = { ...first, entityId: 'light.second' };
    const el = makeLegend([first]);
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.entity-id')).toBeNull();

    el.curves = [first, second];
    await el.updateComplete;
    expect(el.renderRoot.querySelectorAll('.entity-id')).toHaveLength(2);

    el.curves = [first, { ...second, friendlyName: 'Different lamp' }];
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.entity-id')).toBeNull();
    expect(el.renderRoot.querySelector('.row-select-btn')?.getAttribute('aria-label')).toBe(
      first.friendlyName
    );

    el.curves = [first, second];
    await el.updateComplete;
    expect(el.renderRoot.querySelectorAll('.entity-id')).toHaveLength(2);
    el.curves = [second];
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.entity-id')).toBeNull();
  });

  it('preserves complete long duplicate IDs in tooltips and accessible names', async () => {
    const id = `light.${'long_lamp_name_'.repeat(12)}first`;
    const el = makeLegend([
      { ...sampleCurves[0], entityId: id },
      { ...sampleCurves[0], entityId: `${id}_second` },
    ]);
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.entity-id')?.getAttribute('title')).toBe(id);
    expect(el.renderRoot.querySelector('.row-select-btn')?.getAttribute('aria-label')).toBe(
      `${longName} (${id})`
    );
  });

  it.each([false, true])(
    'keeps control labels distinct with reserved suffixes: %s',
    async (nested) => {
      const names = ['Reading lamp', 'Reading lamp', 'Reading lamp (light.a)', 'Desk light'];
      if (nested) names.splice(3, 0, 'Reading lamp (light.a) (light.a)');
      const curves = names.map((friendlyName, index) => ({
        ...sampleCurves[0],
        entityId: `light.${String.fromCharCode(97 + index)}`,
        friendlyName,
      }));
      const el = makeLegend(curves);
      el.scrubberPosition = 50;
      el.selectedCurveId = 'light.c';
      await el.updateComplete;

      const rows = [...el.renderRoot.querySelectorAll('.legend-item')];
      const visibilityLabels = rows.map((row) =>
        row.querySelector('.eye-btn')!.getAttribute('aria-label')
      );
      expect(new Set(visibilityLabels).size).toBe(curves.length);
      const select = rows[2].querySelector('.row-select-btn')!;
      expect(select.getAttribute('aria-label')).toContain('light.c');
      expect(select.getAttribute('aria-label')).toContain('50%');
      expect(rows[2].querySelector('.entity-id')).toBeNull();
      expect(rows[2].querySelector('.clear-edit-icon')!.getAttribute('aria-label')).toContain(
        'light.c'
      );
    }
  );

  it('uses final control labels even when the displayed name reverses a shared prefix', async () => {
    const names = ['(light.a) Lamp', '(light.a) Lamp', '(light.a) (light.a) Lamp'];
    const el = makeLegend(
      names.map((friendlyName, index) => ({
        ...sampleCurves[0],
        entityId: `light.${String.fromCharCode(97 + index)}`,
        friendlyName,
      }))
    );
    el.scrubberPosition = 50;
    await el.updateComplete;

    const rows = [...el.renderRoot.querySelectorAll('.legend-item')];
    expect(rows[2].querySelector('.name')!.textContent?.trim()).toBe('(light.a) Lamp');
    expect(rows[2].querySelector('.entity-id')).toBeNull();
    expect(rows[2].querySelector('.row-select-btn')!.getAttribute('aria-label')).toBe(
      '(light.a) (light.a) Lamp 50%'
    );
    const labels = rows.map((row) =>
      row.querySelector('.row-select-btn')!.getAttribute('aria-label')
    );
    expect(new Set(labels).size).toBe(names.length);
  });

  it('renders the friendly_name verbatim — never concatenates device.name + entity.name', async () => {
    // HA core 2026.4 changed the device-vs-entity name convention. Cards
    // that synthesize "DeviceName EntityName" duplicate labels for users
    // who renamed only one of the two. Lightener must read friendly_name
    // off the curve object as-is.
    const exact: LightCurve = {
      entityId: 'light.exact_label',
      friendlyName: 'My Custom Light',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: '#2563eb',
    };
    const el = makeLegend([exact]);
    await el.updateComplete;

    const primary = (el.renderRoot as ShadowRoot).querySelector('.name')!;
    expect(primary.textContent?.trim()).toBe('My Custom Light');
  });

  it('with N>1 sharing a prefix, the discriminator becomes the primary text and the prefix is shown muted', async () => {
    const curves: LightCurve[] = [
      {
        entityId: 'light.example_accent',
        friendlyName: 'Example Room - Fixture Group Accent',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#2563eb',
      },
      {
        entityId: 'light.example_ceiling',
        friendlyName: 'Example Room - Fixture Group Ceiling',
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 100, target: 100 },
        ],
        visible: true,
        color: '#ef5350',
      },
    ];
    const el = makeLegend(curves);
    await el.updateComplete;

    const root = el.renderRoot as ShadowRoot;
    const items = [...root.querySelectorAll('.legend-item')];
    expect(items).toHaveLength(2);

    // Pin the DOM contract specifically: .discriminator carries the unique
    // suffix as the primary line. Using `.discriminator, .name` would silently
    // pass via .name even if the discriminator class is dropped.
    const primaryTexts = items.map(
      (it) => it.querySelector('.discriminator')?.textContent?.trim() ?? ''
    );
    expect(primaryTexts).toEqual(['Accent', 'Ceiling']);

    // .prefix must be a sibling of .discriminator inside .name-block, not a
    // descendant. Future refactors that nest them would invert the visual
    // hierarchy without breaking the textContent assertion.
    items.forEach((item) => {
      const block = item.querySelector('.name-block');
      expect(
        block,
        'every legend row must wrap name+prefix+entity_id in .name-block'
      ).not.toBeNull();
      const disc = block!.querySelector('.discriminator');
      const prefix = block!.querySelector('.prefix');
      expect(disc).not.toBeNull();
      expect(prefix).not.toBeNull();
      expect(prefix!.parentElement).toBe(block);
      expect(disc!.contains(prefix!)).toBe(false);
    });

    const prefixTexts = items.map((it) => it.querySelector('.prefix')?.textContent?.trim() ?? '');
    expect(prefixTexts).toEqual(['Example Room - Fixture Group', 'Example Room - Fixture Group']);
  });

  it('.name-block specifically declares min-width:0 (not just any selector)', () => {
    // CSS contract — protects against the ha-frontend #27570 regression class
    // where a long entity_id stretches its container instead of truncating.
    // Scope to the .name-block rule so unrelated rules can't satisfy this
    // assertion by coincidence.
    const css = CurveLegendClass.styles.cssText.replace(/\s+/g, ' ');
    const blockRule = css.match(/\.name-block\s*\{[^}]*\}/);
    expect(blockRule, '.name-block CSS rule must exist').not.toBeNull();
    expect(blockRule![0]).toMatch(/min-width:\s*0/);
  });
});

describe('truncation, no-overflow, no axis rotation', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('long entity_id is preserved verbatim in the row title attribute', async () => {
    const el = makeLegend(sampleCurves);
    await el.updateComplete;

    const root = el.renderRoot as ShadowRoot;
    // Title can be on .name, .entity-id, or the row container — accept any.
    const candidates = [
      root.querySelector('.name'),
      root.querySelector('.entity-id'),
      root.querySelector('.legend-item'),
    ].filter(Boolean) as Element[];
    const titles = candidates.map((el) => el.getAttribute('title') ?? '').filter(Boolean);
    expect(titles, 'at least one row element must carry a title attr').not.toHaveLength(0);
    // The full friendly_name OR full entity_id must be present so the user
    // can recover the full text on long-press / hover.
    const haveFull = titles.some((t) => t.includes(longName) || t.includes(longEntityId));
    expect(haveFull, 'title must preserve the full name or full entity_id').toBe(true);
  });

  it('brightness-value badge does not auto-grow on overflow; it relies on text-overflow', () => {
    // T-Bubble #2138: 100% must not get clipped to "1" or auto-shrink the
    // numeric font-size. CSS contract: .brightness-value uses ellipsis on
    // overflow, not auto-shrink, and reserves enough width for "100%".
    const css = CurveLegendClass.styles.cssText.replace(/\s+/g, ' ');
    const valueRule = css.match(/\.brightness-value\s*\{[^}]*\}/i);
    expect(valueRule, '.brightness-value rule must exist').not.toBeNull();
    // Either ellipsis OR an explicit min-width that fits "100%" (≥34px).
    const rule = valueRule![0];
    const usesEllipsis = /text-overflow:\s*ellipsis/.test(rule);
    const minWidthMatch = rule.match(/min-width:\s*(\d+)\s*px/);
    const fitsThreeDigits = !!minWidthMatch && parseInt(minWidthMatch[1], 10) >= 34;
    expect(usesEllipsis || fitsThreeDigits).toBe(true);
  });

  it('graph axis labels do not use transform: rotate as a narrow-viewport fallback (apex #953)', async () => {
    // Y-axis label is allowed to be rotated 90° in normal layout, but the
    // contract is that a SHORT label fallback or stacked text is used at
    // narrow widths instead of rotating arbitrary axis labels. Today the
    // y-axis "Light brightness" is rotated by design; this test guards
    // against accidentally rotating tick / x-axis labels too.
    await import('./curve-graph.js');
    const graph = document.createElement('curve-graph') as unknown as CurveLegend;
    (graph as unknown as { curves: LightCurve[] }).curves = sampleCurves;
    document.body.appendChild(graph);
    await (graph as unknown as { updateComplete: Promise<void> }).updateComplete;

    const root = (graph as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
    const ticks = [...root.querySelectorAll('text.tick-label')] as SVGTextElement[];
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) {
      const transform = t.getAttribute('transform') ?? '';
      expect(transform, `tick label "${t.textContent}" must not be rotated`).not.toMatch(/rotate/i);
    }
  });
});
