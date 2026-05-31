import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SAVE_CONFIRM_TIMEOUT_MS,
  SAVE_SUCCESS_DISPLAY_MS,
  SaveConfirmGuard,
  type SaveConfirmGuardHost,
} from './save-confirm-guard.js';
import {
  INITIAL_SAVE_STATE,
  reduce as reduceSave,
  type SaveAction,
  type SaveState,
} from './save-lifecycle.js';

// TestHost mirrors the card's wiring: dispatchSave reduces the phase and, when a
// dispatch leaves the confirming phase, calls guard.onLeaveConfirming(...) — the
// single settle point, exactly as lightener-curve-card.ts._dispatchSave does.
class TestHost implements SaveConfirmGuardHost {
  state: SaveState = INITIAL_SAVE_STATE;
  dispatched: SaveAction[] = [];
  guard!: SaveConfirmGuard;

  dispatchSave(action: SaveAction): void {
    this.dispatched.push(action);
    const leftConfirming = this.state.phase === 'confirming';
    this.state = reduceSave(this.state, action);
    if (this.state.phase !== 'confirming') {
      this.guard.onLeaveConfirming(this.state.phase, leftConfirming);
    }
  }

  getSavePhase(): SaveState['phase'] {
    return this.state.phase;
  }

  types(): string[] {
    return this.dispatched.map((a) => a.type);
  }
}

function makeGuard(): { host: TestHost; guard: SaveConfirmGuard } {
  const host = new TestHost();
  const guard = new SaveConfirmGuard(host);
  host.guard = guard;
  return { host, guard };
}

// Drive the FSM into `confirming` the way _onSave does (save-start → save-success),
// then arm the guard. Returns the arm() result.
function enterConfirmingAndArm(host: TestHost, guard: SaveConfirmGuard) {
  host.dispatchSave({ type: 'save-start' }); // idle → saving
  host.dispatchSave({ type: 'save-success' }); // saving → confirming
  return guard.arm();
}

const flush = () => Promise.resolve();

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SaveConfirmGuard — generation', () => {
  // (1) arm() mints a monotonically increasing generation; currentGeneration() tracks it.
  it('arm() mints monotonically and currentGeneration() returns the latest', () => {
    const { host, guard } = makeGuard();
    expect(guard.currentGeneration()).toBe(0);
    const a = enterConfirmingAndArm(host, guard);
    expect(a.generation).toBe(1);
    expect(guard.currentGeneration()).toBe(1);
    // Force back to a state from which save-start is accepted, then arm again.
    host.dispatchSave({ type: 'save-confirmed' }); // confirming → saved
    const b = enterConfirmingAndArm(host, guard);
    expect(b.generation).toBe(2);
    expect(guard.currentGeneration()).toBe(2);
  });
});

describe('SaveConfirmGuard — confirm', () => {
  // (2) arm()'s promise resolves 'confirmed' once the load path confirms.
  it('confirm(current) resolves the settled promise with "confirmed"', async () => {
    const { host, guard } = makeGuard();
    const { generation, settled } = enterConfirmingAndArm(host, guard);
    guard.confirm(generation);
    expect(await settled).toBe('confirmed');
  });

  // (4) confirm(current) dispatches save-confirmed and arms the 2s success timer
  // whose callback dispatches save-clear.
  it('confirm(current) dispatches save-confirmed then save-clear after the display window', async () => {
    const { host, guard } = makeGuard();
    const { generation } = enterConfirmingAndArm(host, guard);
    guard.confirm(generation);
    expect(host.types()).toContain('save-confirmed');
    expect(host.types()).not.toContain('save-clear');
    await vi.advanceTimersByTimeAsync(SAVE_SUCCESS_DISPLAY_MS);
    expect(host.types()).toContain('save-clear');
    expect(host.getSavePhase()).toBe('idle');
  });

  // (3) A stale confirm (older generation) is a no-op.
  it('confirm(stale) dispatches nothing', () => {
    const { host, guard } = makeGuard();
    const { generation } = enterConfirmingAndArm(host, guard);
    const before = host.types().length;
    guard.confirm(generation - 1);
    expect(host.types().length).toBe(before);
    expect(host.getSavePhase()).toBe('confirming');
  });

  // confirm() is a no-op when not in the confirming phase.
  it('confirm() is a no-op when the phase already left confirming', () => {
    const { host, guard } = makeGuard();
    const { generation } = enterConfirmingAndArm(host, guard);
    host.dispatchSave({ type: 'save-error', message: 'boom' }); // confirming → error
    const before = host.types().length;
    guard.confirm(generation);
    expect(host.types().length).toBe(before);
  });

  // (5) A second confirm within the success window clears the prior success timer
  // so only one save-clear fires.
  it('a second save cycle clears the previous success timer (no double save-clear)', async () => {
    const { host, guard } = makeGuard();
    const first = enterConfirmingAndArm(host, guard);
    guard.confirm(first.generation); // arms success timer #1, phase → saved
    // Start a second save before timer #1's 2s elapses.
    const second = enterConfirmingAndArm(host, guard); // saved → saving → confirming
    guard.confirm(second.generation); // should clear timer #1, arm timer #2
    await vi.advanceTimersByTimeAsync(SAVE_SUCCESS_DISPLAY_MS);
    const clears = host.types().filter((t) => t === 'save-clear');
    expect(clears).toHaveLength(1);
  });
});

describe('SaveConfirmGuard — fail', () => {
  // (6a) fail(current, msg) dispatches save-error with the message and resolves 'error'.
  it('fail(current, msg) dispatches save-error and resolves "error"', async () => {
    const { host, guard } = makeGuard();
    const { generation, settled } = enterConfirmingAndArm(host, guard);
    guard.fail(generation, 'Save failed. Check connection.');
    expect(host.dispatched).toContainEqual({
      type: 'save-error',
      message: 'Save failed. Check connection.',
    });
    expect(await settled).toBe('error');
  });

  // (6b) A stale fail is a no-op — tested separately from a stale confirm.
  it('fail(stale) dispatches nothing', () => {
    const { host, guard } = makeGuard();
    const { generation } = enterConfirmingAndArm(host, guard);
    const before = host.types().length;
    guard.fail(generation - 1, 'ignored');
    expect(host.types().length).toBe(before);
    expect(host.getSavePhase()).toBe('confirming');
  });

  // fail() must NOT arm a success-display timer — a failed save shows no banner.
  it('fail(current) arms no success timer', async () => {
    const { host, guard } = makeGuard();
    const { generation } = enterConfirmingAndArm(host, guard);
    guard.fail(generation, 'Save failed. Check connection.');
    const before = host.types().length;
    await vi.advanceTimersByTimeAsync(SAVE_SUCCESS_DISPLAY_MS + SAVE_CONFIRM_TIMEOUT_MS);
    expect(host.types().length).toBe(before); // no save-clear, no late timeout
  });
});

describe('SaveConfirmGuard — confirm timeout', () => {
  // (7) The 8s timeout dispatches save-error only when still confirming AND the
  // generation matches. The guard never touches _load (it has no _load access by
  // construction — there is no load state on the host interface).
  it('fires save-error after the timeout when still confirming', async () => {
    const { host, guard } = makeGuard();
    const { settled } = enterConfirmingAndArm(host, guard);
    await vi.advanceTimersByTimeAsync(SAVE_CONFIRM_TIMEOUT_MS);
    expect(host.dispatched).toContainEqual({
      type: 'save-error',
      message: 'Save confirmation timed out.',
    });
    expect(await settled).toBe('error');
  });

  it('does NOT fire when the phase already left confirming', async () => {
    const { host, guard } = makeGuard();
    enterConfirmingAndArm(host, guard);
    guard.confirm(guard.currentGeneration()); // → saved, clears confirm timer
    const before = host.types().length;
    await vi.advanceTimersByTimeAsync(SAVE_CONFIRM_TIMEOUT_MS);
    // Only the success-timer's save-clear may have been added, never a timeout error.
    expect(host.dispatched).not.toContainEqual({
      type: 'save-error',
      message: 'Save confirmation timed out.',
    });
    expect(host.types().length).toBeGreaterThanOrEqual(before);
  });

  it('does NOT fire for a superseded generation', async () => {
    const { host, guard } = makeGuard();
    const stale = enterConfirmingAndArm(host, guard);
    // A newer save bumps the generation; the stale timer must be ignored.
    host.dispatchSave({ type: 'save-confirmed' }); // leave confirming so re-arm is clean
    enterConfirmingAndArm(host, guard); // generation now 2, fresh confirm timer
    void stale;
    const before = host.dispatched.filter(
      (a) => a.type === 'save-error' && a.message === 'Save confirmation timed out.'
    ).length;
    await vi.advanceTimersByTimeAsync(SAVE_CONFIRM_TIMEOUT_MS);
    const after = host.dispatched.filter(
      (a) => a.type === 'save-error' && a.message === 'Save confirmation timed out.'
    ).length;
    // Exactly one timeout fires (the live gen-2 timer), not the superseded one.
    expect(after - before).toBe(1);
  });
});

describe('SaveConfirmGuard — settle / dispose', () => {
  // (8) settleError() then a leave settles the awaiter exactly once (idempotent).
  it('settleError() resolves "error" and a later leave does not re-resolve', async () => {
    const { host, guard } = makeGuard();
    const { settled } = enterConfirmingAndArm(host, guard);
    let resolveCount = 0;
    let outcome: 'confirmed' | 'error' | undefined;
    void settled.then((v) => {
      resolveCount += 1;
      outcome = v;
    });
    guard.settleError();
    await flush();
    // Now drive a leave that would settle 'confirmed' — must be a no-op (already settled).
    host.dispatchSave({ type: 'reset' }); // confirming → idle
    await flush();
    expect(resolveCount).toBe(1);
    expect(outcome).toBe('error');
  });

  // (9) Arming while a prior resolver is still live settles the orphan as 'error'.
  it('arm() settles an orphaned prior resolver with "error"', async () => {
    const { host, guard } = makeGuard();
    const first = enterConfirmingAndArm(host, guard);
    // Re-arm without the first ever settling (simulates a defensive overlap).
    guard.arm();
    expect(await first.settled).toBe('error');
  });

  // (10) onLeaveConfirming maps idle/saved → 'confirmed', error → 'error', and clears
  // the confirm timer even when called while already non-confirming (re-dispatch).
  it('onLeaveConfirming maps phase to outcome and clears the confirm timer', async () => {
    const { host, guard } = makeGuard();
    const a = enterConfirmingAndArm(host, guard);
    host.dispatchSave({ type: 'save-confirmed' }); // confirming → saved, settles 'confirmed'
    expect(await a.settled).toBe('confirmed');
    // The confirm timer was cleared on leave: advancing past the timeout fires nothing new.
    const beforeTimeout = host.dispatched.filter(
      (x) => x.type === 'save-error' && x.message === 'Save confirmation timed out.'
    ).length;
    await vi.advanceTimersByTimeAsync(SAVE_CONFIRM_TIMEOUT_MS);
    const afterTimeout = host.dispatched.filter(
      (x) => x.type === 'save-error' && x.message === 'Save confirmation timed out.'
    ).length;
    expect(afterTimeout).toBe(beforeTimeout);
  });

  // (11) dispose() clears both timers and settles 'error'; idempotent.
  it('dispose() clears timers, settles "error", and is idempotent', async () => {
    const { host, guard } = makeGuard();
    const { settled } = enterConfirmingAndArm(host, guard);
    guard.dispose();
    expect(await settled).toBe('error');
    const before = host.types().length;
    // No timer fires after dispose.
    await vi.advanceTimersByTimeAsync(SAVE_CONFIRM_TIMEOUT_MS + SAVE_SUCCESS_DISPLAY_MS);
    expect(host.types().length).toBe(before);
    // Second dispose is a no-op.
    expect(() => guard.dispose()).not.toThrow();
  });

  // (11b) dispose() while a SUCCESS timer is pending (post-confirm) clears it —
  // guards against a regression that only cleared the confirm timer.
  it('dispose() clears a pending success timer (no save-clear after teardown)', async () => {
    const { host, guard } = makeGuard();
    const { generation } = enterConfirmingAndArm(host, guard);
    guard.confirm(generation); // success timer now pending, phase → saved
    const before = host.types().length;
    guard.dispose();
    await vi.advanceTimersByTimeAsync(SAVE_SUCCESS_DISPLAY_MS);
    expect(host.types().length).toBe(before); // no save-clear fired
  });
});
