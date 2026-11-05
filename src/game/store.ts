import { BACKUP_KEY, SAVE_KEY, deserialize, serialize } from "./save";
import { clickManual, buyBuilding, buyUpgrade, createInitialState, resolveY2K, tick, type BuyMode } from "./engine";
import type { BuildingId, GameState } from "./types";

/**
 * Client-side store. The game logic lives in engine.ts; this file only owns the clock,
 * persistence and subscriptions. Time advances in fixed steps, capped so that a tab
 * left in the background does not jump ahead (offline progress is phase 6).
 */

const STEP_MS = 100;
const MAX_STEP_MS = 1000;
const AUTOSAVE_MS = 10_000;

export interface StoreSnapshot {
  state: GameState;
  /** Shown once after a load that had to start fresh. */
  notice: string | null;
  /** Manual clicks this session, so the scene can animate each one. Not saved. */
  clicks: number;
}

type Listener = () => void;

export class GameStore {
  private snapshot: StoreSnapshot;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private autosave: ReturnType<typeof setInterval> | null = null;
  private lastNow = 0;
  private storage: Storage | null;

  constructor(storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null) {
    this.storage = storage;
    this.snapshot = this.load();
  }

  getSnapshot = (): StoreSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start(): void {
    if (this.timer) return;
    this.lastNow = Date.now();
    this.timer = setInterval(() => this.step(), STEP_MS);
    this.autosave = setInterval(() => this.save(), AUTOSAVE_MS);
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", this.save);
      document.addEventListener("visibilitychange", this.onVisibility);
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.autosave) clearInterval(this.autosave);
    this.timer = null;
    this.autosave = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.save);
      document.removeEventListener("visibilitychange", this.onVisibility);
    }
    this.save();
  }

  // Actions -------------------------------------------------------------

  click = (): void => {
    this.snapshot = {
      ...this.snapshot,
      state: clickManual(this.snapshot.state),
      clicks: this.snapshot.clicks + 1,
    };
    this.listeners.forEach((listener) => listener());
  };

  buy = (id: BuildingId, mode: BuyMode): void => this.update((s) => buyBuilding(s, id, mode));

  upgrade = (id: string): void => this.update((s) => buyUpgrade(s, id));

  answerY2K = (choice: "patch" | "ignore"): void => this.update((s) => resolveY2K(s, choice));

  /** Writes the current state to localStorage. Never overwrites a save it cannot read. */
  save = (): void => {
    if (!this.storage) return;
    try {
      this.storage.setItem(SAVE_KEY, serialize(this.snapshot.state));
    } catch {
      // Quota or private mode: the game keeps running, the save is retried later.
    }
  };

  // Internals -----------------------------------------------------------

  private step(): void {
    const now = Date.now();
    const elapsed = Math.min(Math.max(now - this.lastNow, 0), MAX_STEP_MS);
    this.lastNow = now;
    if (elapsed <= 0) return;
    this.update((s) => tick(s, elapsed));
  }

  private onVisibility = (): void => {
    if (document.visibilityState === "hidden") this.save();
  };

  private update(fn: (s: GameState) => GameState): void {
    const next = fn(this.snapshot.state);
    if (next === this.snapshot.state) return;
    this.snapshot = { ...this.snapshot, state: next };
    this.listeners.forEach((listener) => listener());
  }

  private load(): StoreSnapshot {
    if (!this.storage) return { state: createInitialState(), notice: null, clicks: 0 };
    const raw = this.storage.getItem(SAVE_KEY);
    if (raw === null) return { state: createInitialState(), notice: null, clicks: 0 };
    const result = deserialize(raw);
    if (result.ok) return { state: result.state, notice: null, clicks: 0 };
    // Unreadable save: keep a copy, then start fresh. Never overwrite silently.
    try {
      this.storage.setItem(BACKUP_KEY, raw);
    } catch {
      // Nothing more can be done without storage; the notice still tells the player.
    }
    return {
      state: createInitialState(),
      clicks: 0,
      notice: `La sauvegarde n'a pas pu être lue (${result.reason}). Une copie a été conservée.`,
    };
  }
}

/** Shared instance for the browser. Created lazily so that the server never touches storage. */
let shared: GameStore | null = null;

export function getStore(): GameStore {
  if (!shared) shared = new GameStore();
  return shared;
}
