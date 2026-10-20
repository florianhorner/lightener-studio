import { prefersReducedMotion } from './motion.js';
import { CURVE_PRESETS, type PresetDef } from './presets.js';

export type CoachPhase = 'inactive' | 'choose_shape' | 'ready_to_save' | 'complete';

export interface CoachControllerHost {
  isReady(): boolean;
  setTrial(preset: PresetDef): void;
  clearTrial(): void;
  requestUpdate(): void;
}

const SHIMMER_STEP_MS = 1350;
const SHIMMER_PRESETS = ['dim_accent', 'late_starter', 'night_mode'];

/** Owns transient guidance and its display-only, one-shot first-run animation. */
export class CoachController {
  private _phase: CoachPhase = 'inactive';
  private _firstRun = false;
  private _shimmerStarted = false;
  private _shimmerActive = false;
  private _shimmerTimer: number | null = null;
  private _target: HTMLElement | null = null;
  private readonly _onInteraction = (event: Event): void => {
    if (event.isTrusted) this.interrupt();
  };
  private readonly _onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') this.stopShimmer();
    else this.maybeStartShimmer();
  };

  public constructor(private readonly _host: CoachControllerHost) {}

  public get phase(): CoachPhase {
    return this._phase;
  }

  public configure(firstRun: boolean, entityChanged: boolean): void {
    const wasFirstRun = this._firstRun;
    this._firstRun = firstRun;
    if (entityChanged) {
      this.stopShimmer();
      this._shimmerStarted = false;
      this._setPhase(firstRun ? 'choose_shape' : 'inactive');
    } else if (firstRun && !wasFirstRun && this._phase === 'inactive') {
      this._setPhase('choose_shape');
      this._shimmerStarted = false;
      this.maybeStartShimmer();
    }
  }

  public connect(target: HTMLElement): void {
    if (this._target === target) return;
    if (this._target) this.disconnect();
    this._target = target;
    target.addEventListener('pointerdown', this._onInteraction, true);
    target.addEventListener('keydown', this._onInteraction, true);
    target.addEventListener('focusin', this._onInteraction, true);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  public disconnect(): void {
    this.stopShimmer();
    if (!this._target) return;
    this._target.removeEventListener('pointerdown', this._onInteraction, true);
    this._target.removeEventListener('keydown', this._onInteraction, true);
    this._target.removeEventListener('focusin', this._onInteraction, true);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this._target = null;
  }

  public maybeStartShimmer(): void {
    if (
      !this._target ||
      !this._firstRun ||
      this._shimmerStarted ||
      this._phase !== 'choose_shape' ||
      !this._host.isReady() ||
      document.visibilityState !== 'visible' ||
      prefersReducedMotion()
    ) {
      return;
    }
    const ideas = SHIMMER_PRESETS.map((id) =>
      CURVE_PRESETS.find((preset) => preset.id === id)
    ).filter((preset): preset is PresetDef => preset !== undefined);
    if (ideas.length === 0) return;

    this._shimmerStarted = true;
    this._shimmerActive = true;
    let index = 0;
    const showNext = (): void => {
      if (!this._shimmerActive) return;
      if (index >= ideas.length) {
        this._shimmerActive = false;
        this._shimmerTimer = null;
        this._host.clearTrial();
        return;
      }
      this._host.setTrial(ideas[index++]);
      this._shimmerTimer = window.setTimeout(showNext, SHIMMER_STEP_MS);
    };
    showNext();
  }

  public stopShimmer(): void {
    if (this._shimmerTimer !== null) {
      window.clearTimeout(this._shimmerTimer);
      this._shimmerTimer = null;
    }
    if (!this._shimmerActive) return;
    this._shimmerActive = false;
    this._host.clearTrial();
  }

  public interrupt(): void {
    this._shimmerStarted = true;
    this.stopShimmer();
  }

  public toggle(dirty: boolean): void {
    if (this._phase !== 'inactive') this.dismiss();
    else this._setPhase(dirty ? 'ready_to_save' : 'choose_shape');
  }

  public dismiss(): void {
    this.stopShimmer();
    this._setPhase('inactive');
  }

  public afterEdit(): void {
    this.stopShimmer();
    if (this._phase !== 'inactive') this._setPhase('ready_to_save');
  }

  public afterClean(): void {
    if (this._phase === 'ready_to_save') this._setPhase('choose_shape');
  }

  public afterSave(): void {
    if (this._phase !== 'ready_to_save') return;
    this.stopShimmer();
    this._setPhase('complete');
  }

  private _setPhase(phase: CoachPhase): void {
    if (this._phase === phase) return;
    this._phase = phase;
    this._host.requestUpdate();
  }
}
