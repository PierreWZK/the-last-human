import { deserialize } from "./save";
import { newGame, type GameStore } from "./store";

/**
 * Synchronisation avec le serveur (cahier §8), pour un joueur connecté.
 * - Au branchement : le serveur ou la partie locale gagne selon la dernière révision connue
 *   de cet appareil ; l'autre version reste dans l'emplacement de secours, jamais perdue.
 * - Envoi toutes les 60 s et à la fermeture de l'onglet.
 * - 409 (révision dépassée) ou 423 (autre appareil actif) : le jeu passe en lecture seule
 *   et propose « Reprendre ici ».
 */

export const DEVICE_KEY = "the-last-human:device";
/** Last revision this device synced, and for which account: `{ userId, revision }`. */
export const SYNCED_KEY = "the-last-human:cloud-sync";
const PUSH_MS = 60_000;

export type CloudStatus =
  | { kind: "guest" }
  | { kind: "connecting" }
  | { kind: "synced"; revision: number }
  | { kind: "elsewhere" }
  | { kind: "conflict" }
  /** The server refused the save: more game time than real time went by (cahier §6). */
  | { kind: "rejected" }
  | { kind: "offline" };

interface ServerSave {
  revision: number;
  data: string | null;
  activeDevice: string | null;
  /** Absence measured on the server clock since the last accepted save, capped at 24 h. */
  offlineMs?: number;
}

type Fetch = typeof fetch;

export class CloudSync {
  private status: CloudStatus = { kind: "guest" };
  private listeners = new Set<() => void>();
  private userId: string | null = null;
  private revision = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private store: GameStore,
    private storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null,
    private fetchFn: Fetch = (...args) => fetch(...args),
  ) {}

  getStatus = (): CloudStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Called once a session exists (page load or sign-in). */
  async connect(userId: string): Promise<void> {
    this.userId = userId;
    this.setStatus({ kind: "connecting" });
    const server = await this.get();
    if (!server) return;
    const synced = this.readSynced();

    if (server.activeDevice && server.activeDevice !== this.deviceId()) {
      // Another device plays: show the server game, read-only, until « Reprendre ici ».
      if (server.data) this.takeServer(server, null);
      this.store.setReadOnly(true);
      this.setStatus({ kind: "elsewhere" });
      return;
    }

    if (server.revision === 0) {
      // First save of this account: the guest game carries over, unless it belongs to another account.
      if (synced && synced.userId !== userId) this.store.replaceState(newGame(), null);
      this.revision = 0;
    } else if (synced?.userId === userId && synced.revision === server.revision) {
      this.revision = server.revision; // this device's game descends from the server one: keep it
    } else {
      this.takeServer(server, "La partie de votre compte a été chargée. La partie locale est gardée en secours.");
      await this.claim();
      this.store.setReadOnly(false);
      this.store.catchUp(server.offlineMs ?? 0);
    }
    this.store.setReadOnly(false);
    this.setStatus({ kind: "synced", revision: this.revision });
    await this.push();
    this.startTimers();
  }

  /** Sign-out: back to a local guest game. */
  disconnect(): void {
    this.stopTimers();
    this.userId = null;
    this.store.setReadOnly(false);
    this.setStatus({ kind: "guest" });
  }

  /** « Reprendre ici » : this device takes the game back and loads the latest server save. */
  async resumeHere(): Promise<void> {
    if (!this.userId) return;
    const server = await this.claim();
    if (!server) return;
    if (server.data) this.takeServer(server, null);
    else this.revision = server.revision;
    this.store.setReadOnly(false);
    if (server.data) this.store.catchUp(server.offlineMs ?? 0);
    this.setStatus({ kind: "synced", revision: this.revision });
    this.startTimers();
  }

  /** Sends the current game. `keepalive` lets the request finish while the tab closes. */
  push = async (keepalive = false): Promise<void> => {
    if (this.status.kind !== "synced" || !this.userId) return;
    let response: Response;
    try {
      response = await this.fetchFn("/api/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: this.deviceId(), baseRevision: this.revision, data: this.store.serialized() }),
        keepalive,
      });
    } catch {
      return; // offline: the next push retries with the same base revision
    }
    if (response.status === 200) {
      const { revision } = (await response.json()) as { revision: number };
      this.revision = revision;
      this.writeSynced();
      this.setStatus({ kind: "synced", revision });
    } else if (response.status === 423) {
      this.lock({ kind: "elsewhere" });
    } else if (response.status === 409) {
      this.lock({ kind: "conflict" });
    } else if (response.status === 422) {
      this.lock({ kind: "rejected" });
    } else if (response.status === 401) {
      this.disconnect();
    }
  };

  deviceId(): string {
    let id = this.storage?.getItem(DEVICE_KEY) ?? null;
    if (!id) {
      id = crypto.randomUUID();
      try {
        this.storage?.setItem(DEVICE_KEY, id);
      } catch {
        // Private mode: the id lives for this page only.
      }
    }
    return id;
  }

  // Internals -----------------------------------------------------------

  private async get(): Promise<ServerSave | null> {
    try {
      const response = await this.fetchFn("/api/save", { cache: "no-store" });
      if (response.status === 401) {
        this.disconnect();
        return null;
      }
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as ServerSave;
    } catch {
      this.setStatus({ kind: "offline" });
      return null;
    }
  }

  private async claim(): Promise<ServerSave | null> {
    try {
      const response = await this.fetchFn("/api/save/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: this.deviceId() }),
      });
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as ServerSave;
    } catch {
      this.setStatus({ kind: "offline" });
      return null;
    }
  }

  private takeServer(server: ServerSave, notice: string | null): void {
    const loaded = server.data ? deserialize(server.data) : null;
    if (!loaded?.ok) {
      this.store.setNotice("La sauvegarde du serveur n'a pas pu être lue. La partie locale est conservée.");
      return;
    }
    this.store.replaceState(loaded.state, notice);
    this.revision = server.revision;
    this.writeSynced();
  }

  private lock(status: CloudStatus): void {
    this.stopTimers();
    this.store.setReadOnly(true);
    this.setStatus(status);
  }

  private startTimers(): void {
    this.stopTimers();
    this.timer = setInterval(() => void this.push(), PUSH_MS);
    if (typeof window !== "undefined") window.addEventListener("pagehide", this.onPageHide);
  }

  private stopTimers(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof window !== "undefined") window.removeEventListener("pagehide", this.onPageHide);
  }

  private onPageHide = (): void => void this.push(true);

  private readSynced(): { userId: string; revision: number } | null {
    try {
      const value = JSON.parse(this.storage?.getItem(SYNCED_KEY) ?? "null") as unknown;
      if (typeof value === "object" && value !== null && "userId" in value && "revision" in value) {
        const { userId, revision } = value as { userId: unknown; revision: unknown };
        if (typeof userId === "string" && Number.isSafeInteger(revision)) return { userId, revision: revision as number };
      }
    } catch {
      // Unreadable marker: treated as « never synced », so the server version wins.
    }
    return null;
  }

  private writeSynced(): void {
    try {
      this.storage?.setItem(SYNCED_KEY, JSON.stringify({ userId: this.userId, revision: this.revision }));
    } catch {
      // Without storage the next load simply prefers the server version.
    }
  }

  private setStatus(status: CloudStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
}

let shared: CloudSync | null = null;

export function getCloud(store: GameStore): CloudSync {
  if (!shared) shared = new CloudSync(store);
  return shared;
}
