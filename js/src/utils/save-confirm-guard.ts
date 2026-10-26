/**
 * Bounds waiting for an authoritative saved receipt and owns the success timer.
 * The card validates identity and complete content before confirm(). A timeout
 * settles false without changing load state or discarding the draft. Context
 * generations in the card fence group switches, disconnects and late receipts.
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

  // Arm after save-start, before submitting the guarded request. The returned
  // promise settles on validated confirmation, failure, timeout or teardown.
  // The card advances saving → confirming only after validating the receipt.
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
        if (!['saving', 'confirming'].includes(this._host.getSavePhase())) return;
        // Timeout says nothing about the backend outcome. The card retains
        // draft, baseline and intended content, blocks resubmission and offers
        // Check saved state. Independent in-flight loads remain untouched.
        this._host.dispatchSave({ type: 'save-error', message: 'Save confirmation timed out.' });
      }, this._confirmTimeoutMs);
    });
    return { generation, settled };
  }

  // Validated authoritative receipt succeeded for save `generation`. Re-checks against the LIVE
  // generation (not the captured arg) and the live phase, then confirms and arms
  // the 2s success-display timer whose callback clears the banner via save-clear.
  public confirm(generation: number): void {
    if (this._host.getSavePhase() !== 'confirming') return;
    if (generation !== this._generation) return;
    this._host.dispatchSave({ type: 'save-confirmed' });
    this._clearSuccessTimer();
    this._successTimer = setTimeout(() => {
      this._successTimer = null;
      if (this._host.getSavePhase() === 'saved') {
        this._host.dispatchSave({ type: 'save-clear' });
      }
    }, this._successDisplayMs);
  }

  // Receipt failed for save `generation`. Same live re-check as confirm.
  public fail(generation: number, message: string): void {
    if (!['saving', 'confirming'].includes(this._host.getSavePhase())) return;
    if (generation !== this._generation) return;
    this._host.dispatchSave({ type: 'save-error', message });
  }

  // Called by the card's _dispatchSave when leaving saving/confirming. Clears the confirm timer on EVERY such exit (not only
  // a fresh leave — a re-dispatch while already non-confirming must still drain a
  // stale timer), and settles the awaiter only when we actually left 'confirming'.
  public onLeaveConfirming(phase: SaveState['phase'], leftConfirming: boolean): void {
    this._clearConfirmTimer();
    if (leftConfirming || phase === 'error') {
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
