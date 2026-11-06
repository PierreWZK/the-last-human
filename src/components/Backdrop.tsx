import styles from "./Backdrop.module.css";

/**
 * Background of the whole site (in the root layout, behind every page): server racks with blinking
 * lights on both edges, small robots flying across, data packets rising, and a slow scan line.
 * Pure CSS (no JavaScript, no canvas), hidden from screen readers, never clickable, and still when
 * the player asks for reduced motion. Colours follow the era theme (--phosphor on <html>).
 */

/** Fixed layout: a cheap deterministic spread, the same on the server and in the browser. */
const RACKS = [0, 1];
const LEDS = Array.from({ length: 18 }, (_, i) => ({ delay: `${((i * 7) % 11) * 0.37}s`, speed: `${1.6 + ((i * 5) % 7) * 0.45}s` }));
const ROBOTS = [
  { top: "12%", duration: "34s", delay: "-4s", scale: 1.2 },
  { top: "30%", duration: "48s", delay: "-30s", scale: 0.8 },
  { top: "48%", duration: "40s", delay: "-12s", scale: 1 },
  { top: "66%", duration: "56s", delay: "-45s", scale: 0.7 },
  { top: "84%", duration: "44s", delay: "-22s", scale: 0.9 },
  { top: "22%", duration: "62s", delay: "-8s", scale: 0.6 },
];
const PACKETS = Array.from({ length: 16 }, (_, i) => ({
  left: `${4 + ((i * 37) % 92)}%`,
  duration: `${9 + ((i * 7) % 9)}s`,
  delay: `-${(i * 13) % 17}s`,
}));

export function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.scan} />
      {PACKETS.map((p, i) => (
        <span key={`p${i}`} className={styles.packet} style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }} />
      ))}
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
          key={`r${i}`}
          className={`${styles.robot} ${i % 2 ? styles.reverse : ""}`}
          style={{ top: r.top, animationDuration: r.duration, animationDelay: r.delay, ["--s" as string]: r.scale }}
        >
          <span className={styles.body} />
        </span>
      ))}
    </div>
  );
}
