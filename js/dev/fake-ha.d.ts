/**
 * Types for the demo/dev fake Home Assistant backend.
 *
 * The build copies `fake-ha.js` verbatim to `docs/fake-ha.js`, where the public
 * demo loads it as a module, so it has to stay plain JS. This declaration covers
 * only what `js/src/utils/demo-contract.test.ts` imports, so that test can read
 * real values rather than scrape the file's source text.
 */
export declare const LIGHTENER_ENTITY: string;
export declare const CANDIDATE_STATE_METADATA_VERSION: number;
export declare const PRESETS: Record<string, Record<string, string>>;
export declare const disabledEntityMessage: (entityId: string) => string;
