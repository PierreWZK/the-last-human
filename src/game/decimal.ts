import Decimal from "break_infinity.js";

export type Num = Decimal;

export const D = (value: number | string | Decimal): Decimal => new Decimal(value);

export const ZERO = D(0);

/** Formats a large number in French: 1 234, 1,23 M, 4,5 Md… */
export function formatNumber(value: Decimal): string {
  const n = value.toNumber();
  if (!Number.isFinite(n)) return value.toExponential(2).replace(".", ",");
  if (n < 1000) return n < 10 ? n.toFixed(1).replace(".", ",") : Math.floor(n).toLocaleString("fr-FR");
  const units = [
    [1e33, "Dc"], [1e30, "No"], [1e27, "Oc"], [1e24, "Sp"], [1e21, "Sx"], [1e18, "Qt"],
    [1e15, "Q"], [1e12, "T"], [1e9, "Md"], [1e6, "M"], [1e3, "k"],
  ] as const;
  for (const [limit, suffix] of units) {
    if (n >= limit) return `${(n / limit).toFixed(2).replace(".", ",")} ${suffix}`;
  }
  return Math.floor(n).toLocaleString("fr-FR");
}
