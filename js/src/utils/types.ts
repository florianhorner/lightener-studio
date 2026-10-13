export interface ControlPoint {
  lightener: number; // 0-100
  target: number; // 0-100
}

export interface LightCurve {
  entityId: string;
  friendlyName: string;
  controlPoints: ControlPoint[];
  visible: boolean;
  color: string;
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
  user: { is_admin: boolean };
  locale?: { language?: string };
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
  callApi: <T>(method: string, path: string, body?: Record<string, unknown>) => Promise<T>;
  callService: (domain: string, service: string, data?: Record<string, unknown>) => Promise<void>;
  states: Record<
    string,
    { attributes: { friendly_name?: string; brightness?: number }; state: string }
  >;
  /** Entity-registry display data; absent until HA hydrates it. */
  entities?: Record<string, { platform?: string }>;
}
