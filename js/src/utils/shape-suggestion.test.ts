import { describe, expect, it } from 'vitest';
import {
  firstLightIds,
  guessShape,
  suggestShapes,
  type SuggestedShape,
} from './shape-suggestion.js';
import { CURVE_PRESETS } from './presets.js';
import { sampleCurveAt } from './graph-math.js';
import type { ControlPoint, LightCurve } from './types.js';

const late: SuggestedShape = 'late_starter';
const early: SuggestedShape = 'early_starter';
const dim: SuggestedShape = 'dim_accent';
const linear: SuggestedShape = 'linear';

const points = (id: SuggestedShape): ControlPoint[] =>
  CURVE_PRESETS.find((preset) => preset.id === id)!.controlPoints;

/** Today's default shape: the Equal chip's own points. */
const DEFAULT: ControlPoint[] = [
  { lightener: 0, target: 0 },
  { lightener: 1, target: 1 },
  { lightener: 50, target: 50 },
  { lightener: 100, target: 100 },
];
/** The default of earlier versions: no midpoint. */
const OLDER_DEFAULT: ControlPoint[] = [
  { lightener: 0, target: 0 },
  { lightener: 1, target: 1 },
  { lightener: 100, target: 100 },
];

function light(
  friendlyName: string,
  entityId: string,
  controlPoints: ControlPoint[] = DEFAULT
): LightCurve {
  return {
    entityId,
    friendlyName,
    color: '#42a5f5',
    controlPoints: controlPoints.map((point) => ({ ...point })),
  };
}

/** One name for each shape, as the table below pins them. */
const NAMED: Record<SuggestedShape, string> = {
  late_starter: 'Ceiling Light',
  early_starter: 'Sofa Lamp',
  dim_accent: 'LED Strip',
  linear: 'Hallway',
};

describe('guessShape', () => {
  it.each<[string, string, SuggestedShape]>([
    // en: main overhead lights
    ['Ceiling Light', 'light.example_0', late],
    ['Living Room Ceiling Lights', 'light.living_room_ceiling', late],
    ['Kitchen Pendants', 'light.k1', late],
    ['Dining Chandelier', 'light.d1', late],
    ['Hall Spots', 'light.h1', late],
    ['Spot1', 'light.x1', late],
    ['Bathroom Downlights', 'light.b1', late],
    ['Overhead', 'light.o1', late],
    ['Recessed Kitchen', 'light.r1', late],
    // en: lamps that come on first
    ['Sofa Lamp', 'light.example_1', early],
    ['Living Room Sofa Lamp', 'light.living_room_sofa_lamp', early],
    ['Floor Lamps', 'light.f1', early],
    ['Table Lamp', 'light.t1', early],
    ['Desk lamp', 'light.t2', early],
    ['Reading Lamp', 'light.t3', early],
    ['Bedside Left', 'light.t4', early],
    ['Kitchen Under-Cabinet', 'light.t5', early],
    ['Night Stand', 'light.t6', early],
    ['Floorlamp', 'light.t7', early],
    ['Under Cupboard Lights', 'light.t8', early],
    ['Under Counter', 'light.t9', early],
    // en: accents that stay low
    ['Wall Light', 'light.example_2', dim],
    ['LED Strip', 'light.led_strip', dim],
    ['Hue Lightstrip Plus', 'light.s1', dim],
    ['TV Backlighting', 'light.s2', dim],
    ['Living Room Accent Light 4', 'light.example_3', dim],
    ['Hallway Sconces', 'light.s3', dim],
    ['Bathroom Mirror', 'light.s4', dim],
    ['Ambient', 'light.s5', dim],
    ['Wall Lamps', 'light.s6', dim],
    ['Striplight', 'light.s7', dim],
    // de
    ['Deckenleuchte', 'light.g1', late],
    ['Wohnzimmerdecke', 'light.g2', late],
    ['Küchenspots', 'light.g3', late],
    ['Pendelleuchte Esstisch', 'light.g4', late],
    ['Hängelampe', 'light.g5', late],
    ['Haengeleuchte', 'light.g6', late],
    ['Kronleuchter', 'light.g7', late],
    ['Einbaustrahler Flur', 'light.g8', late],
    ['Stehlampen', 'light.g9', early],
    ['Tischlampe', 'light.g10', early],
    ['Nachttischlampe', 'light.g11', early],
    ['Deckenfluter', 'light.g12', early],
    ['Unterbauleuchte Küche', 'light.g13', early],
    ['Lichtstreifen', 'light.g14', dim],
    ['LED-Stripe', 'light.g15', dim],
    ['Wandleuchten', 'light.g16', dim],
    ['Wandlampe', 'light.g17', dim],
    ['Wandstrahler', 'light.g22', dim],
    ['Wandspots Flur', 'light.g23', dim],
    ['Bodenstrahler', 'light.g24', dim],
    ['Bodeneinbaustrahler', 'light.g25', dim],
    ['Hall Wall Spots', 'light.w1', dim],
    ['Spiegelleuchte', 'light.g18', dim],
    ['Indirekte Beleuchtung', 'light.g19', dim],
    ['Akzentlicht', 'light.g20', dim],
    ['Hintergrundbeleuchtung', 'light.g21', dim],
    // de: the lamp over the dining table is the pendant; other table lamps stay Early
    ['Esstischlampe', 'light.g22', late],
    ['Esstischleuchte', 'light.g23', late],
    ['Schreibtischlampe', 'light.g24', early],
    ['Ambientebeleuchtung', 'light.g25', dim],
    ['Stehfluter', 'light.g26', early],
    ['Standleuchte', 'light.g27', early],
    ['Standlampe', 'light.g28', early],
    ['Bogenlampe', 'light.g29', early],
    ['LED Band', 'light.g30', dim],
    ['Lichtleiste', 'light.g31', dim],
    ['Hänge Lampe', 'light.g32', late],
    // sk
    ['Stropné svetlo', 'light.k1', late],
    ['Luster', 'light.k2', late],
    ['Závesné svietidlo', 'light.k3', late],
    ['Bodové svetlá', 'light.k4', late],
    ['Stojacia lampa', 'light.k5', early],
    ['Stolná lampa', 'light.k6', early],
    ['Nočná lampa', 'light.k7', early],
    ['LED pásik', 'light.k8', dim],
    ['Nástenné svetlo', 'light.k9', dim],
    ['Zrkadlo', 'light.k10', dim],
    ['LED pás', 'light.k13', dim],
    // sk: a curtain (záves) is not a hanging light (závesné)
    ['LED za závesom', 'light.k11', linear],
    ['Záves', 'light.k12', linear],
    // pt-BR
    ['Luz do teto', 'light.p1', late],
    ['Plafon da sala', 'light.p2', late],
    ['Lustre', 'light.p3', late],
    ['Pendentes', 'light.p4', late],
    ['Abajur', 'light.p5', early],
    ['Luminária de chão', 'light.p6', early],
    ['Luminária de mesa', 'light.p7', early],
    ['Cabeceira', 'light.p8', early],
    ['Fitas de LED', 'light.p9', dim],
    ['Arandelas', 'light.p10', dim],
    ['Espelho', 'light.p11', dim],
    ['Sanca', 'light.p12', dim],
    ['Criado-mudo', 'light.p14', early],
    // pt-BR: "ambiente" is a room, by name or by entity ID
    ['Ambiente Sala', 'light.p13', linear],
    ['Sala', 'light.ambiente_sala', linear],
    // Never: a fan is always Equal, by name or by entity ID
    ['Ceiling Fan', 'light.n1', linear],
    ['Ceiling Fans', 'light.n2', linear],
    ['Power Strip', 'light.n3', linear],
    ['Licht des Deckenventilators', 'light.n4', linear],
    ['Deckenlüfter', 'light.n5', linear],
    ['Svetlo stropného ventilátora', 'light.n6', linear],
    ['Stropný vetrák Svetlo', 'light.n8', linear],
    ['Luz dos ventiladores de teto', 'light.n7', linear],
    ['Bedroom Ceiling', 'light.bedroom_fan', linear],
    ['Bedroom Ceiling', 'light.bedroom_fan2', linear],
    // A stale ID that is not a fan never overrides a name that says something
    ['Ceiling Light', 'light.power_strip_1', late],
    ['Sofa Lamp', 'light.power_strip_2', early],
    ['Lamp 3', 'light.power_strip_3', linear],
    // Order: Dim, then Early, then Late
    ['Under Cabinet Strip', 'light.c1', dim],
    ['Living Room Overhead Ambient Controller Zone', 'light.c2', dim],
    ['Mirror Spot', 'light.c3', dim],
    ['Bedside Pendant', 'light.c4', early],
    // The entity ID decides only when the name says nothing (a stale ID can decide)
    ['Hallway', 'light.old_bedside_2', early],
    ['Lamp 3', 'light.kitchen_spot2', late],
    ['Sofa Lamp', 'light.ceiling_1', early],
    ['', 'light.led_strip', dim],
    // Not keywords
    ['Lamp', 'light.q1', linear],
    ['Main Light', 'light.q2', linear],
    ['LED', 'light.q3', linear],
    ['Floor', 'light.q4', linear],
    ['Dining Table', 'light.q5', linear],
    ['Ambiance', 'light.q6', linear],
    ['Alpha', 'light.a', linear],
    ['Fußleiste', 'light.q7', linear],
    ['LED-Fluter Einfahrt', 'light.q8', linear],
    ['Change Light', 'light.q9', linear],
  ])('guesses a shape from the name, then the entity ID: "%s" (%s) is %s', (name, id, shape) => {
    expect(guessShape(name, id)).toBe(shape);
  });
});

describe('suggestShapes', () => {
  const group = (): LightCurve[] => [
    light('Ceiling Light', 'light.a'),
    light('Sofa Lamp', 'light.b'),
    light('LED Strip', 'light.c'),
    light('Hallway', 'light.d'),
  ];

  it('returns the same answer for the same names and leaves its input unchanged', () => {
    const curves = group();
    const before = structuredClone(curves);
    const first = suggestShapes(curves);
    const second = suggestShapes(curves);
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    expect(suggestShapes(group())).toEqual(first);
    expect(curves).toEqual(before);
    // Changing a suggestion never reaches the lights it was made from.
    first![0].controlPoints[0].target = 99;
    first![0].controlPoints.pop();
    expect(curves).toEqual(before);
  });

  it("gives every light its chip's exact points, never a shared array", () => {
    const curves = [...group(), light('Kitchen Pendants', 'light.e')];
    const suggested = suggestShapes(curves)!;
    const shapes: SuggestedShape[] = [late, early, dim, linear, late];
    suggested.forEach((curve, i) => {
      expect(curve.controlPoints).toEqual(points(shapes[i]));
      expect(curve.controlPoints).not.toBe(points(shapes[i]));
      curve.controlPoints.forEach((point, p) => expect(point).not.toBe(points(shapes[i])[p]));
    });
    // Two lights with one shape each own their points.
    expect(suggested[4].controlPoints).not.toBe(suggested[0].controlPoints);
    expect(suggested[4].controlPoints[0]).not.toBe(suggested[0].controlPoints[0]);
    // The chips' own data is untouched.
    suggested[0].controlPoints[0].target = 99;
    expect(points(late)[0].target).toBe(0);
  });

  it('returns null for one light, for one shape for all, and when nothing would change', () => {
    expect(suggestShapes([])).toBeNull();
    expect(suggestShapes([light('Ceiling Light', 'light.a')])).toBeNull();
    // Every light would get Late: the room would stay dark until 40%.
    expect(
      suggestShapes([light('Ceiling Light', 'light.a'), light('Kitchen Pendants', 'light.b')])
    ).toBeNull();
    expect(suggestShapes([light('Alpha', 'light.a'), light('Beta', 'light.b')])).toBeNull();
    // The lights already have the shapes their names give.
    expect(
      suggestShapes([
        light('Ceiling Light', 'light.a', points(late)),
        light('Sofa Lamp', 'light.b', points(early)),
        light('Hallway', 'light.c'),
      ])
    ).toBeNull();
    // One light off its guessed shape is enough for a suggestion.
    expect(
      suggestShapes([
        light('Ceiling Light', 'light.a', points(late)),
        light('Sofa Lamp', 'light.b'),
      ])
    ).not.toBeNull();
  });

  it('keeps order and length', () => {
    const curves = [
      light('Hallway', 'light.d'),
      light('LED Strip', 'light.c'),
      { ...light('Sofa Lamp', 'light.b'), color: '#ef5350' },
      light('Ceiling Light', 'light.a'),
    ];
    const suggested = suggestShapes(curves)!;
    expect(suggested).toHaveLength(curves.length);
    expect(suggested.map((curve) => curve.entityId)).toEqual(curves.map((c) => c.entityId));
    expect(suggested.map((curve) => curve.friendlyName)).toEqual(curves.map((c) => c.friendlyName));
    expect(suggested.map((curve) => curve.color)).toEqual(curves.map((c) => c.color));
    expect(suggested.map((curve) => curve.controlPoints)).toEqual(
      [linear, dim, early, late].map((shape) => points(shape))
    );
  });

  it('at 1% room brightness at least one suggested light is on', () => {
    const shapes = Object.keys(NAMED) as SuggestedShape[];
    let pairs = 0;
    for (const a of shapes)
      for (const b of shapes) {
        if (a === b) continue;
        pairs++;
        const suggested = suggestShapes([light(NAMED[a], 'light.a'), light(NAMED[b], 'light.b')]);
        expect(suggested, `${a} with ${b}`).not.toBeNull();
        expect(
          suggested!.some((curve) => sampleCurveAt(curve.controlPoints, 1) > 0),
          `${a} with ${b}`
        ).toBe(true);
      }
    expect(pairs).toBe(12);
  });

  it("an Equal light on today's default is unchanged; on the older 0/1/100 default it gains the 50 point", () => {
    const curves = [
      light('Ceiling Light', 'light.a'),
      light('Hallway', 'light.b'),
      light('Landing', 'light.c', OLDER_DEFAULT),
    ];
    const suggested = suggestShapes(curves)!;
    expect(suggested[1].controlPoints).toEqual(curves[1].controlPoints);
    expect(suggested[2].controlPoints).toEqual(DEFAULT);
    expect(suggested[2].controlPoints).not.toEqual(curves[2].controlPoints);
    // The older default alone is still something to change, for an Equal light too.
    expect(
      suggestShapes([
        light('Ceiling Light', 'light.a', points(late)),
        light('Landing', 'light.c', OLDER_DEFAULT),
      ])
    ).not.toBeNull();
  });
});

describe('firstLightIds', () => {
  it('firstLightIds: per user and group, trimmed, null without a user id or a group', () => {
    expect(firstLightIds('ana', 'light.room')).toEqual({
      answer: 'suggestion:ana:light.room',
      tip: 'tip:ana:light.room',
    });
    expect(firstLightIds('  ana ', 'light.room')).toEqual(firstLightIds('ana', 'light.room'));
    const ids = [
      firstLightIds('ana', 'light.room')!,
      firstLightIds('ben', 'light.room')!,
      firstLightIds('ana', 'light.other')!,
    ].flatMap((id) => [id.answer, id.tip]);
    // Never the bare group id that Show me how records under.
    expect(new Set([...ids, 'light.room', 'light.other']).size).toBe(8);
    expect(firstLightIds(undefined, 'light.room')).toBeNull();
    expect(firstLightIds('', 'light.room')).toBeNull();
    expect(firstLightIds('   ', 'light.room')).toBeNull();
    expect(firstLightIds('ana', undefined)).toBeNull();
    expect(firstLightIds('ana', '')).toBeNull();
  });
});
