/**
 * SaveConfirmGuard owns the post-save confirmation fence: the 8s confirm timer,
 * the 2s success-display timer, the monotonic save generation, and the resolver
 * for the promise `saveCurves()` awaits.
 *
 * It is a stateful class driven through a host interface (like
 * `preview-controller.ts`), not a pure reducer. The confirmation lifecycle is
 * inherently imperative — two timers, a promise resolver, a generation fence —
 * so forcing it into a reducer would just leak the timers back into the card.
 * Do NOT collapse this onto the pure-reducer pattern.
 *
 * The crux it encapsulates: a save's confirmation does NOT come from the save
 * code. `_onSave` dispatches `save-success` (→ confirming) and arms this guard;
 * the actual `save-confirmed`/`save-error` signal fires later from the LOAD path
 * (`_tryLoadCurves`), fenced by the generation so a stale reload can't confirm a
 * newer save. This guard moves that machinery out of the god-file while keeping
 * every behavioral invariant the integration suite enforces.
 *
 *      _onSave ──► arm() ──► {generation, settled}
 *                   │  (bumps generation, starts 8s timer, returns promise)
 *                   ▼
 *   load path ──► confirm(gen) / fail(gen, msg)   (re-checked vs LIVE generation)
 *                   │  dispatch save-confirmed/-error via host; confirm() arms 2s timer
 *                   ▼
 *   card._dispatchSave leaves 'confirming' ──► onLeaveConfirming(phase, left)
 *                   │  clears confirm timer (any non-confirming phase); settles awaiter
 *                   ▼
 *   disconnect ──► settleError(); <card resets _load>; dispose()
 *
 * The guard NEVER touches `_load` — the 8s timeout must not force-clear a reload
 * that is still in flight (the hung-reload invariant).
 */
import type { SaveAction, SaveState } from './save-lifecycle.js';

export const SAVE_CONFIRM_TIMEOUT_MS = 8000;
export const SAVE_SUCCESS_DISPLAY_MS = 2000;

export interface SaveConfirmGuardHost {
  // Dispatch a save-lifecycle action into the card's reducer-backed @state.
  dispatchSave(action: SaveAction): void;
  // Read the current save phase. Used by the async timeout and the confirm/fail
  // re-checks, which fire with no caller-supplied phase in hand.
  getSavePhase(): SaveState['phase'];
}

export class SaveConfirmGuard {
  private _confirmTimer: ReturnType<typeof setTimeout> | null = null;
  private _successTimer: ReturnType<typeof setTimeout> | null = null;
  // Monotonic save counter, bumped each time a save enters the confirming
  // phase. Lets a late reload or timer tell "my save" from a newer one.
  private _generation = 0;
  // Resolver for the in-flight arm() promise, or null.
  private _resolve: ((outcome: 'confirmed' | 'error') => void) | null = null;

  public constructor(
    private readonly _host: SaveConfirmGuardHost,
    private readonly _confirmTimeoutMs = SAVE_CONFIRM_TIMEOUT_MS,
    private readonly _successDisplayMs = SAVE_SUCCESS_DISPLAY_MS
  ) {}

  public currentGeneration(): number {
    return this._generation;
  }

  // Arm the confirmation fence for a fresh save. Mints + bumps the generation
  // internally (the guard is the sole owner of the counter), starts the 8s
  // timeout, and returns the new generation plus a promise that resolves when
  // the confirming phase ends for ANY reason: the backend re-fetch dispatches
  // save-confirmed/-error, or this timer fires. Call AFTER dispatching
  // save-success so the phase is already 'confirming'.
  public arm(): { generation: number; settled: Promise<'confirmed' | 'error'> } {
    const generation = ++this._generation;
    this._clearConfirmTimer();
    // Defensive: settle any orphaned resolver before overwriting it.
    this._settle('error');
    const settled = new Promise<'confirmed' | 'error'>((resolve) => {
      this._resolve = resolve;
      this._confirmTimer = setTimeout(() => {
        this._confirmTimer = null;
        if (this._generation !== generation) return;
        if (this._host.getSavePhase() !== 'confirming') return;
        // Do NOT clear _load here — the original get_curves request is still in
        // flight. Forcing it false lets a retry start a second, overlapping
        // load; a late stale response could then overwrite _curves. The hung
        // reload clears _load itself via finishLoad. The guard has no _load
        // access by design. confirming -> error; onLeaveConfirming settles
        // this promise with 'error'.
        this._host.dispatchSave({ type: 'save-error', message: 'Save confirmation timed out.' });
      }, this._confirmTimeoutMs);
    });
    return { generation, settled };
  }

  // Backend re-fetch succeeded for save `generation`. Re-checks against the LIVE
  // generation (not the captured arg) and the live phase, then confirms and arms
  // the 2s success-display timer whose callback clears the banner via save-clear.
  public confirm(generation: number): void {
    if (this._host.getSavePhase() !== 'confirming') return;
    if (generation !== this._generation) return;
    this._host.dispatchSave({ type: 'save-confirmed' });
    this._clearSuccessTimer();
    this._successTimer = setTimeout(() => {
      this._successTimer = null;
      this._host.dispatchSave({ type: 'save-clear' });
    }, this._successDisplayMs);
  }

  // Backend re-fetch failed for save `generation`. Same live re-check as confirm.
  public fail(generation: number, message: string): void {
    if (this._host.getSavePhase() !== 'confirming') return;
    if (generation !== this._generation) return;
    this._host.dispatchSave({ type: 'save-error', message });
  }

  // Called by the card's _dispatchSave whenever a dispatch lands the FSM in a
  // non-confirming phase. Clears the confirm timer on EVERY such exit (not only
  // a fresh leave — a re-dispatch while already non-confirming must still drain a
  // stale timer), and settles the awaiter only when we actually left 'confirming'.
  public onLeaveConfirming(phase: SaveState['phase'], leftConfirming: boolean): void {
    this._clearConfirmTimer();
    if (leftConfirming) {
      this._settle(phase === 'error' ? 'error' : 'confirmed');
    }
  }

  // Settle the pending awaiter as 'error' WITHOUT dispatching. The disconnect
  // path calls this BEFORE it resets _load and dispatches `reset`, because
  // reset -> idle would otherwise make onLeaveConfirming settle 'confirmed'.
  public settleError(): void {
    this._settle('error');
  }

  // Full teardown: clear both timers and settle any pending awaiter as 'error'.
  // Idempotent. Called last in disconnectedCallback (after any settleError +
  // reset), so a second settle here is a no-op.
  public dispose(): void {
    this._clearSuccessTimer();
    this._clearConfirmTimer();
    this._settle('error');
  }

  // Idempotent — nulls the resolver before resolving so the awaiter never
  // observes two outcomes.
  private _settle(outcome: 'confirmed' | 'error'): void {
    const resolve = this._resolve;
    if (resolve) {
      this._resolve = null;
      resolve(outcome);
    }
  }

  private _clearConfirmTimer(): void {
    if (this._confirmTimer) {
      clearTimeout(this._confirmTimer);
      this._confirmTimer = null;
    }
  }

  private _clearSuccessTimer(): void {
    if (this._successTimer) {
      clearTimeout(this._successTimer);
      this._successTimer = null;
    }
  }
}
