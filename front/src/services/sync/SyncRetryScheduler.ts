// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitLab #14 (LBDS-272): the merge-queue retry scheduler as a single state
 * machine.
 *
 * Before this module the retry lifecycle was spread over four independent
 * guards (offline, auth, lock-busy and backoff), each with its own timer
 * arming logic, and every pre-merge review round moved a hole to a different
 * transition instead of closing the class of bug.
 *
 * The contract here is deliberately narrow:
 *
 *  - ONE predicate (`decide`) decides whether a retry is due and after how
 *    long. It is the only place that knows about the guards.
 *  - ONE timer, owned by that predicate.
 *  - `reschedule()` is called on every transition (back online, auth
 *    recovered, lock released, queue drained, item queued).
 *  - Coming back online owes a push: the transition itself is the evidence,
 *    because an item queued while offline persists no retry row and the
 *    debounce that would have pushed it never ran.
 *  - The lock-retry budget lives in the state, so it cannot be bypassed by a
 *    timer that re-arms itself.
 *
 * The state is in memory on purpose: a lock-busy retry persists nothing to
 * IndexedDB, so a scheduler that only inspects persisted rows cannot resume
 * it after an offline blip (finding #1 of #14).
 */

export type RetryDecisionReason =
  | 'scheduled'
  | 'offline'
  | 'auth_blocked'
  | 'queue_empty'
  | 'no_retry_pending'
  | 'lock_budget_exhausted'
  | 'disposed';

export interface RetryDecision {
  /** Whether a retry timer must be armed. */
  schedule: boolean;
  /** Delay of the armed timer, in milliseconds. */
  delayMs: number;
  /** Why the decision was taken. */
  reason: RetryDecisionReason;
}

/** Live view of the queue, read from the local database. */
export interface QueueState {
  /** The queue holds at least one row. */
  pending: boolean;
  /** At least one row carries retry evidence (`retryCount > 0` or `nextRetryAt`). */
  retryPending: boolean;
  /** Earliest `nextRetryAt` still in the future, if any. */
  nextRetryAt: number | null;
}

/** Full state the predicate is evaluated against. */
export interface SchedulerState {
  online: boolean;
  authBlocked: boolean;
  queuePending: boolean;
  retryPending: boolean;
  lockBusy: boolean;
  lockRetryAttempts: number;
  nextRetryAt: number | null;
}

export interface SyncRetrySchedulerOptions {
  /** Initial connectivity. Defaults to true; pass the live value at boot. */
  online?: boolean;
  /** Reads the live queue state. Called only when the scheduler may arm. */
  loadQueueState: () => Promise<QueueState>;
  /** The work a fired timer triggers (a queue drain attempt). */
  onFire: () => Promise<void>;
  /** Lower bound of the retry delay. */
  minDelayMs?: number;
  /** Upper bound of the retry delay. */
  maxDelayMs?: number;
  /** How many lock-busy retries are allowed before the scheduler gives up. */
  lockRetryMaxAttempts?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

const EMPTY_QUEUE_STATE: QueueState = {
  pending: false,
  retryPending: false,
  nextRetryAt: null,
};

export class SyncRetryScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private online = true;
  private authBlocked = false;
  /** In-memory evidence that a retry is owed (backoff applied, lock busy). */
  private retryPending = false;
  private lockBusy = false;
  private lockRetryAttempts = 0;
  private nextRetryAt: number | null = null;
  /** Last state the predicate was evaluated against (for diagnostics). */
  private lastState: SchedulerState | null = null;
  /** Last decision the predicate produced (for diagnostics). */
  private lastDecision: RetryDecision | null = null;
  /** Last error raised while reading the queue state (for diagnostics). */
  private lastError: unknown = null;

  /**
   * Every `reschedule()` bumps the generation. A load that resolves after a
   * newer reschedule is discarded, so a stale read can never arm a timer
   * that the latest state does not justify.
   */
  private generation = 0;

  private readonly loadQueueState: () => Promise<QueueState>;
  private readonly onFire: () => Promise<void>;
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly lockRetryMaxAttempts: number;
  private readonly now: () => number;

  constructor(options: SyncRetrySchedulerOptions) {
    this.loadQueueState = options.loadQueueState;
    this.onFire = options.onFire;
    this.online = options.online ?? true;
    this.minDelayMs = options.minDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.lockRetryMaxAttempts = options.lockRetryMaxAttempts ?? 45;
    this.now = options.now ?? (() => Date.now());
  }

  getState(): SchedulerState | null {
    return this.lastState;
  }

  getLastDecision(): RetryDecision | null {
    return this.lastDecision;
  }

  /** Last error raised while reading the queue state (for diagnostics). */
  getLastError(): unknown {
    return this.lastError;
  }

  /** Number of timers this scheduler currently owns (0 or 1). */
  get armedTimerCount(): number {
    return this.timer === null ? 0 : 1;
  }

  /**
   * Connectivity transition.
   *
   * Coming back online is itself the evidence that a push is owed: an item
   * queued while offline carries no retry evidence (`retryCount 0`, no
   * `nextRetryAt`) and the debounce that would have pushed it never ran.
   * Without this the queue stays "N pending" until the user taps sync.
   */
  setOnline(online: boolean): void {
    const cameBackOnline = !this.online && online;
    this.online = online;
    if (cameBackOnline) {
      this.retryPending = true;
    }
  }

  setAuthBlocked(blocked: boolean): void {
    this.authBlocked = blocked;
  }

  /**
   * A lock collision owes a retry. It persists nothing to IndexedDB, so the
   * evidence lives here: after an offline blip the scheduler still knows a
   * retry was pending.
   */
  markLockBusy(): void {
    this.lockBusy = true;
    this.lockRetryAttempts += 1;
    this.retryPending = true;
  }

  /** The lock was acquired: the lock-busy budget starts over. */
  markLockAcquired(): void {
    this.lockBusy = false;
    this.lockRetryAttempts = 0;
  }

  /** A failure put items into backoff: a retry is owed. */
  markRetryPending(nextRetryAt: number | null): void {
    this.retryPending = true;
    this.nextRetryAt = nextRetryAt;
  }

  /** The queue drained: nothing is owed anymore. */
  markQueueDrained(): void {
    this.retryPending = false;
    this.nextRetryAt = null;
    this.lockBusy = false;
    this.lockRetryAttempts = 0;
  }

  dispose(): void {
    this.disposed = true;
    this.generation += 1;
    this.clearTimer();
  }

  /**
   * The single predicate. Everything the scheduler knows is evaluated here,
   * in one place, and the result is either a delay or a reason.
   */
  decide(state: SchedulerState): RetryDecision {
    if (!state.online) {
      return { schedule: false, delayMs: 0, reason: 'offline' };
    }
    if (state.authBlocked) {
      return { schedule: false, delayMs: 0, reason: 'auth_blocked' };
    }
    if (!state.queuePending) {
      return { schedule: false, delayMs: 0, reason: 'queue_empty' };
    }
    if (!state.retryPending) {
      return { schedule: false, delayMs: 0, reason: 'no_retry_pending' };
    }
    if (state.lockBusy && state.lockRetryAttempts >= this.lockRetryMaxAttempts) {
      return { schedule: false, delayMs: 0, reason: 'lock_budget_exhausted' };
    }

    const now = this.now();
    const target = state.nextRetryAt === null ? this.minDelayMs : state.nextRetryAt - now + 250;
    const delay = Math.min(this.maxDelayMs, Math.max(this.minDelayMs, target));
    return { schedule: true, delayMs: delay, reason: 'scheduled' };
  }

  /**
   * Re-evaluates the predicate and (re)arms the single timer. Safe to call
   * from every transition: it never leaves more than one timer armed.
   */
  async reschedule(): Promise<void> {
    if (this.disposed) {
      this.clearTimer();
      return;
    }

    const generation = ++this.generation;

    // Offline and auth-blocked are known without touching the database, and
    // they are the two states where the scheduler must not do any work.
    const canInspectQueue = this.online && !this.authBlocked;
    let queueState: QueueState;
    try {
      queueState = canInspectQueue ? await this.loadQueueState() : EMPTY_QUEUE_STATE;
    } catch (error) {
      // A failed read is not a reason to produce an unhandled rejection, and
      // it is not a reason to arm a timer we cannot justify. The timer that
      // may already be armed keeps running.
      this.lastError = error;
      return;
    }

    // A disposed service (or a newer reschedule) invalidates this read: a
    // late resolution must never arm a timer.
    if (this.disposed || generation !== this.generation) return;

    if (canInspectQueue && !queueState.pending) {
      // The queue is empty: nothing is owed, whatever the previous state
      // believed. (Only when the queue was actually inspected: offline and
      // auth-blocked skip the read and must not clear the pending retry.)
      this.retryPending = false;
      this.nextRetryAt = null;
      this.lockBusy = false;
      this.lockRetryAttempts = 0;
    }

    const state: SchedulerState = {
      online: this.online,
      authBlocked: this.authBlocked,
      queuePending: queueState.pending,
      retryPending: this.retryPending || queueState.retryPending,
      lockBusy: this.lockBusy,
      lockRetryAttempts: this.lockRetryAttempts,
      // The queue rows are authoritative for the backoff deadline; the
      // in-memory value is only a fallback for a retry that persisted
      // nothing (a lock collision).
      nextRetryAt: queueState.nextRetryAt !== null ? queueState.nextRetryAt : this.nextRetryAt,
    };

    this.lastState = state;

    const decision = this.decide(state);
    this.lastDecision = decision;
    if (!decision.schedule) {
      this.clearTimer();
      return;
    }

    this.arm(decision.delayMs);
  }

  private arm(delayMs: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.fire();
    }, delayMs);
  }

  private async fire(): Promise<void> {
    // The attempt consumes the in-memory evidence. If it produces no new
    // evidence (the queue drained, or nothing could be attempted), the
    // scheduler must not re-arm itself on stale evidence.
    this.retryPending = false;
    try {
      await this.onFire();
    } catch {
      // The caller of the timer swallows its own errors; a failed attempt
      // must not break the scheduler loop.
    } finally {
      await this.reschedule();
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
