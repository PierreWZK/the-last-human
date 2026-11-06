"use client";

import { useEffect, useState } from "react";
import { ARCHIVES } from "@/content/milestones";
import { getCloud } from "@/game/cloud";
import { formatDuration, formatNumber } from "@/game/decimal";
import { getEvent } from "@/game/engine";
import { getStore } from "@/game/store";
import type { Era, GameState } from "@/game/types";
import { fr, t } from "@/i18n/fr";
import { AccountPanel } from "./AccountPanel";
import styles from "./GameScreen.module.css";
import { Leaderboard } from "./Leaderboard";

const LINE_MS = 3200;

/**
 * The end (cahier §9): a slow dialogue on an almost empty screen, then the final screen.
 * The game is a frozen archive from here: only « Nouvelle humanité » starts something again.
 */
export function EndingScreen({ state }: { state: GameState }) {
  const store = getStore();
  const lines = fr.ending.lines;
  const [shown, setShown] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const done = shown > lines.length;

  // Send the finished game right away, so that the server records the end (leaderboard).
  useEffect(() => {
    void getCloud(store).push();
  }, [store]);

  useEffect(() => {
    if (done) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setShown((n) => n + 1), reduced ? 0 : LINE_MS);
    return () => clearTimeout(timer);
  }, [shown, done]);

  return (
    <div className={styles.ending}>
      <div className={styles.dialogue} aria-live="polite">
        {lines.slice(0, shown).map((line) => (
          <p key={line} className={styles.dialogueLine}>
            {line}
          </p>
        ))}
        {!done && (
          <button type="button" className={styles.button} onClick={() => setShown(lines.length + 1)}>
            {fr.ending.skip}
          </button>
        )}
      </div>

      {done && (
        <section className={styles.finalScreen} aria-labelledby="final-title">
          <h1 id="final-title" className={styles.windowTitle}>
            {t(fr.ending.title, { n: state.endings + 1 })}
          </h1>
          <p className={styles.muted}>{fr.ending.frozen}</p>

          <h2 className={styles.windowTitle}>{fr.ending.journeyTitle}</h2>
          <ul className={styles.recap}>
            {state.eraStartedMs.map((ms, i) => (
              <li key={i}>
                {t(fr.ending.eraStart, { era: fr.eras[(i + 1) as Era].name, time: formatDuration(ms) })}
              </li>
            ))}
          </ul>

          <h2 className={styles.windowTitle}>{fr.ending.choicesTitle}</h2>
          {state.journal.length === 0 ? (
            <p className={styles.muted}>{fr.ending.noChoices}</p>
          ) : (
            <ul className={styles.recap}>
              {state.journal.map((entry) => {
                const [eventId, choiceId] = entry.split(":");
                const def = getEvent(eventId);
                const choice = def?.choices.find((c) => c.id === choiceId);
                return def && choice ? <li key={entry}>{`${def.title} : ${choice.label}`}</li> : null;
              })}
            </ul>
          )}

          <h2 className={styles.windowTitle}>{fr.ending.statsTitle}</h2>
          <ul className={styles.recap}>
            <li>{t(fr.ending.machines, { count: formatNumber(state.resources.robots) })}</li>
            <li>{t(fr.ending.clicks, { count: state.totalClicks.toLocaleString("fr-FR") })}</li>
            <li>{t(fr.ending.renaissances, { count: state.renaissances })}</li>
            <li>{t(fr.ending.models, { count: Object.keys(state.archives).length, total: ARCHIVES.length })}</li>
            <li>{t(fr.ending.time, { time: formatDuration(state.endedAtMs ?? state.elapsedMs) })}</li>
          </ul>

          <h2 className={styles.windowTitle}>{fr.archives.title}</h2>
          <ul className={styles.list}>
            {ARCHIVES.filter((a) => state.archives[a.id]).map((a) => (
              <li key={a.id} className={styles.item}>
                <span className={styles.itemName}>{a.title}</span>
                <p className={styles.itemText}>{a.text}</p>
              </li>
            ))}
          </ul>

          <Leaderboard />
          <AccountPanel />

          {!confirming ? (
            <button type="button" className={styles.manual} onClick={() => setConfirming(true)}>
              {fr.ending.newHumanity}
            </button>
          ) : (
            <div className={styles.event}>
              <p className={styles.itemText}>{fr.ending.newHumanityConfirm}</p>
              <div className={styles.buyRow}>
                <button type="button" className={styles.button} onClick={store.newHumanity}>
                  {fr.ending.confirm}
                </button>
                <button type="button" className={styles.button} onClick={() => setConfirming(false)}>
                  {fr.ending.cancel}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
