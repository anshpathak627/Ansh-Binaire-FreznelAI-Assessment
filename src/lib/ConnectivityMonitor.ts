export type ConnectivityListener = (isOnline: boolean) => void;

const PROBE_URL = "https://huggingface.co/api/models?limit=1";
const HEARTBEAT_MS = 6000;
const PROBE_TIMEOUT_MS = 4000;

/**
 * ConnectivityMonitor determines "are we actually online" more reliably than
 * `navigator.onLine` alone, which only reflects the OS network-interface
 * state and can be wrong (e.g. connected to a LAN with no internet, or a
 * captive portal). Per the assessment ("connectivity will be switched to
 * online/offline randomly"), we combine:
 *
 *   1. Browser `online`/`offline` events for instant feedback.
 *   2. A periodic heartbeat: a lightweight, no-cache HEAD/GET probe against
 *      the real models API on a fixed interval, with a timeout, so we
 *      detect real reachability even if the browser still thinks it's
 *      online (or vice versa).
 *
 * The monitor is a class so it can be instantiated once and shared, keeping
 * this business logic out of React components.
 */
export class ConnectivityMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<ConnectivityListener> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    window.addEventListener("online", this.handleBrowserOnline);
    window.addEventListener("offline", this.handleBrowserOffline);
    this.startHeartbeat();
  }

  private handleBrowserOnline = (): void => {
    // Don't blindly trust it -- immediately verify with a probe.
    this.probe();
  };

  private handleBrowserOffline = (): void => {
    this.setOnline(false);
  };

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => this.probe(), HEARTBEAT_MS);
    this.probe();
  }

  private probe(): void {
    if (!navigator.onLine) {
      this.setOnline(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    fetch(PROBE_URL, { method: "GET", cache: "no-store", signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        this.setOnline(res.ok);
      })
      .catch(() => {
        clearTimeout(timeout);
        this.setOnline(false);
      });
  }

  private setOnline(value: boolean): void {
    if (value !== this.isOnline) {
      this.isOnline = value;
      this.listeners.forEach((l) => l(this.isOnline));
    }
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public dispose(): void {
    window.removeEventListener("online", this.handleBrowserOnline);
    window.removeEventListener("offline", this.handleBrowserOffline);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}

export const connectivityMonitor = new ConnectivityMonitor();
