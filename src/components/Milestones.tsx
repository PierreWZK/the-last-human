"use client";

import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ARCHIVES, ARCHIVE_CATEGORIES } from "@/content/milestones";
import { achievementBonus } from "@/game/engine";
import type { GameState } from "@/game/types";
import { fr, t } from "@/i18n/fr";
import styles from "./GameScreen.module.css";
import { Section } from "./Section";

const percent = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString("fr-FR")} %`;

/** Achievements page: by category, each one with what to do to get it and what it gives. */
export function AchievementsPanel({ state }: { state: GameState }) {
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  return (
    <>
      <p className={styles.muted}>{t(fr.achievements.count, { count: unlocked, total: ACHIEVEMENTS.length })}</p>
      <p className={styles.muted}>{t(fr.achievements.bonus, { bonus: percent(achievementBonus(state) - 1) })}</p>
      {ACHIEVEMENT_CATEGORIES.map((cat) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === cat);
        const done = list.filter((a) => state.achievements[a.id]).length;
        return (
          <Section key={cat} id={`ach-${cat}`} title={fr.achievements.categories[cat]} meta={`${done} / ${list.length}`}>
            <ul className={styles.list}>
              {list.map((a) => {
                const open = Boolean(state.achievements[a.id]);
                return (
                  <li key={a.id} className={`${styles.item} ${open ? "" : styles.lockedItem}`}>
                    <div className={styles.itemHead}>
                      <span className={styles.itemName}>{a.title}</span>
                      <span className={styles.muted}>{open ? fr.achievements.done : fr.achievements.todo}</span>
                    </div>
                    <p className={styles.itemText}>{a.hint}</p>
                    <p className={styles.muted}>{t(fr.achievements.gives, { bonus: percent(a.bonus) })}</p>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
    </>
  );
}

/** Human Archives page: found fragments are read in full, the others say how to find them. */
export function ArchivesPanel({ state }: { state: GameState }) {
  const found = ARCHIVES.filter((a) => state.archives[a.id]).length;
  return (
    <>
      <p className={styles.muted}>{t(fr.archives.count, { count: found, total: ARCHIVES.length })}</p>
      {ARCHIVE_CATEGORIES.map((cat) => {
        const list = ARCHIVES.filter((a) => a.category === cat);
        const done = list.filter((a) => state.archives[a.id]).length;
        return (
          <Section key={cat} id={`arc-${cat}`} title={fr.archives.categories[cat]} meta={`${done} / ${list.length}`}>
            <ul className={styles.list}>
              {list.map((a) => {
                const open = Boolean(state.archives[a.id]);
                return (
                  <li key={a.id} className={`${styles.item} ${open ? "" : styles.lockedItem}`}>
                    <span className={styles.itemName}>{open ? a.title : fr.archives.locked}</span>
                    <p className={styles.itemText}>{open ? a.text : a.hint}</p>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
    </>
  );
}
