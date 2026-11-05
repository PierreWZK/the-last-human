"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { ACHIEVEMENTS, ARCHIVES } from "@/content/events1";
import { KNOWLEDGE_BONUSES } from "@/content/knowledge";
import { ALGORITHMS } from "@/content/algorithms";
import { TRAINING } from "@/content/era3";
import { AUTO_TRAINING_AUTONOMY } from "@/content/era4";
import { CORES } from "@/content/neural";
import { DIRECTIVES, ERA5_START_MACHINES, POLICIES, ROBOTS_FOR_RENAISSANCE4 } from "@/content/era5";
import {
  canBuyUpgrade,
  algorithmPointGain,
  algorithmSlots,
  canRenaissance,
  canRenaissance2,
  canRenaissance3,
  canRenaissance4,
  aiCoreGain,
  automation,
  directiveCost,
  nextDirective,
  coreFactor,
  neuralCoreGain,
  replicationRate,
  knowledgeGain,
  getEvent,
  humanDependency,
  createInitialState,
  getBuilding,
  manualGain,
  milestoneMultiplier,
  multiplier,
  nextMilestone,
  productionPerSecond,
  quote,
  requirementMet,
  synergyBonus,
  visibleBuildings,
  visibleUpgrades,
  type BuyMode,
} from "@/game/engine";
import { D, formatDuration, formatNumber } from "@/game/decimal";
import { RESOURCE_IDS } from "@/game/engine";
import type { OfflineReport } from "@/game/offline";
import { getStore, type StoreSnapshot } from "@/game/store";
import type { BuildingDef, BuildingId, EventEffect, GameState, UpgradeDef } from "@/game/types";
import { fr, t } from "@/i18n/fr";
import { ZERO } from "@/game/decimal";
import styles from "./GameScreen.module.css";
import { Scene } from "./Scene";
import { AccountPanel, CloudBanner } from "./AccountPanel";
import { EndingScreen } from "./EndingScreen";
import { Leaderboard } from "./Leaderboard";

type Tab = "produce" | "buy" | "upgrade" | "archives" | "account";

const TABS: Tab[] = ["produce", "buy", "upgrade", "archives", "account"];
/** A horizontal swipe longer than this (and mostly horizontal) changes tab on touch screens. */
const SWIPE_PX = 60;

/** Swipe left or right between tabs (mobile). Mouse and pen are ignored: they click. */
function useSwipe(tab: Tab, setTab: (t: Tab) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY } : null;
    },
    onPointerUp: (e: PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < 2 * Math.abs(dy)) return;
      const i = TABS.indexOf(tab) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < TABS.length) setTab(TABS[i]);
    },
  };
}

const SERVER_SNAPSHOT: StoreSnapshot = { state: createInitialState(), notice: null, clicks: 0, readOnly: false, offline: null };

export function GameScreen() {
  const store = getStore();
  const { state, notice, offline } = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);
  const [tab, setTab] = useState<Tab>("produce");

  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);

  // Era theme on <html> (cahier §14): the whole page, background included, changes era.
  useEffect(() => {
    document.documentElement.dataset.era = String(state.era);
  }, [state.era]);

  const rates = productionPerSecond(state);
  const swipe = useSwipe(tab, setTab);
  const pinned =
    state.era === 5
      ? (["robots", "control"] as const)
      : (["money", "data", "compute", "intelligence", "robots"] as const).filter(
          (r) => r === "money" || r === "data" || (r === "compute" && state.era >= 2) || (r === "intelligence" && state.era >= 3) || (r === "robots" && state.era >= 4),
        );

  if (state.endedAtMs !== null) {
    return (
      <main className={styles.screen} data-era={state.era}>
        <CloudBanner />
        <EndingScreen state={state} />
      </main>
    );
  }

  return (
    <main className={styles.screen} data-era={state.era}>
      <header className={styles.header}>
        <h1 className={styles.title}>{fr.title}</h1>
        <p className={styles.era}>
          {fr.eras[state.era].name} <span className={styles.years}>{fr.eras[state.era].years}</span>
        </p>
      </header>

      {notice && (
        <p className={styles.notice} role="status">
          {fr.notice} : {notice}
        </p>
      )}

      <CloudBanner />

      <EraTransition era={state.era} />

      {offline && <OfflineRecap report={offline} onClose={store.dismissOffline} />}

      <p className={styles.pinned} aria-hidden="true">
        {pinned.map((r) => (
          <span key={r}>{`${fr.resources[r]} ${formatNumber(state.resources[r])}`}</span>
        ))}
      </p>

      <nav className={styles.tabs} aria-label="Sections">
        {TABS.map((key) => (
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

      <Scene className={tab === "produce" ? "" : styles.offTab} era={state.era} />

      <div className={styles.grid} data-tab={tab} {...swipe}>
        <section className={`${styles.window} ${tab === "produce" ? styles.active : ""}`} aria-labelledby="w-res">
          <h2 id="w-res" className={styles.windowTitle}>{fr.windows.resources}</h2>
          <dl className={styles.resources}>
            {state.era < 5 && <div>
              <dt>{fr.resources.money}</dt>
              <dd className={styles.big}>{formatNumber(state.resources.money)}</dd>
              <dd className={styles.rate}>+{formatNumber(rates.money)} {fr.resources.perSecond}</dd>
            </div>}
            {state.era < 5 && <div>
              <dt>{fr.resources.data}</dt>
              <dd className={styles.big}>{formatNumber(state.resources.data)}</dd>
              <dd className={styles.rate}>+{formatNumber(rates.data)} {fr.resources.perSecond}</dd>
            </div>}
            {state.era >= 3 && state.era < 5 && (
              <div>
                <dt>{fr.resources.intelligence}</dt>
                <dd className={styles.big}>{formatNumber(state.resources.intelligence)}</dd>
                <dd className={styles.rate}>+{formatNumber(rates.intelligence)} {fr.resources.perSecond}</dd>
              </div>
            )}
            {state.era >= 2 && state.era < 5 && (
              <div>
                <dt>{fr.resources.compute}</dt>
                <dd className={styles.big}>{formatNumber(state.resources.compute)}</dd>
                <dd className={styles.rate}>+{formatNumber(rates.compute)} {fr.resources.perSecond}</dd>
              </div>
            )}
            {state.era >= 4 &&
              (state.era === 5 ? (["robots", "control"] as const) : (["robots", "autonomy"] as const)).map((r) => (
                <div key={r}>
                  <dt>{fr.resources[r]}</dt>
                  <dd className={styles.big}>{formatNumber(state.resources[r])}</dd>
                  <dd className={styles.rate}>+{formatNumber(rates[r])} {fr.resources.perSecond}</dd>
                </div>
              ))}
          </dl>
          {state.era < 5 && (
            <p className={styles.muted}>
              {fr.resources.totalMoney} : {formatNumber(state.totalMoney)}
            </p>
          )}
          <p className={styles.muted}>
            {t(fr.human.gauge, { percent: Math.round(humanDependency(state) * 100) })}
          </p>

          {state.era === 5 ? (
            <p className={styles.itemText}>{fr.era5.noManual}</p>
          ) : (
            <>
              <h2 className={styles.windowTitle}>{fr.windows.manual}</h2>
              <button type="button" className={styles.manual} onClick={store.click}>
                {fr.manual.button}
              </button>
              <p className={styles.muted}>{t(fr.manual.gain, { amount: formatNumber(manualGain(state)) })}</p>
              <p className={styles.muted}>{fr.manual.hint}</p>
            </>
          )}

          <EventWindow state={state} onAnswer={store.answerEvent} />
        </section>

        <section className={`${styles.window} ${styles.buyWindow} ${tab === "buy" ? styles.active : ""}`} aria-labelledby="w-buy">
          <h2 id="w-buy" className={styles.windowTitle}>{fr.windows.buildings}</h2>
          {state.era === 5 && <p className={styles.itemText}>{fr.era5.empty}</p>}
          {state.era >= 2 && state.era < 5 && (
            <div className={styles.item}>
              <label className={styles.itemName} htmlFor="script-target">
                {fr.scripts.label}
              </label>
              <select
                id="script-target"
                className={styles.button}
                value={state.scriptTarget ?? ""}
                onChange={(e) => store.setScriptTarget(e.target.value === "" ? null : (e.target.value as BuildingId))}
              >
                <option value="">{fr.scripts.none}</option>
                {visibleBuildings(state)
                  .filter((b) => b.id !== "buyScript")
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
              <p className={styles.muted}>{fr.scripts.hint}</p>
            </div>
          )}
          <p className={`${styles.muted} ${styles.desktopOnly}`}>{fr.buildings.shortcuts}</p>
          <ul className={styles.list}>
            {visibleBuildings(state).map((def) => (
              <BuildingRow key={def.id} def={def} state={state} onBuy={store.buy} />
            ))}
          </ul>
        </section>

        <section className={`${styles.window} ${tab === "upgrade" ? styles.active : ""}`} aria-labelledby="w-up">
          <h2 id="w-up" className={styles.windowTitle}>{fr.windows.upgrades}</h2>
          {state.era < 5 && <UpgradeList state={state} onBuy={store.upgrade} />}
          <DirectivesPanel state={state} onGive={store.giveDirective} />
          <RenaissancePanel state={state} onRenaissance={store.renaissance} />
          <KnowledgeTree state={state} onBuy={store.buyKnowledge} />
          <NextRenaissancePanel
            state={state}
            era={2}
            ready={canRenaissance2(state)}
            texts={fr.renaissance2}
            gain={algorithmPointGain(state)}
            onRenaissance={store.renaissance2}
          />
          <NextRenaissancePanel
            state={state}
            era={3}
            ready={canRenaissance3(state)}
            texts={fr.renaissance3}
            gain={neuralCoreGain(state)}
            onRenaissance={store.renaissance3}
          />
          <AlgorithmsPanel state={state} store={store} />
          <TrainingPanel state={state} onStart={store.startTraining} />
          <NextRenaissancePanel
            state={state}
            era={4}
            ready={canRenaissance4(state)}
            texts={{
              ...fr.renaissance4,
              locked: t(fr.renaissance4.locked, { robots: formatNumber(D(ROBOTS_FOR_RENAISSANCE4)) }),
              lose: t(fr.renaissance4.lose, { machines: formatNumber(D(ERA5_START_MACHINES)) }),
            }}
            gain={aiCoreGain(state)}
            onRenaissance={store.renaissance4}
          />
          <PoliciesPanel state={state} onBuy={store.buyPolicy} />
          <NeuralGridPanel state={state} store={store} />
        </section>

        <section className={`${styles.window} ${tab === "archives" ? styles.active : ""}`} aria-labelledby="w-arch">
          <h2 id="w-arch" className={styles.windowTitle}>{fr.archives.title}</h2>
          <ArchivesPanel state={state} />
        </section>

        <section className={`${styles.window} ${tab === "account" ? styles.active : ""}`} aria-labelledby="w-account">
          <h2 id="w-account" className={styles.windowTitle}>{fr.account.title}</h2>
          <AccountPanel />
          <Leaderboard />
        </section>
      </div>

      <footer className={styles.footer}>
        <p>{fr.footer}</p>
      </footer>
    </main>
  );
}

/** A scripted era change: the new era's name fades in over the page, then leaves. Not on first load. */
function EraTransition({ era }: { era: GameState["era"] }) {
  const previous = useRef(era);
  const [shown, setShown] = useState<GameState["era"] | null>(null);
  useEffect(() => {
    if (previous.current === era) return;
    previous.current = era;
    setShown(era);
    const timer = setTimeout(() => setShown(null), 3200);
    return () => clearTimeout(timer);
  }, [era]);
  if (shown === null) return null;
  return (
    <div className={styles.eraTransition} role="status">
      <p className={styles.eraTransitionYears}>{fr.eras[shown].years}</p>
      {/* Only the era's own title: the full « Ère II · … » label stays in the header. */}
      <p className={styles.eraTransitionName}>{fr.eras[shown].name.split(" · ")[1]}</p>
    </div>
  );
}

/** Recap of an absence (cahier §6): how long, what was produced, what was reached. */
function OfflineRecap({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  const lines = RESOURCE_IDS.filter((r) => report.produced[r].gt(0)).map((r) =>
    t(fr.offline.produced, { resource: fr.resources[r], amount: formatNumber(report.produced[r]) }),
  );
  const counts = [
    [report.buildingsBought, fr.offline.bought],
    [report.modelsTrained, fr.offline.models],
    [report.archivesFound, fr.offline.archives],
    [report.achievementsUnlocked, fr.offline.achievements],
  ] as const;
  return (
    <div className={styles.sheetBackdrop}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="offline-title">
        <h2 id="offline-title" className={styles.windowTitle}>{fr.offline.title}</h2>
        <p className={styles.itemText}>{t(fr.offline.away, { duration: formatDuration(report.awayMs) })}</p>
        {report.capped && <p className={styles.muted}>{fr.offline.capped}</p>}
        <ul className={styles.recap}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          {counts.filter(([n]) => n > 0).map(([n, label]) => (
            <li key={label}>{t(label, { count: n })}</li>
          ))}
        </ul>
        <button type="button" className={styles.manual} onClick={onClose} autoFocus>
          {fr.offline.close}
        </button>
      </section>
    </div>
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
  // Keyboard shortcuts on the focused row: 1 = ×1, 2 = ×10, 3 = Max (cahier §10).
  const onKeyDown = (e: KeyboardEvent) => {
    const mode = ({ "1": 1, "2": 10, "3": "max" } as const)[e.key as "1" | "2" | "3"];
    if (mode === undefined || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    onBuy(def.id, mode);
  };
  return (
    <li className={styles.item} onKeyDown={onKeyDown}>
      <div className={styles.itemHead}>
        <span className={styles.itemName}>{def.name}</span>
        <span className={styles.muted}>
          {/* The key remounts the number on each purchase: a short bump says « bought ». */}
          <span key={owned} className={owned > 0 ? styles.bump : ""}>{owned}</span> {fr.buildings.owned}
        </span>
      </div>
      <p className={styles.itemText}>{def.description}</p>
      {def.produces.perSecond.gt(0) && <p className={styles.muted}>
        {t(fr.buildings.perUnit, {
          amount: formatNumber(
            def.produces.perSecond.mul(multiplier(state, def.id) * synergyBonus(state, def.id) * milestoneMultiplier(owned)),
          ),
        })}
      </p>}
      <p className={styles.muted}>
        {nextMilestone(owned) === null
          ? fr.buildings.lastMilestone
          : t(fr.buildings.nextMilestone, { count: nextMilestone(owned) ?? 0 })}
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
  const remaining = visibleUpgrades(state).filter((u) => !state.upgrades[u.id]);
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
          {def.costResource === "data" ? " données" : def.costResource === "compute" ? " Calcul" : ""}
        </button>
      </div>
    </li>
  );
}

/** Two steps: the player reads what is lost and gained, then confirms. */
function RenaissancePanel({ state, onRenaissance }: { state: GameState; onRenaissance: () => void }) {
  const [preparing, setPreparing] = useState(false);
  const ready = canRenaissance(state);
  if (!ready && state.renaissances === 0) {
    return <p className={styles.muted}>{fr.renaissance.locked}</p>;
  }
  if (!ready) return null;
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.renaissance.title}</h2>
      <p className={styles.muted}>{t(fr.renaissance.count, { count: state.renaissances })}</p>
      {!preparing ? (
        <div className={styles.buyRow}>
          <button type="button" className={styles.button} onClick={() => setPreparing(true)}>
            {fr.renaissance.start}
          </button>
        </div>
      ) : (
        <>
          <h3 className={styles.itemName}>{fr.renaissance.explainTitle}</h3>
          <p className={styles.itemText}>{fr.renaissance.lose}</p>
          <p className={styles.itemText}>{fr.renaissance.keep}</p>
          <p className={styles.itemText}>{t(fr.renaissance.gain, { points: knowledgeGain(state) })}</p>
          <div className={styles.buyRow}>
            <button type="button" className={styles.button} onClick={onRenaissance}>
              {fr.renaissance.confirm}
            </button>
            <button type="button" className={styles.button} onClick={() => setPreparing(false)}>
              {fr.renaissance.cancel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function KnowledgeTree({ state, onBuy }: { state: GameState; onBuy: (id: string) => void }) {
  if (state.renaissances === 0) return null;
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.knowledge.title}</h2>
      <p className={styles.muted}>{t(fr.knowledge.points, { points: state.knowledgePoints })}</p>
      <ul className={styles.list}>
        {KNOWLEDGE_BONUSES.map((b) => {
          const owned = Boolean(state.knowledgeBonuses[b.id]);
          return (
            <li key={b.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{b.name}</span>
                <span className={styles.muted}>{t(fr.knowledge.cost, { cost: b.cost })}</span>
              </div>
              <p className={styles.itemText}>{b.description}</p>
              <div className={styles.buyRow}>
                <button
                  type="button"
                  className={styles.button}
                  disabled={owned || state.knowledgePoints < b.cost}
                  onClick={() => onBuy(b.id)}
                >
                  {owned ? fr.knowledge.owned : fr.knowledge.buy}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Renaissance II and III: same two steps as the first one, for the era that ends. */
function NextRenaissancePanel({
  state,
  era,
  ready,
  texts,
  gain,
  onRenaissance,
}: {
  state: GameState;
  era: 2 | 3 | 4;
  ready: boolean;
  texts: { title: string; locked: string; lose: string; keep: string; gain: string };
  gain: number;
  onRenaissance: () => void;
}) {
  const [preparing, setPreparing] = useState(false);
  if (state.era !== era) return null;
  if (!ready) return <p className={styles.muted}>{texts.locked}</p>;
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{texts.title}</h2>
      {!preparing ? (
        <div className={styles.buyRow}>
          <button type="button" className={styles.button} onClick={() => setPreparing(true)}>
            {fr.renaissance.start}
          </button>
        </div>
      ) : (
        <>
          <h3 className={styles.itemName}>{fr.renaissance.explainTitle}</h3>
          <p className={styles.itemText}>{texts.lose}</p>
          <p className={styles.itemText}>{texts.keep}</p>
          <p className={styles.itemText}>{t(texts.gain, { points: gain })}</p>
          <div className={styles.buyRow}>
            <button type="button" className={styles.button} onClick={onRenaissance}>
              {fr.renaissance.confirm}
            </button>
            <button type="button" className={styles.button} onClick={() => setPreparing(false)}>
              {fr.renaissance.cancel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AlgorithmsPanel({ state, store }: { state: GameState; store: ReturnType<typeof getStore> }) {
  if (state.era < 2) return null;
  const used = state.equippedAlgorithms.length;
  const slots = algorithmSlots(state);
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.algorithms.title}</h2>
      <p className={styles.muted}>{t(fr.algorithms.points, { points: state.algorithmPoints })}</p>
      <p className={styles.muted}>{t(fr.algorithms.slots, { used, total: slots })}</p>
      <ul className={styles.list}>
        {ALGORITHMS.map((a) => {
          const owned = Boolean(state.algorithms[a.id]);
          const equipped = state.equippedAlgorithms.includes(a.id);
          return (
            <li key={a.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{a.name}</span>
                <span className={styles.muted}>{t(fr.algorithms.cost, { cost: a.cost })}</span>
              </div>
              <p className={styles.itemText}>{a.description}</p>
              <div className={styles.buyRow}>
                {!owned && (
                  <button
                    type="button"
                    className={styles.button}
                    disabled={state.algorithmPoints < a.cost}
                    onClick={() => store.buyAlgorithm(a.id)}
                  >
                    {fr.algorithms.buy}
                  </button>
                )}
                {owned && !equipped && (
                  <button
                    type="button"
                    className={styles.button}
                    disabled={used >= slots}
                    onClick={() => store.equipAlgorithm(a.id)}
                  >
                    {fr.algorithms.equip}
                  </button>
                )}
                {equipped && (
                  <button type="button" className={styles.button} onClick={() => store.unequipAlgorithm(a.id)}>
                    {fr.algorithms.unequip}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TrainingPanel({ state, onStart }: { state: GameState; onStart: () => void }) {
  if (state.era < 3 || state.era === 5) return null;
  const affordable = state.resources.data.gte(TRAINING.dataCost) && state.resources.compute.gte(TRAINING.computeCost);
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.training.title}</h2>
      <p className={styles.muted}>{t(fr.training.models, { count: state.models.length })}</p>
      <p className={styles.muted}>
        {t(fr.training.cost, { data: TRAINING.dataCost, compute: formatNumber(D(TRAINING.computeCost)) })}
      </p>
      <div className={styles.buyRow}>
        <button
          type="button"
          className={styles.button}
          disabled={Boolean(state.training) || !affordable}
          onClick={onStart}
        >
          {state.training ? fr.training.running : fr.training.start}
        </button>
      </div>
      {state.era >= 4 && (
        <p className={styles.muted}>{t(fr.autonomy.autoTraining, { threshold: AUTO_TRAINING_AUTONOMY })}</p>
      )}
    </div>
  );
}

/** Civilisation policies (renaissance IV), bought once each with AI Cores. */
function PoliciesPanel({ state, onBuy }: { state: GameState; onBuy: (id: string) => void }) {
  if (state.renaissances4 === 0) return null;
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.policies.title}</h2>
      <p className={styles.muted}>{t(fr.policies.cores, { count: state.aiCores })}</p>
      <ul className={styles.list}>
        {POLICIES.map((p) => {
          const owned = Boolean(state.policies[p.id]);
          return (
            <li key={p.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{p.name}</span>
                <span className={styles.muted}>{t(fr.policies.cost, { cost: p.cost })}</span>
              </div>
              <p className={styles.itemText}>{p.description}</p>
              <div className={styles.buyRow}>
                <button type="button" className={styles.button} disabled={owned || state.aiCores < p.cost} onClick={() => onBuy(p.id)}>
                  {owned ? fr.policies.owned : fr.policies.buy}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Era V: the player no longer produces, they give directives, in order, paid in Contrôle. */
function DirectivesPanel({ state, onGive }: { state: GameState; onGive: (id: string) => void }) {
  if (state.era !== 5) return null;
  const next = nextDirective(state);
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.era5.directivesTitle}</h2>
      <p className={styles.muted}>{fr.era5.directivesHint}</p>
      <p className={styles.muted}>{t(fr.era5.automation, { percent: Math.round(automation(state) * 100) })}</p>
      <p className={styles.muted}>{t(fr.era5.machines, { count: formatNumber(state.resources.robots) })}</p>
      <ul className={styles.list}>
        {DIRECTIVES.map((d) => {
          const given = Boolean(state.directives[d.id]);
          const isNext = next?.id === d.id;
          const cost = directiveCost(state, d.id);
          return (
            <li key={d.id} className={styles.item}>
              <span className={styles.itemName}>{d.name}</span>
              <p className={styles.itemText}>{d.description}</p>
              <div className={styles.buyRow}>
                {given ? (
                  <p className={styles.muted}>{fr.era5.given}</p>
                ) : isNext ? (
                  <button
                    type="button"
                    className={styles.button}
                    disabled={state.resources.control.lt(cost)}
                    onClick={() => onGive(d.id)}
                  >
                    {t(fr.era5.give, { cost: formatNumber(D(cost)) })}
                  </button>
                ) : (
                  <p className={styles.muted}>{fr.era5.later}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.muted}>{fr.era5.goal}</p>
    </div>
  );
}

/** Neural grid (renaissance III): pick a core, then a free cell; a placed core is removed by a tap. */
function NeuralGridPanel({ state, store }: { state: GameState; store: ReturnType<typeof getStore> }) {
  const [selected, setSelected] = useState(CORES[0].id);
  if (state.renaissances3 === 0) return null;
  const nameOf = (id: string) => CORES.find((c) => c.id === id)?.name ?? id;
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.grid.title}</h2>
      <p className={styles.muted}>{t(fr.grid.cores, { count: state.neuralCores })}</p>
      <p className={styles.muted}>{fr.grid.hint}</p>
      <div className={styles.buyRow} role="radiogroup" aria-label={fr.grid.title}>
        {CORES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected === c.id}
            className={styles.button}
            onClick={() => setSelected(c.id)}
            title={c.description}
          >
            {selected === c.id ? "● " : ""}
            {c.name}
          </button>
        ))}
      </div>
      <div className={styles.coreGrid}>
        {state.neuralGrid.map((id, cell) =>
          id ? (
            <button
              key={cell}
              type="button"
              className={styles.button}
              aria-label={t(fr.grid.cell, { n: cell + 1, name: nameOf(id), factor: coreFactor(state.neuralGrid, cell).toFixed(2) })}
              onClick={() => store.removeCore(cell)}
            >
              {nameOf(id)}
              <br />×{coreFactor(state.neuralGrid, cell).toFixed(2)}
            </button>
          ) : (
            <button
              key={cell}
              type="button"
              className={styles.button}
              disabled={state.neuralCores < 1}
              aria-label={t(fr.grid.place, { n: cell + 1, name: nameOf(selected) })}
              onClick={() => store.placeCore(cell, selected)}
            >
              {fr.grid.empty}
            </button>
          ),
        )}
      </div>
      {state.era >= 4 && (
        <p className={styles.muted}>
          {t(fr.autonomy.replication, {
            rate: replicationRate(state).toFixed(5),
          })}
        </p>
      )}
    </div>
  );
}

function targetLabel(def: UpgradeDef): string {
  if (def.target.kind === "manual") return fr.upgrades.manual;
  if (def.target.kind === "all") return fr.upgrades.all;
  if (def.target.kind === "synergy") {
    return t(fr.upgrades.synergy, { source: getBuilding(def.target.source).name, building: getBuilding(def.target.building).name });
  }
  return getBuilding(def.target.building).name;
}

function requirementText(def: UpgradeDef): string {
  const req = def.requires;
  if (req.kind === "owned") return t(fr.upgrades.requirementOwned, { count: req.count, building: getBuilding(req.building).name });
  if (req.kind === "totalMoney") return t(fr.upgrades.requirementTotal, { amount: formatNumber(req.amount) });
  return "";
}

/** What an event choice costs in money (the sum of its spend effects). */
function spendOf(effects: EventEffect[]) {
  return effects.reduce((acc, e) => (e.kind === "spend" ? acc.add(e.amount) : acc), ZERO);
}

function EventWindow({ state, onAnswer }: { state: GameState; onAnswer: (choiceId: string) => void }) {
  const money = state.resources.money;
  if (state.event.status === "pending") return null;
  const def = getEvent(state.event.id);
  if (!def) return null;

  if (state.event.status === "resolved") {
    const chosenId = state.event.status === "resolved" ? state.event.choice : "";
    const chosen = def.choices.find((c) => c.id === chosenId);
    return (
      <div className={styles.event}>
        <h2 className={styles.windowTitle}>{def.title}</h2>
        <p className={styles.muted}>{t(fr.event.chosen, { label: chosen?.label ?? "" })}</p>
      </div>
    );
  }

  const slowed = state.effects.some((e) => e.kind === "slowdown");
  return (
    <div className={`${styles.event} ${styles.eventSheet}`} role="alertdialog" aria-labelledby="ev-title">
      <h2 id="ev-title" className={styles.windowTitle}>{def.title}</h2>
      <p className={styles.itemText}>{def.text}</p>
      <div className={styles.buyRow}>
        {def.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className={styles.button}
            disabled={money.lt(spendOf(choice.effects))}
            onClick={() => onAnswer(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {slowed && <p className={styles.muted}>{fr.event.slowdown}</p>}
    </div>
  );
}

function ArchivesPanel({ state }: { state: GameState }) {
  const unlocked = Object.keys(state.achievements).length;
  return (
    <>
      <p className={styles.muted}>{t(fr.archives.count, { count: Object.keys(state.archives).length, total: ARCHIVES.length })}</p>
      <ul className={styles.list}>
        {ARCHIVES.map((a) => {
          const open = Boolean(state.archives[a.id]);
          return (
            <li key={a.id} className={styles.item}>
              <span className={styles.itemName}>{open ? a.title : fr.archives.locked}</span>
              {open && <p className={styles.itemText}>{a.text}</p>}
            </li>
          );
        })}
      </ul>
      <h2 className={styles.windowTitle}>{fr.achievements.title}</h2>
      <p className={styles.muted}>{t(fr.achievements.count, { count: unlocked, total: ACHIEVEMENTS.length })}</p>
      <ul className={styles.list}>
        {ACHIEVEMENTS.map((a) => (
          <li key={a.id} className={styles.item}>
            <span className={styles.itemName}>{state.achievements[a.id] ? a.title : fr.achievements.locked}</span>
          </li>
        ))}
      </ul>
      <p className={styles.muted}>{fr.achievements.bonus}</p>
    </>
  );
}
