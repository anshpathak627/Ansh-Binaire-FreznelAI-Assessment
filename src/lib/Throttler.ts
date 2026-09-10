/**
 * Throttler: ensures a callback fires at most once per `intervalMs`, no
 * matter how often `trigger()` is called. Unlike Debouncer, the first call
 * fires immediately (leading edge) and any calls during the cooldown window
 * are coalesced into a single trailing-edge call with the latest args, so no
 * intent is ever silently dropped -- it's just rate-limited.
 *
 * We use this to guard the actual network fetch trigger: even if the search
 * query changes rapidly (fast typing after the debounce settles, or several
 * filter/sort changes fired programmatically in quick succession), the
 * underlying HTTP request to the models API is never issued more than once
 * per interval.
 */
export class Throttler<Args extends unknown[]> {
  private lastRunAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingArgs: Args | null = null;
  private pendingFn: ((...args: Args) => void) | null = null;

  private readonly intervalMs: number;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  public trigger(fn: (...args: Args) => void, ...args: Args): void {
    const now = Date.now();
    const elapsed = now - this.lastRunAt;

    if (elapsed >= this.intervalMs) {
      this.lastRunAt = now;
      fn(...args);
      return;
    }

    // within cooldown: remember the latest call and schedule a trailing run
    this.pendingArgs = args;
    this.pendingFn = fn;
    if (this.timer === null) {
      const remaining = this.intervalMs - elapsed;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.lastRunAt = Date.now();
        if (this.pendingFn && this.pendingArgs) {
          this.pendingFn(...this.pendingArgs);
        }
        this.pendingFn = null;
        this.pendingArgs = null;
      }, remaining);
    }
  }

  public cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingArgs = null;
    this.pendingFn = null;
  }
}
