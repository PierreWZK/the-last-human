"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/game/decimal";
import { fr, t } from "@/i18n/fr";
import { authClient } from "@/lib/auth-client";
import styles from "./GameScreen.module.css";

interface Row {
  name: string;
  value: number;
}

interface Profile {
  hidden: boolean;
  bestSec: number | null;
  endings: number;
  firstEndedAt: string | null;
}

/** Public leaderboard (cahier §9) and, for a signed-in player, their profile and the « hide me » switch. */
export function Leaderboard() {
  const { data: session } = authClient.useSession();
  const [board, setBoard] = useState<{ fastest: Row[]; most: Row[] } | null | "error">(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const signedIn = Boolean(session);

  useEffect(() => {
    let alive = true;
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => alive && setBoard(data))
      .catch(() => alive && setBoard("error"));
    return () => {
      alive = false;
    };
  }, [profile?.hidden]);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && setProfile(data))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const toggleHidden = async (hidden: boolean) => {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    if (response.ok) setProfile(await response.json());
  };

  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.leaderboard.title}</h2>
      {board === null && <p className={styles.muted}>{fr.leaderboard.loading}</p>}
      {board === "error" && <p className={styles.muted}>{fr.leaderboard.error}</p>}
      {board && board !== "error" && (
        <>
          <BoardList title={fr.leaderboard.fastest} rows={board.fastest} format={(v) => formatDuration(v * 1000)} />
          <BoardList title={fr.leaderboard.most} rows={board.most} format={(v) => t(fr.leaderboard.endings, { count: v })} />
        </>
      )}
      {!signedIn && <p className={styles.muted}>{fr.leaderboard.guest}</p>}
      {signedIn && profile && (
        <div className={styles.item}>
          <h3 className={styles.itemName}>{fr.leaderboard.profileTitle}</h3>
          {profile.endings === 0 ? (
            <p className={styles.muted}>{fr.leaderboard.none}</p>
          ) : (
            <>
              <p className={styles.muted}>{t(fr.leaderboard.count, { count: profile.endings })}</p>
              {profile.bestSec !== null && (
                <p className={styles.muted}>{t(fr.leaderboard.best, { time: formatDuration(profile.bestSec * 1000) })}</p>
              )}
              {profile.firstEndedAt && (
                <p className={styles.muted}>
                  {t(fr.leaderboard.first, { date: new Date(profile.firstEndedAt).toLocaleDateString("fr-FR") })}
                </p>
              )}
            </>
          )}
          <label className={styles.check}>
            <input type="checkbox" checked={profile.hidden} onChange={(e) => void toggleHidden(e.target.checked)} />
            {fr.leaderboard.hide}
          </label>
        </div>
      )}
    </div>
  );
}

function BoardList({ title, rows, format }: { title: string; rows: Row[]; format: (value: number) => string }) {
  return (
    <div className={styles.item}>
      <h3 className={styles.itemName}>{title}</h3>
      {rows.length === 0 ? (
        <p className={styles.muted}>{fr.leaderboard.empty}</p>
      ) : (
        <ol className={styles.recap}>
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`}>{t(fr.leaderboard.row, { rank: i + 1, name: r.name, value: format(r.value) })}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
