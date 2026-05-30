// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityPickerLoader } from './entity-picker-loader.js';

describe('EntityPickerLoader', () => {
  let isConnected: () => boolean;
  let requestUpdate: ReturnType<typeof vi.fn>;

  // Wraps requestUpdate in a genuine `() => void` so TypeScript is satisfied,
  // while the mock remains accessible for assertions.
  function makeLoader(): EntityPickerLoader {
    return new EntityPickerLoader(isConnected, () => (requestUpdate as () => void)());
  }

  beforeEach(() => {
    isConnected = () => true;
    requestUpdate = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is idempotent — ensureLoaded() called twice only runs once', () => {
    const customGetSpy = vi.spyOn(customElements, 'get').mockReturnValue(undefined);
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(new Promise(() => {}));

    const loader = makeLoader();
    loader.ensureLoaded();
    const countAfterFirst = customGetSpy.mock.calls.length;

    loader.ensureLoaded();
    // The second call is a no-op — call count must not grow.
    expect(customGetSpy.mock.calls.length).toBe(countAfterFirst);
  });

  it('sets ready=true immediately when ha-entity-picker is already registered', () => {
    vi.spyOn(customElements, 'get').mockReturnValue(class {} as CustomElementConstructor);

    const loader = makeLoader();
    loader.ensureLoaded();

    expect(loader.ready).toBe(true);
    expect(requestUpdate).not.toHaveBeenCalled();
  });

  it('sets ready=true and calls requestUpdate after the race resolves', async () => {
    let resolveWhenDefined!: () => void;
    const pickerCtor = class {} as CustomElementConstructor;
    vi.spyOn(customElements, 'get')
      .mockImplementationOnce(() => undefined)
      .mockImplementation((name) => (name === 'ha-entity-picker' ? pickerCtor : undefined));
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(
      new Promise<CustomElementConstructor>((resolve) => {
        resolveWhenDefined = () => resolve(pickerCtor);
      })
    );

    const loader = makeLoader();
    loader.ensureLoaded();

    resolveWhenDefined();
    await vi.runAllTimersAsync();

    expect(loader.ready).toBe(true);
    expect(requestUpdate).toHaveBeenCalled();
  });

  it('sets ready=false and falls back to plain input when picker times out', async () => {
    vi.spyOn(customElements, 'get').mockReturnValue(undefined);
    // whenDefined never resolves — the 1500ms timeout wins.
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(new Promise(() => {}));

    const loader = makeLoader();
    loader.ensureLoaded();

    await vi.advanceTimersByTimeAsync(1600);

    expect(loader.ready).toBe(false);
    expect(requestUpdate).toHaveBeenCalled();
  });

  it('does not call requestUpdate after timeout when component is disconnected', async () => {
    isConnected = () => false;
    vi.spyOn(customElements, 'get').mockReturnValue(undefined);
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(new Promise(() => {}));

    const loader = makeLoader();
    loader.ensureLoaded();

    await vi.advanceTimersByTimeAsync(1600);

    expect(requestUpdate).not.toHaveBeenCalled();
  });

  it('upgrades to ready via late-registration whenDefined after timeout', async () => {
    let resolveAfterTimeout!: () => void;
    const whenDefinedPromise = new Promise<CustomElementConstructor>((resolve) => {
      resolveAfterTimeout = () => resolve(class {} as CustomElementConstructor);
    });

    vi.spyOn(customElements, 'get').mockReturnValue(undefined);
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(whenDefinedPromise);

    const loader = makeLoader();
    loader.ensureLoaded();

    // Advance past the 1500ms timeout so we enter the fallback path.
    await vi.advanceTimersByTimeAsync(1600);
    expect(loader.ready).toBe(false);
    const firstCallCount = requestUpdate.mock.calls.length;

    // Now the picker registers late — the inner whenDefined callback fires.
    resolveAfterTimeout();
    await vi.runAllTimersAsync();

    expect(loader.ready).toBe(true);
    expect(requestUpdate.mock.calls.length).toBeGreaterThan(firstCallCount);
  });

  it('falls back safely when whenDefined rejects', async () => {
    // The race between whenDefined and the 1500ms timeout settles on the
    // synchronous rejection first; the source's `.catch()` swallows it.
    // ready stays false; requestUpdate is NOT called (no state change to flush).
    vi.spyOn(customElements, 'get').mockReturnValue(undefined);
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(
      Promise.reject(new Error('registration failed'))
    );

    const loader = makeLoader();
    loader.ensureLoaded();
    await vi.runAllTimersAsync();

    expect(loader.ready).toBe(false);
    expect(requestUpdate).not.toHaveBeenCalled();
  });

  it('calls window.loadCardHelpers when available during kick', async () => {
    const loadCardHelpers = vi.fn().mockResolvedValue(undefined);
    (window as unknown as Record<string, unknown>).loadCardHelpers = loadCardHelpers;

    vi.spyOn(customElements, 'get').mockReturnValue(undefined);
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(new Promise(() => {}));

    const loader = makeLoader();
    loader.ensureLoaded();

    await vi.runAllTimersAsync();

    expect(loadCardHelpers).toHaveBeenCalled();
    delete (window as unknown as Record<string, unknown>).loadCardHelpers;
  });

  // ── readyMulti (plural <ha-entities-picker>) ──────────────────────────────
  // The plural tag is gated independently of `ready`: the same loader kick ships
  // both tags, but the singular winning the race does not guarantee the plural
  // is upgraded. These cover the exact case the separate gate exists for.

  it('readyMulti stays false until the plural tag upgrades (singular wins race first)', async () => {
    let resolvePlural!: () => void;
    const singularCtor = class {} as CustomElementConstructor;
    const pluralCtor = class {} as CustomElementConstructor;
    // Singular present after the kick; plural NOT yet registered.
    vi.spyOn(customElements, 'get').mockImplementation((name) =>
      name === 'ha-entity-picker' ? singularCtor : undefined
    );
    vi.spyOn(customElements, 'whenDefined').mockImplementation((name) => {
      if (name === 'ha-entity-picker') return Promise.resolve(singularCtor);
      return new Promise<CustomElementConstructor>((resolve) => {
        resolvePlural = () => resolve(pluralCtor);
      });
    });

    const loader = makeLoader();
    loader.ensureLoaded();
    await vi.runAllTimersAsync();

    // Singular ready, but plural has not upgraded — readyMulti must be false.
    expect(loader.ready).toBe(true);
    expect(loader.readyMulti).toBe(false);

    // Now the plural upgrades late → readyMulti flips and a re-render is requested.
    const callsBefore = requestUpdate.mock.calls.length;
    resolvePlural();
    await vi.runAllTimersAsync();
    expect(loader.readyMulti).toBe(true);
    expect(requestUpdate.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('sets readyMulti=true immediately when the plural tag is already registered (race path)', async () => {
    const ctor = class {} as CustomElementConstructor;
    // First get() (sync early-return check) returns undefined so we take the kick
    // path; afterwards both tags resolve as registered.
    vi.spyOn(customElements, 'get')
      .mockImplementationOnce(() => undefined)
      .mockImplementation(() => ctor);
    vi.spyOn(customElements, 'whenDefined').mockResolvedValue(ctor);

    const loader = makeLoader();
    loader.ensureLoaded();
    await vi.runAllTimersAsync();

    expect(loader.ready).toBe(true);
    expect(loader.readyMulti).toBe(true);
  });

  it('upgrades readyMulti via late plural whenDefined when singular is already registered synchronously', async () => {
    let resolvePlural!: () => void;
    const singularCtor = class {} as CustomElementConstructor;
    const pluralCtor = class {} as CustomElementConstructor;
    // Singular registered synchronously → early-return path; plural still pending.
    vi.spyOn(customElements, 'get').mockImplementation((name) =>
      name === 'ha-entity-picker' ? singularCtor : undefined
    );
    vi.spyOn(customElements, 'whenDefined').mockImplementation((name) => {
      if (name === 'ha-entity-picker') return Promise.resolve(singularCtor);
      return new Promise<CustomElementConstructor>((resolve) => {
        resolvePlural = () => resolve(pluralCtor);
      });
    });

    const loader = makeLoader();
    loader.ensureLoaded();

    // Synchronous early return: ready true immediately, plural not yet upgraded.
    expect(loader.ready).toBe(true);
    expect(loader.readyMulti).toBe(false);

    resolvePlural();
    await vi.runAllTimersAsync();
    expect(loader.readyMulti).toBe(true);
    expect(requestUpdate).toHaveBeenCalled();
  });

  it('does not upgrade readyMulti when disconnected before the plural registers', async () => {
    let connected = true;
    isConnected = () => connected;
    let resolvePlural!: () => void;
    const singularCtor = class {} as CustomElementConstructor;
    vi.spyOn(customElements, 'get').mockImplementation((name) =>
      name === 'ha-entity-picker' ? singularCtor : undefined
    );
    vi.spyOn(customElements, 'whenDefined').mockImplementation((name) => {
      if (name === 'ha-entity-picker') return Promise.resolve(singularCtor);
      return new Promise<CustomElementConstructor>((resolve) => {
        resolvePlural = () => resolve(class {} as CustomElementConstructor);
      });
    });

    const loader = makeLoader();
    loader.ensureLoaded();
    expect(loader.readyMulti).toBe(false);

    connected = false;
    resolvePlural();
    await vi.runAllTimersAsync();
    expect(loader.readyMulti).toBe(false);
  });

  it('skips the late-registration upgrade when disconnected', async () => {
    let connected = true;
    isConnected = () => connected;

    let resolveAfterTimeout!: () => void;
    const whenDefinedPromise = new Promise<CustomElementConstructor>((resolve) => {
      resolveAfterTimeout = () => resolve(class {} as CustomElementConstructor);
    });

    vi.spyOn(customElements, 'get').mockReturnValue(undefined);
    vi.spyOn(customElements, 'whenDefined').mockReturnValue(whenDefinedPromise);

    const loader = makeLoader();
    loader.ensureLoaded();

    await vi.advanceTimersByTimeAsync(1600);
    expect(loader.ready).toBe(false);

    // Component disconnects before the late whenDefined fires.
    connected = false;
    resolveAfterTimeout();
    await vi.runAllTimersAsync();

    expect(loader.ready).toBe(false);
  });
});
