/**
 * mutex.ts - Promise-based mutex with FIFO fair ordering
 *
 * Serialize async operations. runExclusive() for auto acquire/release.
 */

interface QueueEntry {
  resolve: () => void;
  reject: (err: Error) => void;
}

export class Mutex {
  private locked = false;
  private queue: QueueEntry[] = [];

  /**
   * Acquire the mutex. Waits if already locked in FIFO order.
   */
  acquire(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const entry: QueueEntry = { resolve, reject };

      if (!this.locked) {
        // Lock is free — take it now
        this.locked = true;
        resolve();
      } else {
        // Lock is held — queue this entry
        this.queue.push(entry);
      }
    });
  }

  /**
   * Release the mutex, processing the next waiter in FIFO order.
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next.resolve();
    } else {
      // No waiters — unlock
      this.locked = false;
    }
  }

  /**
   * Run a function exclusively - acquire, execute, release (with try-finally).
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Check if the mutex is currently held.
   */
  isLocked(): boolean {
    return this.locked;
  }
}
