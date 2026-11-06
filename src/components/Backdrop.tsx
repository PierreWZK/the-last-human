import styles from "./Backdrop.module.css";

/**
 * Decoration behind the whole page: server racks with blinking lights on both edges, and small
 * robots flying across. Pure CSS (no JavaScript, no canvas), hidden from screen readers, never
 * clickable, and still when the player asks for reduced motion. Colours follow the era theme.
 */

/** Fixed layout: a cheap deterministic spread, the same on the server and in the browser. */
const RACKS = [0, 1];
const LEDS = Array.from({ length: 18 }, (_, i) => ({ delay: `${((i * 7) % 11) * 0.37}s`, speed: `${1.6 + ((i * 5) % 7) * 0.45}s` }));
const ROBOTS = [
  { top: "14%", duration: "38s", delay: "-4s", scale: 1 },
  { top: "32%", duration: "52s", delay: "-30s", scale: 0.7 },
  { top: "55%", duration: "44s", delay: "-12s", scale: 0.85 },
  { top: "72%", duration: "61s", delay: "-45s", scale: 0.6 },
  { top: "88%", duration: "47s", delay: "-22s", scale: 0.75 },
];

export function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      {RACKS.map((side) => (
        <div key={side} className={`${styles.rack} ${side === 0 ? styles.left : styles.right}`}>
          {LEDS.map((led, i) => (
            <span key={i} className={styles.unit}>
              <span className={styles.led} style={{ animationDelay: led.delay, animationDuration: led.speed }} />
              <span className={styles.led} style={{ animationDelay: `calc(${led.delay} + 0.6s)`, animationDuration: led.speed }} />
            </span>
          ))}
        </div>
      ))}
      {ROBOTS.map((r, i) => (
        <span
          key={i}
          className={`${styles.robot} ${i % 2 ? styles.reverse : ""}`}
          style={{ top: r.top, animationDuration: r.duration, animationDelay: r.delay, ["--s" as string]: r.scale }}
        >
          <span className={styles.body} />
        </span>
      ))}
    </div>
  );
}
