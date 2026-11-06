"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import styles from "./GameScreen.module.css";

/**
 * A collapsible block: its title is a button that folds the content. Which blocks are folded is
 * kept in localStorage, so the page looks the same after a reload. Everything is open by default.
 */

const KEY = "tlh-folded";
const listeners = new Set<() => void>();
let folded: Record<string, true> | null = null;

function read(): Record<string, true> {
  if (folded) return folded;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    folded = parsed && typeof parsed === "object" ? (parsed as Record<string, true>) : {};
  } catch {
    folded = {};
  }
  return folded;
}

export function toggleFolded(id: string) {
  const next = { ...read() };
  if (next[id]) delete next[id];
  else next[id] = true;
  folded = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: Record<string, true> = {};

/** True once the player folded `id` (or switched the flag on, for non-section toggles). */
export function useFolded(id: string): boolean {
  return Boolean(useSyncExternalStore(subscribe, read, () => EMPTY)[id]);
}

export function Section({ id, title, meta, children }: { id: string; title: string; meta?: string; children: ReactNode }) {
  const open = !useFolded(id);
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>
        <button type="button" className={styles.fold} aria-expanded={open} aria-controls={`sec-${id}`} onClick={() => toggleFolded(id)}>
          <span>{title}</span>
          {meta && <span className={styles.foldMeta}>{meta}</span>}
          <span className={styles.foldIcon} aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
        </button>
      </h2>
      <div id={`sec-${id}`} className={styles.foldBody} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
