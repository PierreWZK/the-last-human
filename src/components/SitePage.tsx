"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createInitialState } from "@/game/engine";
import { getStore, type StoreSnapshot } from "@/game/store";
import { fr } from "@/i18n/fr";
import styles from "./GameScreen.module.css";

export type SitePath = "/" | "/succes" | "/compte";

const LINKS: Array<{ href: SitePath; label: string }> = [
  { href: "/", label: fr.site.game },
  { href: "/succes", label: fr.site.achievements },
  { href: "/compte", label: fr.site.account },
];

/** Links between the game and its pages, in every header. */
export function SiteNav({ current }: { current: SitePath }) {
  return (
    <nav className={styles.siteNav} aria-label={fr.site.nav}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={styles.siteLink} aria-current={l.href === current ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const SERVER_SNAPSHOT: StoreSnapshot = { state: createInitialState(), notice: null, clicks: 0, readOnly: false, offline: null };

/** The local game, read only: pages outside the game show it without running the clock. */
export function useGameState() {
  const store = getStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT).state;
}

/** Frame of the pages next to the game (achievements, account): same header, same era theme. */
export function SitePage({ current, title, children }: { current: SitePath; title: string; children: ReactNode }) {
  const era = useGameState().era;
  useEffect(() => {
    document.documentElement.dataset.era = String(era);
  }, [era]);
  return (
    <main className={`${styles.screen} ${styles.page}`} data-era={era}>
      <header className={styles.header}>
        <p className={styles.title}>
          <Link href="/" className={styles.titleLink}>
            {fr.title}
          </Link>
        </p>
        <SiteNav current={current} />
      </header>
      <section className={styles.window} aria-labelledby="page-title">
        <h1 id="page-title" className={styles.windowTitle}>
          {title}
        </h1>
        {children}
      </section>
      <footer className={styles.footer}>
        <p>{fr.footer}</p>
      </footer>
    </main>
  );
}
