import { watch, type FSWatcher } from "chokidar";
import { SESSIONS_DIR } from "../utils/paths.js";
import { join } from "path";

export interface WatcherCallback {
  (): void;
}

class SessionWatcher {
  private watcher: FSWatcher | null = null;
  private subscribers = new Set<WatcherCallback>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private usePolling = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.watcher) return;

    try {
      this.watcher = watch(join(SESSIONS_DIR, "*.json"), {
        persistent: true,
        ignoreInitial: true,
        usePolling: this.usePolling,
        interval: this.usePolling ? 500 : undefined,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      this.watcher
        .on("add", () => this.notifyChange())
        .on("change", () => this.notifyChange())
        .on("unlink", () => this.notifyChange())
        .on("error", (error) => {
          console.error("[watcher] Error:", error);
          // Fallback to polling on error
          if (!this.usePolling) {
            this.usePolling = true;
            this.restart();
          }
        });

      console.log("[watcher] Started watching", SESSIONS_DIR);
    } catch (error) {
      console.error("[watcher] Failed to start, falling back to polling:", error);
      this.startPollingFallback();
    }
  }

  private startPollingFallback(): void {
    if (this.pollTimer) return;

    console.log("[watcher] Using polling fallback (500ms)");
    let lastCheck = Date.now();

    this.pollTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastCheck >= 500) {
        lastCheck = now;
        this.notifySubscribers();
      }
    }, 500);
  }

  private notifyChange(): void {
    // Debounce rapid changes
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.notifySubscribers();
    }, 50);
  }

  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      try {
        callback();
      } catch (error) {
        console.error("[watcher] Subscriber error:", error);
      }
    }
  }

  subscribe(callback: WatcherCallback): () => void {
    this.subscribers.add(callback);
    if (this.subscribers.size === 1) {
      this.start();
    }
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  private stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    console.log("[watcher] Stopped");
  }

  private restart(): void {
    this.stop();
    this.start();
  }
}

export const sessionWatcher = new SessionWatcher();
