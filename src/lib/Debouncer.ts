/**
 * Debouncer: delays invoking a callback until `waitMs` has elapsed since the
 * *last* time `trigger()` was called. Used on the raw keystroke input so we
 * don't react until the user pauses typing.
 *
 * Debouncing and throttling solve different problems and are implemented as
 * two separate reusable classes (see Throttler.ts):
 *  - Debounce = "wait until things go quiet" (collapse a burst into one call,
 *    fired after the burst ends). Good for raw keystrokes.
 *  - Throttle = "no more than once per window" (fire on a steady cadence
 *    even during a continuous burst). Good for guarding the actual network
 *    call so it can never be spammed, even if something else (e.g. a
 *    programmatic filter change) fires many times back to back.
 * We use both together: debounce the keystrokes into a settled query, then
 * throttle the resulting fetch trigger.
 */
export class Debouncer<Args extends unknown[]> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly waitMs: number;

  constructor(waitMs: number) {
    this.waitMs = waitMs;
  }

  public trigger(fn: (...args: Args) => void, ...args: Args): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      fn(...args);
    }, this.waitMs);
  }

  public cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
