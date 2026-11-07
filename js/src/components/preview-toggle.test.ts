// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasDismissedWatchHint, recordWatchHintDismissed } from './preview-toggle.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('the one-time Watch note survives a blocked store', () => {
  it('reads as not yet dismissed when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(hasDismissedWatchHint()).toBe(false);
  });

  it('reads a stored dismissal from an earlier visit', () => {
    localStorage.setItem('lightener:watch-hint:v1', 'dismissed');
    expect(hasDismissedWatchHint()).toBe(true);
  });

  it('stays dismissed for this page even when the store refuses the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    localStorage.clear();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    expect(() => recordWatchHintDismissed()).not.toThrow();
    expect(hasDismissedWatchHint()).toBe(true);
  });
});
