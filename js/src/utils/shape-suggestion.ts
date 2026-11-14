/**
 * Suggested shapes: a starting shape guessed for each light from its name.
 * Pure: the same names always give the same suggestion, and nothing is read
 * or written outside the arguments.
 */
import type { LightCurve } from './types.js';
import { CURVE_PRESETS } from './presets.js';
import { sameShape } from './save-conflict.js';

export type SuggestedShape = 'linear' | 'dim_accent' | 'early_starter' | 'late_starter';

/** Where Room is drawn while a suggestion shows and Room was never moved. */
export const SUGGESTION_ROOM = 30;

const r = String.raw;
const any = (...patterns: string[]): RegExp => new RegExp(patterns.join('|'));

/**
 * Patterns over normalised text (see `words`). `\b…\b` is a whole word; a bare
 * stem also matches inside a word, which German compounds need. Each list runs
 * en, de, sk, pt-BR. Not keywords on purpose: a bare lamp, main, led, floor,
 * table or ambiance.
 */
const NEVER = any(r`\bfans?\b`, r`\bpower ?strips?\b`, 'ventila', 'lue?fter', 'vetrak');

/**
 * First match wins: an accent stays low even on the ceiling, a lamp comes on first.
 * One exception sits between them: the lamp over the dining table.
 */
const RULES: ReadonlyArray<readonly [SuggestedShape, RegExp]> = [
  [
    'dim_accent',
    any(
      r`\bstrips?\b`,
      'stripe',
      'lightstrip',
      r`\baccents?\b`,
      'backlight',
      r`\bsconces?\b`,
      r`\bmirrors?\b`,
      // Not the Portuguese word for a room ("Ambiente Sala").
      r`ambient(?!es?\b)`,
      r`\bwall (light|lamp)s?\b`,
      'streifen',
      'wandleuchte',
      'wandlampe',
      // A spotlight on the wall or in the floor is an accent, not the main light overhead.
      r`\bwall spots?\b`,
      'wand ?(strahler|spot)',
      'boden ?(einbau)?(strahler|spot)',
      'spiegel',
      'indirekt',
      'akzent',
      'hintergrund',
      r`\bled band\b`,
      'lichtleiste',
      'striplight',
      r`\bpasik`,
      r`\bpasy?\b`,
      'nastenn',
      'zrkadl',
      'akcent',
      'podsviet',
      r`\bfitas?\b`,
      'arandela',
      'espelho',
      r`\bsancas?\b`,
      r`\bdestaque\b`,
      'retroilumin'
    ),
  ],
  // A lamp over the dining table is the pendant, not a table lamp.
  ['late_starter', any('esstisch(lampe|leuchte)')],
  [
    'early_starter',
    any(
      r`\b(floor|table|desk|sofa|reading|standing) lamps?\b`,
      r`\b(floor|table|desk)lamps?\b`,
      r`\bbedside\b`,
      r`\bnight ?stands?\b`,
      r`\bunder ?(cabinet|counter|cupboard)s?\b`,
      'stehlampe',
      'stehleuchte',
      'standlampe',
      'standleuchte',
      'bogenlampe',
      'tischlampe',
      'tischleuchte',
      'leselampe',
      'leseleuchte',
      'nachttisch',
      // The uplighter only: a bare Fluter is also the floodlight outside.
      '(decken|steh|stand) ?fluter',
      'unterbau',
      r`\bstoja`,
      r`\bstoln`,
      r`\bstolov`,
      r`\bnocn`,
      r`\bpod linkou\b`,
      r`\babajur(es)?\b`,
      r`\bluminaria de (mesa|chao|piso)\b`,
      r`\bcabeceira\b`,
      r`\bcriado mudo\b`,
      r`\bsob (o )?armario\b`
    ),
  ],
  [
    'late_starter',
    any(
      r`\bceilings?\b`,
      r`\bpendants?\b`,
      r`\bchandeliers?\b`,
      'spot',
      'downlight',
      r`\boverhead\b`,
      r`\brecessed\b`,
      'decke',
      'pendel',
      'hae?ngel',
      r`\bhae?nge (lampe|leuchte|licht)`,
      'kronleuchter',
      r`\blust(er|re)s?\b`,
      'einbau',
      'strahler',
      r`\bstrop`,
      // Hanging (závesné), never the curtain (záves).
      r`\bzavesn`,
      r`\bbodov`,
      r`\bzapusten`,
      r`\bteto\b`,
      r`\bplafon`,
      r`\bpendentes?\b`,
      r`\bembutid`
    ),
  ],
];

/**
 * Lower-case words of a-z and digits, one space apart: accents and umlauts
 * dropped, ß as ss, and a space wherever a letter meets a digit.
 */
function words(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function shapeIn(text: string): SuggestedShape | null {
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

/** The name decides; the entity ID only when the name says nothing. A fan is always Equal. Pure. */
export function guessShape(name: string, entityId: string): SuggestedShape {
  const named = words(name);
  // The part after the domain: `light.` says nothing about the light.
  const id = words(entityId.slice(entityId.indexOf('.') + 1));
  if (NEVER.test(named) || NEVER.test(id)) return 'linear';
  return shapeIn(named) ?? shapeIn(id) ?? 'linear';
}

/**
 * Same order and length as `curves`, each light with its own copy of its chip's points.
 * Null for fewer than two lights, fewer than two different shapes, or nothing to change.
 */
export function suggestShapes(curves: readonly LightCurve[]): LightCurve[] | null {
  if (curves.length < 2) return null;
  const ids = curves.map((curve) => guessShape(curve.friendlyName, curve.entityId));
  if (new Set(ids).size < 2) return null;
  const suggested = curves.map((curve, i) => ({
    ...curve,
    controlPoints: CURVE_PRESETS.find((preset) => preset.id === ids[i])!.controlPoints.map(
      (point) => ({ ...point })
    ),
  }));
  return suggested.every((curve, i) => sameShape(curve, curves[i])) ? null : suggested;
}

/**
 * First-use store ids for one user and group; null without either. The card names
 * the group by its config entry, so a group created again under an old name is new.
 */
export function firstLightIds(
  userId: string | undefined,
  group: string | undefined
): { answer: string; tip: string } | null {
  const user = userId?.trim();
  if (!user || !group) return null;
  return { answer: `suggestion:${user}:${group}`, tip: `tip:${user}:${group}` };
}
