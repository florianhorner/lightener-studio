import type { Hass } from './utils/types.js';
/** Test-only deterministic saved snapshots; no production imports. */
import { intendedEntities, savedEntitiesEqual, type SavedEntities } from './utils/save-conflict.js';
export function testRevision(entities: SavedEntities): string {
  // Deterministic fixture token, not a stand-in for the production SHA algorithm.
  let hash = 2166136261;
  for (const char of JSON.stringify(entities))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `v1:${(hash >>> 0).toString(16).padStart(8, '0').repeat(8)}`;
}
export function testSnapshot(entities: SavedEntities, entry = 'test-entry') {
  return {
    entities: structuredClone(entities),
    config_entry_id: entry,
    revision: testRevision(entities),
    capabilities: { guarded_curve_save: 1 },
  };
}
export function testBackend(initial: SavedEntities, entry = 'test-entry') {
  let entities = structuredClone(initial);
  return (message: Record<string, unknown>) => {
    if (message.type === 'lightener/save_curves') {
      if (message.expected_revision !== testRevision(entities))
        return Promise.reject({
          code: message.expected_revision === undefined ? 'precondition_required' : 'conflict',
        });
      const patch = message.curves as Parameters<typeof intendedEntities>[1];
      if (Object.keys(patch).some((id) => !(id in entities)))
        return Promise.reject({ code: 'unknown_entities' });
      const next = intendedEntities(entities, patch);
      const status = savedEntitiesEqual(next, entities) ? 'unchanged' : 'saved';
      entities = next;
      return Promise.resolve({ ...testSnapshot(entities, entry), status });
    }
    return Promise.resolve(testSnapshot(entities, entry));
  };
}

/** Stateful HA service double; callers keep authentication and fault injection explicit. */
export function testLightService(states: Hass['states']): Hass['callService'] {
  return async (_domain, service, data = {}) => {
    const light = states[String(data.entity_id)];
    if (light) {
      light.state = service === 'turn_off' ? 'off' : 'on';
      if (data.brightness === undefined) delete light.attributes.brightness;
      else light.attributes.brightness = Number(data.brightness);
    }
    return { context: { id: crypto.randomUUID() } };
  };
}
