export interface ControlPoint {
  lightener: number; // 0-100
  target: number; // 0-100
}

export interface LightLevelIntent {
  entityId: string;
}

export interface LightLevelInput extends LightLevelIntent {
  target: number;
}

export interface ScrubberMove {
  position: number;
}

/** Native graph intent, dispatched before reading the points for that gesture. */
export interface GraphInteraction {
  phase: 'start' | 'end' | 'cancel';
  input: string;
}

export interface LightCurve {
  entityId: string;
  friendlyName: string;
  controlPoints: ControlPoint[];
  visible: boolean;
  color: string;
}

/** Newly added lights being revealed; display only, never part of saved curves. */
export interface DrawIn {
  /** Membership focus restoration must finish before checking the viewport. */
  ready?: boolean;
  ids: ReadonlySet<string>;
  token: number;
}

/** Lights just removed from the group: their last lines fade out, never interactive. */
export interface DrawOut {
  token: number;
  /** Each removed curve with the index it was drawn at, for its dash pattern. */
  curves: readonly { curve: LightCurve; index: number }[];
  /** The selection they were drawn with, so each line keeps its weight and pattern. */
  selectedCurveId: string | null;
}

/**
 * One piece of a drawn curve over [x0, x1], in data units: a cubic whose Bézier
 * heights `y` sit at x0, one third, two thirds and x1 of the way across.
 */
export interface CurvePiece {
  x0: number;
  x1: number;
  y: [number, number, number, number];
}

/**
 * How the graph draws one curve while its shape animates: its line from
 * `pieces` instead of its own points, and each point's marker at `knots` (in
 * the points' order; null keeps them where the points are). Input, tooltips
 * and labels always read the real points.
 */
export interface CurveFrame {
  entityId: string;
  pieces: readonly CurvePiece[];
  knots: readonly ControlPoint[] | null;
}

/** One normalized candidate shown by the transactional membership editor. */
export interface CandidateLight {
  entity_id: string;
  name: string;
  available: boolean;
  area_id: string | null;
  area_name: string | null;
  hidden: boolean;
  disabled: boolean;
  missing: boolean;
}

export interface MembershipResponse {
  entities: Record<string, { brightness: Record<string, string> }>;
  added_entity_ids: string[];
  removed_entity_ids: string[];
}

/** Minimal subset of the Home Assistant `hass` object used by this card. */
export interface Hass {
  user: { is_admin: boolean; id?: string };
  locale?: { language?: string };
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
  callApi: <T>(method: string, path: string, body?: Record<string, unknown>) => Promise<T>;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
    notifyOnError?: boolean
  ) => Promise<unknown>;
  connected?: boolean;
  connection?: {
    readonly connected?: boolean;
    addEventListener(type: 'disconnected', listener: () => void): void;
    removeEventListener(type: 'disconnected', listener: () => void): void;
  };
  states: Record<
    string,
    { attributes: { friendly_name?: string; brightness?: number }; state: string }
  >;
  /** Entity-registry display data; absent until HA hydrates it. */
  entities?: Record<string, { platform?: string }>;
}
