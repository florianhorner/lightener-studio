// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { safeDefine } from './safe-define.js';

describe('safeDefine', () => {
  it('defines the element when the tag is not yet registered', () => {
    class FirstElement extends HTMLElement {}

    safeDefine('safe-define-fresh-tag', FirstElement);

    expect(customElements.get('safe-define-fresh-tag')).toBe(FirstElement);
  });

  it('is a silent no-op when the tag is already defined (double bundle execution)', () => {
    class FirstElement extends HTMLElement {}
    class SecondElement extends HTMLElement {}
    customElements.define('safe-define-taken-tag', FirstElement);

    // A bare customElements.define would throw here; the guard must not.
    expect(() => safeDefine('safe-define-taken-tag', SecondElement)).not.toThrow();
    expect(customElements.get('safe-define-taken-tag')).toBe(FirstElement);
  });
});
