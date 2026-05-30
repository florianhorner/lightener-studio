/** Lazy-loads <ha-entity-picker> exactly once per instance.
 *
 * HA registers ha-entity-picker lazily; the first component to reference it
 * must kick the load by instantiating a core card's config editor.  Falls back
 * to a plain <input> if the picker never becomes available.
 */
export class EntityPickerLoader {
  ready = false;
  /** True once <ha-entities-picker> (plural) is upgraded. Gated independently of
   * `ready`: the same loader kick ships both tags in one HA chunk, but the
   * singular's whenDefined resolving does NOT guarantee the plural is upgraded. */
  readyMulti = false;
  private started = false;

  constructor(
    private readonly isConnected: () => boolean,
    private readonly requestUpdate: () => void
  ) {}

  ensureLoaded(): void {
    if (this.started) return;
    this.started = true;
    if (customElements.get('ha-entity-picker')) {
      this.ready = true;
      // The singular is already upgraded; gate the plural independently.
      this.readyMulti = !!customElements.get('ha-entities-picker');
      if (!this.readyMulti) {
        customElements
          .whenDefined('ha-entities-picker')
          .then(() => {
            if (!this.isConnected()) return;
            this.readyMulti = true;
            this.requestUpdate();
          })
          .catch(() => {
            /* plural registration failed — single-picker fallback stays */
          });
      }
      return;
    }
    const kickLoaders = async () => {
      try {
        const loadHelpers = (window as unknown as { loadCardHelpers?: () => Promise<unknown> })
          .loadCardHelpers;
        if (typeof loadHelpers === 'function') await loadHelpers();
      } catch {
        /* ignore — direct path below still runs */
      }
      try {
        const entitiesCard = customElements.get('hui-entities-card') as
          | (CustomElementConstructor & { getConfigElement?: () => Promise<HTMLElement> })
          | undefined;
        await entitiesCard?.getConfigElement?.();
      } catch {
        /* ignore — whenDefined below will time out and we fall back */
      }
    };
    kickLoaders();
    const ready = customElements.whenDefined('ha-entity-picker');
    const timeout = new Promise<void>((r) => setTimeout(r, 1500));
    Promise.race([ready, timeout])
      .then(() => {
        if (!this.isConnected()) return;
        this.ready = !!customElements.get('ha-entity-picker');
        // Gate the plural tag independently: the same chunk loads both, but the
        // singular winning the race does not guarantee the plural is upgraded.
        this.readyMulti = !!customElements.get('ha-entities-picker');
        if (!this.ready) {
          console.warn(
            '[lightener] <ha-entity-picker> not available — falling back to plain input.'
          );
          // Picker may register after the 1500ms window; upgrade when it does.
          customElements
            .whenDefined('ha-entity-picker')
            .then(() => {
              if (!this.isConnected()) return;
              this.ready = true;
              this.requestUpdate();
            })
            .catch(() => {
              /* picker registration failed — already using fallback input */
            });
        }
        if (!this.readyMulti) {
          // The plural may upgrade after the singular / after the window; gate on
          // its own whenDefined so a late multi-select still renders natively.
          customElements
            .whenDefined('ha-entities-picker')
            .then(() => {
              if (!this.isConnected()) return;
              this.readyMulti = true;
              this.requestUpdate();
            })
            .catch(() => {
              /* plural registration failed — single-picker fallback stays */
            });
        }
        this.requestUpdate();
      })
      .catch(() => {
        /* defensive: unexpected rejection from race — component stays in fallback state */
      });
  }
}
