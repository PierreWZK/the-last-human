"use client";

import { useEffect, useRef } from "react";
import { formatNumber } from "@/game/decimal";
import { manualGain } from "@/game/engine";
import { getStore } from "@/game/store";
import { fr } from "@/i18n/fr";
import { SCENE_H, SCENE_W, advanceFx, createFx, drawScene, onManualClick } from "@/scene/draw";
import { sceneModel } from "@/scene/model";
import styles from "./Scene.module.css";

const FRAME_MS = 1000 / 30;

/**
 * The living room of era I. It reads the store directly every frame, so React never
 * re-renders for the animation. With reduced motion it draws one still frame per state change.
 */
export function Scene({ className = "", era = 1 }: { className?: string; era?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const store = getStore();
    const fx = createFx();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastClicks = store.getSnapshot().clicks;

    const render = (now: number, dtMs: number) => {
      const snap = store.getSnapshot();
      const model = sceneModel(snap.state);
      const still = reduced.matches;
      if (snap.clicks !== lastClicks) {
        lastClicks = snap.clicks;
        if (!still) onManualClick(fx, now, `+${formatNumber(manualGain(snap.state))}`);
      }
      if (!still) advanceFx(fx, model, now, dtMs);
      drawScene(ctx, model, fx, still ? 0 : now);
    };

    if (reduced.matches) {
      render(performance.now(), 0);
      return store.subscribe(() => render(performance.now(), 0));
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      if (dt < FRAME_MS) return;
      last = now;
      render(now, Math.min(dt, 250));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`${styles.frame} ${className}`}>
      <canvas
        ref={canvasRef}
        width={SCENE_W}
        height={SCENE_H}
        className={styles.canvas}
        role="img"
        aria-label={fr.scene.labels[era as keyof typeof fr.scene.labels] ?? fr.scene.label}
        onClick={(e) => getStore().click(e.nativeEvent.isTrusted)}
      />
    </div>
  );
}
