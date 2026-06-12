/**
 * Define a custom element only when the tag is not already registered.
 *
 * `customElements.define` throws on a duplicate tag, and the card bundle can
 * legitimately execute twice: once via the integration's extra-module URL and
 * once via a leftover manually-added Lovelace resource (or a stale
 * Workbox-cached copy of either). With bare `@customElement` decorators the
 * second execution throws at the FIRST component define — before any
 * module-level registration code (e.g. `registerCardMetadata`) runs. Guarding
 * every define keeps a double-load harmless: execution #1's classes stay
 * registered, execution #2 no-ops through its defines and still reaches the
 * rest of its module body.
 */
export function safeDefine(tag: string, cls: CustomElementConstructor): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, cls);
  }
}
