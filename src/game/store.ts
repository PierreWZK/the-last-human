import { BACKUP_KEY, SAVE_KEY, deserialize, serialize } from "./save";
import {
  buyKnowledgeBonus,
  buyBuilding,
  buyUpgrade,
  clickManual,
  createInitialState,
  renaissance,
  renaissance2,
  renaissance3,
  renaissance4,
  buyPolicy,
  giveDirective,
  newHumanity,
  placeCore,
  removeCore,
  buyAlgorithm,
  equipAlgorithm,
  unequipAlgorithm,
  startTraining,
  setScriptTarget,
  resolveEvent,
  tick,
  type BuyMode,
} from "./engine";
import { OFFLINE_REPORT_MIN_MS, guestAwayMs, offlineProgress, type OfflineReport } from "./offline";
import type { BuildingId, GameState } from "./types";

/**
 * Client-side store. The game logic lives in engine.ts; this file only owns the clock,
 * persistence and subscriptions. Time advances in fixed steps measured with performance.now();
 * a long gap (tab in the background, game closed) is replayed by offlineProgress, capped at 24 h.
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
  /** True while another device plays this account (or a save conflict waits): time stops, actions do nothing. */
  readOnly: boolean;
  /** Recap of the last absence, shown until the player closes it. */
  offline: OfflineReport | null;
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
    this.lastNow = performance.now();
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
    if (this.snapshot.readOnly || this.snapshot.state.endedAtMs !== null) return;
    this.snapshot = {
      ...this.snapshot,
      state: clickManual(this.snapshot.state),
      clicks: this.snapshot.clicks + 1,
    };
    this.listeners.forEach((listener) => listener());
  };

  buy = (id: BuildingId, mode: BuyMode): void => this.update((s) => buyBuilding(s, id, mode));

  upgrade = (id: string): void => this.update((s) => buyUpgrade(s, id));

  answerEvent = (choiceId: string): void => this.update((s) => resolveEvent(s, choiceId));

  renaissance = (): void => this.update((s) => renaissance(s));

  buyKnowledge = (id: string): void => this.update((s) => buyKnowledgeBonus(s, id));

  setScriptTarget = (id: BuildingId | null): void => this.update((s) => setScriptTarget(s, id));

  renaissance2 = (): void => this.update((s) => renaissance2(s));

  buyAlgorithm = (id: string): void => this.update((s) => buyAlgorithm(s, id));

  equipAlgorithm = (id: string): void => this.update((s) => equipAlgorithm(s, id));

  unequipAlgorithm = (id: string): void => this.update((s) => unequipAlgorithm(s, id));

  startTraining = (): void => this.update((s) => startTraining(s));

  renaissance3 = (): void => this.update((s) => renaissance3(s));

  placeCore = (cell: number, coreId: string): void => this.update((s) => placeCore(s, cell, coreId));

  removeCore = (cell: number): void => this.update((s) => removeCore(s, cell));

  renaissance4 = (): void => this.update((s) => renaissance4(s));

  buyPolicy = (id: string): void => this.update((s) => buyPolicy(s, id));

  giveDirective = (id: string): void => this.update((s) => giveDirective(s, id));

  /** « Nouvelle humanité » : only once the game has ended. The finished one stays in the backup slot. */
  newHumanity = (): void => {
    const s = this.snapshot.state;
    if (s.endedAtMs === null || this.snapshot.readOnly) return;
    const fresh = newGame();
    this.replaceState(newHumanity(s, fresh.rngSeed, fresh.runId));
  };

  /** The current state as a save envelope (export, cloud upload). */
  serialized = (): string => serialize(this.snapshot.state);

  /**
   * Replaces the game (cloud save, import). The previous local save is kept in the backup slot,
   * so nothing is lost silently.
   */
  replaceState = (state: GameState, notice: string | null = null): void => {
    try {
      this.storage?.setItem(BACKUP_KEY, serialize(this.snapshot.state));
    } catch {
      // Without storage the replacement still happens; the notice tells the player.
    }
    this.snapshot = { ...this.snapshot, state, notice: notice ?? this.snapshot.notice };
    this.save();
    this.emit();
  };

  setReadOnly = (readOnly: boolean): void => {
    if (this.snapshot.readOnly === readOnly) return;
    this.snapshot = { ...this.snapshot, readOnly };
    this.lastNow = performance.now(); // time spent read-only is not played
    this.emit();
  };

  /** Replays an absence measured elsewhere (server clock for a signed-in player). */
  catchUp = (awayMs: number): void => {
    if (this.snapshot.readOnly) return;
    const result = offlineProgress(this.snapshot.state, awayMs);
    if (!result) return;
    this.snapshot = {
      ...this.snapshot,
      state: result.state,
      offline: result.report.durationMs >= OFFLINE_REPORT_MIN_MS ? result.report : this.snapshot.offline,
    };
    this.emit();
  };

  dismissOffline = (): void => {
    this.snapshot = { ...this.snapshot, offline: null };
    this.emit();
  };

  setNotice = (notice: string | null): void => {
    this.snapshot = { ...this.snapshot, notice };
    this.emit();
  };

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
    const now = performance.now();
    const elapsed = Math.max(now - this.lastNow, 0);
    this.lastNow = now;
    if (elapsed <= 0) return;
    // A throttled background tab comes back: replay the gap instead of losing it.
    if (elapsed > MAX_STEP_MS) this.catchUp(elapsed);
    else this.update((s) => tick(s, elapsed));
  }

  private onVisibility = (): void => {
    if (document.visibilityState === "hidden") this.save();
  };

  private update(fn: (s: GameState) => GameState): void {
    if (this.snapshot.readOnly || this.snapshot.state.endedAtMs !== null) return; // a finished game is frozen
    const next = fn(this.snapshot.state);
    if (next === this.snapshot.state) return;
    this.snapshot = { ...this.snapshot, state: next };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private load(): StoreSnapshot {
    const fresh = { state: newGame(), notice: null, clicks: 0, readOnly: false, offline: null };
    if (!this.storage) return fresh;
    const raw = this.storage.getItem(SAVE_KEY);
    if (raw === null) return fresh;
    const result = deserialize(raw);
    if (result.ok) {
      // Guest clock (cahier §6): UTC, nothing if it went back, capped at 24 h by offlineProgress.
      const away = offlineProgress(result.state, guestAwayMs(result.savedAtMs ?? null, Date.now()));
      const offline = away && away.report.durationMs >= OFFLINE_REPORT_MIN_MS ? away.report : null;
      return { state: away?.state ?? result.state, notice: null, clicks: 0, readOnly: false, offline };
    }
    // Unreadable save: keep a copy, then start fresh. Never overwrite silently.
    try {
      this.storage.setItem(BACKUP_KEY, raw);
    } catch {
      // Nothing more can be done without storage; the notice still tells the player.
    }
    return {
      state: createInitialState(),
      clicks: 0,
      readOnly: false,
      offline: null,
      notice: `La sauvegarde n'a pas pu être lue (${result.reason}). Une copie a été conservée.`,
    };
  }
}

/** A new game gets a fresh random seed, so random events differ between players. */
export function newGame() {
  const runId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `run-${Date.now()}`;
  return createInitialState(Math.floor(Math.random() * 2 ** 31) + 1, runId);
}

/** Shared instance for the browser. Created lazily so that the server never touches storage. */
let shared: GameStore | null = null;

export function getStore(): GameStore {
  if (!shared) shared = new GameStore();
  return shared;
}
