"use client";

import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ARCHIVES, ARCHIVE_CATEGORIES } from "@/content/milestones";
import { memo } from "react";
import type { GameState } from "@/game/types";
import { fr, t } from "@/i18n/fr";
import styles from "./GameScreen.module.css";
import { Section } from "./Section";
import { SitePage, useGameState } from "./SitePage";

/**
 * Both pages list more than a hundred entries and the game re-renders ten times a second: they only
 * take the unlocked records, whose identity changes only when something is unlocked (memo).
 */
const percent = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString("fr-FR")} %`;

/** Achievements page: by category, each one with what to do to get it and what it gives. */
export const AchievementsPanel = memo(function AchievementsPanel({ achievements }: { achievements: GameState["achievements"] }) {
  const state = { achievements };
  const unlocked = ACHIEVEMENTS.filter((a) => achievements[a.id]).length;
  const bonus = ACHIEVEMENTS.reduce((sum, a) => (achievements[a.id] ? sum + a.bonus : sum), 0);
  return (
    <>
      <p className={styles.muted}>{t(fr.achievements.count, { count: unlocked, total: ACHIEVEMENTS.length })}</p>
      <p className={styles.muted}>{t(fr.achievements.bonus, { bonus: percent(bonus) })}</p>
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
});

/** Human Archives page: found fragments are read in full, the others say how to find them. */
export const ArchivesPanel = memo(function ArchivesPanel({ archives }: { archives: GameState["archives"] }) {
  const state = { archives };
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
});

/** The /succes page: the achievements of the local game, outside the game screen. */
export function AchievementsPage() {
  const achievements = useGameState().achievements;
  return (
    <SitePage current="/succes" title={fr.achievements.title}>
      <AchievementsPanel achievements={achievements} />
    </SitePage>
  );
}
