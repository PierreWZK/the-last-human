"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BUILDINGS, UPGRADES, Y2K_PATCH_COST } from "@/content/era1";
import {
  canBuyUpgrade,
  createInitialState,
  getBuilding,
  manualGain,
  multiplier,
  productionPerSecond,
  quote,
  requirementMet,
  type BuyMode,
} from "@/game/engine";
import { formatNumber } from "@/game/decimal";
import { getStore, type StoreSnapshot } from "@/game/store";
import type { BuildingDef, BuildingId, GameState, UpgradeDef } from "@/game/types";
import { fr, t } from "@/i18n/fr";
import styles from "./GameScreen.module.css";

type Tab = "produce" | "buy" | "upgrade";

const SERVER_SNAPSHOT: StoreSnapshot = { state: createInitialState(), notice: null };

export function GameScreen() {
  const store = getStore();
  const { state, notice } = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);
  const [tab, setTab] = useState<Tab>("produce");

  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);

  const rates = productionPerSecond(state);

  return (
    <main className={styles.screen} data-era="1">
      <header className={styles.header}>
        <h1 className={styles.title}>{fr.title}</h1>
        <p className={styles.era}>
          {fr.era} <span className={styles.years}>{fr.years}</span>
        </p>
      </header>

      {notice && (
        <p className={styles.notice} role="status">
          {fr.notice} : {notice}
        </p>
      )}

      <nav className={styles.tabs} aria-label="Sections">
        {(["produce", "buy", "upgrade"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={styles.tab}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {fr.tabs[key]}
          </button>
        ))}
      </nav>

      <div className={styles.grid}>
        <section className={`${styles.window} ${tab === "produce" ? styles.active : ""}`} aria-labelledby="w-res">
          <h2 id="w-res" className={styles.windowTitle}>{fr.windows.resources}</h2>
          <dl className={styles.resources}>
            <div>
              <dt>{fr.resources.money}</dt>
              <dd className={styles.big}>{formatNumber(state.resources.money)}</dd>
              <dd className={styles.rate}>+{formatNumber(rates.money)} {fr.resources.perSecond}</dd>
            </div>
            <div>
              <dt>{fr.resources.data}</dt>
              <dd className={styles.big}>{formatNumber(state.resources.data)}</dd>
              <dd className={styles.rate}>+{formatNumber(rates.data)} {fr.resources.perSecond}</dd>
            </div>
          </dl>
          <p className={styles.muted}>
            {fr.resources.totalMoney} : {formatNumber(state.totalMoney)}
          </p>

          <h2 className={styles.windowTitle}>{fr.windows.manual}</h2>
          <button type="button" className={styles.manual} onClick={store.click}>
            {fr.manual.button}
          </button>
          <p className={styles.muted}>{t(fr.manual.gain, { amount: formatNumber(manualGain(state)) })}</p>
          <p className={styles.muted}>{fr.manual.hint}</p>

          {state.event.status !== "pending" && <EventWindow state={state} onAnswer={store.answerY2K} />}
        </section>

        <section className={`${styles.window} ${tab === "buy" ? styles.active : ""}`} aria-labelledby="w-buy">
          <h2 id="w-buy" className={styles.windowTitle}>{fr.windows.buildings}</h2>
          <ul className={styles.list}>
            {BUILDINGS.map((def) => (
              <BuildingRow key={def.id} def={def} state={state} onBuy={store.buy} />
            ))}
          </ul>
        </section>

        <section className={`${styles.window} ${tab === "upgrade" ? styles.active : ""}`} aria-labelledby="w-up">
          <h2 id="w-up" className={styles.windowTitle}>{fr.windows.upgrades}</h2>
          <UpgradeList state={state} onBuy={store.upgrade} />
        </section>
      </div>

      <footer className={styles.footer}>
        <p>{fr.footer}</p>
      </footer>
    </main>
  );
}

function BuildingRow({
  def,
  state,
  onBuy,
}: {
  def: BuildingDef;
  state: GameState;
  onBuy: (id: BuildingId, mode: BuyMode) => void;
}) {
  const owned = state.buildings[def.id];
  const money = state.resources[def.costResource];
  const modes: Array<{ label: string; mode: BuyMode }> = [
    { label: fr.buildings.buy1, mode: 1 },
    { label: fr.buildings.buy10, mode: 10 },
    { label: fr.buildings.buyMax, mode: "max" },
  ];
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <span className={styles.itemName}>{def.name}</span>
        <span className={styles.muted}>
          {owned} {fr.buildings.owned}
        </span>
      </div>
      <p className={styles.itemText}>{def.description}</p>
      <p className={styles.muted}>
        {t(fr.buildings.perUnit, { amount: formatNumber(def.produces.perSecond.mul(multiplier(state, def.id))) })}
      </p>
      <div className={styles.buyRow}>
        {modes.map(({ label, mode }) => {
          const q = quote(state, def.id, mode);
          const disabled = q.count <= 0 || money.lt(q.cost);
          return (
            <button
              key={label}
              type="button"
              className={styles.button}
              disabled={disabled}
              aria-label={`${def.name}, ${label}, coût ${formatNumber(q.cost)}`}
              onClick={() => onBuy(def.id, mode)}
            >
              {label}
              {mode === "max" && q.count > 0 ? ` (${q.count})` : ""}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function UpgradeList({ state, onBuy }: { state: GameState; onBuy: (id: string) => void }) {
  const remaining = UPGRADES.filter((u) => !state.upgrades[u.id]);
  if (remaining.length === 0) return <p className={styles.muted}>{fr.upgrades.empty}</p>;
  return (
    <ul className={styles.list}>
      {remaining.map((def) => (
        <UpgradeRow key={def.id} def={def} state={state} onBuy={onBuy} />
      ))}
    </ul>
  );
}

function UpgradeRow({ def, state, onBuy }: { def: UpgradeDef; state: GameState; onBuy: (id: string) => void }) {
  const unlocked = requirementMet(state, def.requires);
  const affordable = canBuyUpgrade(state, def.id);
  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <span className={styles.itemName}>{def.name}</span>
        <span className={styles.muted}>{targetLabel(def)}</span>
      </div>
      <p className={styles.itemText}>{def.description}</p>
      {!unlocked && <p className={styles.muted}>{t(fr.upgrades.requires, { requirement: requirementText(def) })}</p>}
      <div className={styles.buyRow}>
        <button type="button" className={styles.button} disabled={!affordable} onClick={() => onBuy(def.id)}>
          {fr.upgrades.buy} · {formatNumber(def.cost)}
          {def.costResource === "data" ? " données" : ""}
        </button>
      </div>
    </li>
  );
}

function targetLabel(def: UpgradeDef): string {
  if (def.target.kind === "manual") return fr.upgrades.manual;
  if (def.target.kind === "all") return fr.upgrades.all;
  return getBuilding(def.target.building).name;
}

function requirementText(def: UpgradeDef): string {
  const req = def.requires;
  if (req.kind === "owned") return t(fr.upgrades.requirementOwned, { count: req.count, building: getBuilding(req.building).name });
  if (req.kind === "totalMoney") return t(fr.upgrades.requirementTotal, { amount: formatNumber(req.amount) });
  return "";
}

function EventWindow({ state, onAnswer }: { state: GameState; onAnswer: (c: "patch" | "ignore") => void }) {
  const money = state.resources.money;
  const open = state.event.status === "open";
  const slowed = state.effects.length > 0;
  return (
    <div className={styles.event} role={open ? "alertdialog" : undefined} aria-labelledby="ev-title">
      <h2 id="ev-title" className={styles.windowTitle}>{fr.event.y2kTitle}</h2>
      {open ? (
        <>
          <p className={styles.itemText}>{fr.event.y2kText}</p>
          <div className={styles.buyRow}>
            <button type="button" className={styles.button} disabled={money.lt(Y2K_PATCH_COST)} onClick={() => onAnswer("patch")}>
              {t(fr.event.patch, { amount: formatNumber(Y2K_PATCH_COST) })}
            </button>
            <button type="button" className={styles.button} onClick={() => onAnswer("ignore")}>
              {fr.event.ignore}
            </button>
          </div>
        </>
      ) : (
        <p className={styles.muted}>
          {state.event.status === "resolved" && state.event.choice === "patch" ? fr.event.patched : fr.event.ignored}
        </p>
      )}
      {slowed && <p className={styles.muted}>{fr.event.slowdown}</p>}
    </div>
  );
}
