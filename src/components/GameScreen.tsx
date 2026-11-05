"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ACHIEVEMENTS, ARCHIVES } from "@/content/events1";
import { KNOWLEDGE_BONUSES } from "@/content/knowledge";
import { ALGORITHMS } from "@/content/algorithms";
import { TRAINING } from "@/content/era3";
import {
  canBuyUpgrade,
  algorithmPointGain,
  algorithmSlots,
  canRenaissance,
  canRenaissance2,
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
import { D, formatNumber } from "@/game/decimal";
import { getStore, type StoreSnapshot } from "@/game/store";
import type { BuildingDef, BuildingId, EventEffect, GameState, UpgradeDef } from "@/game/types";
import { fr, t } from "@/i18n/fr";
import { ZERO } from "@/game/decimal";
import styles from "./GameScreen.module.css";
import { Scene } from "./Scene";

type Tab = "produce" | "buy" | "upgrade" | "archives";

const SERVER_SNAPSHOT: StoreSnapshot = { state: createInitialState(), notice: null, clicks: 0 };

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

      <nav className={styles.tabs} aria-label="Sections">
        {(["produce", "buy", "upgrade", "archives"] as const).map((key) => (
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

      <Scene className={tab === "produce" ? "" : styles.offTab} />

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
            {state.era >= 3 && (
              <div>
                <dt>{fr.resources.intelligence}</dt>
                <dd className={styles.big}>{formatNumber(state.resources.intelligence)}</dd>
                <dd className={styles.rate}>+{formatNumber(rates.intelligence)} {fr.resources.perSecond}</dd>
              </div>
            )}
            {state.era >= 2 && (
              <div>
                <dt>{fr.resources.compute}</dt>
                <dd className={styles.big}>{formatNumber(state.resources.compute)}</dd>
                <dd className={styles.rate}>+{formatNumber(rates.compute)} {fr.resources.perSecond}</dd>
              </div>
            )}
          </dl>
          <p className={styles.muted}>
            {fr.resources.totalMoney} : {formatNumber(state.totalMoney)}
          </p>
          <p className={styles.muted}>
            {t(fr.human.gauge, { percent: Math.round(humanDependency(state) * 100) })}
          </p>

          <h2 className={styles.windowTitle}>{fr.windows.manual}</h2>
          <button type="button" className={styles.manual} onClick={store.click}>
            {fr.manual.button}
          </button>
          <p className={styles.muted}>{t(fr.manual.gain, { amount: formatNumber(manualGain(state)) })}</p>
          <p className={styles.muted}>{fr.manual.hint}</p>

          <EventWindow state={state} onAnswer={store.answerEvent} />
        </section>

        <section className={`${styles.window} ${tab === "buy" ? styles.active : ""}`} aria-labelledby="w-buy">
          <h2 id="w-buy" className={styles.windowTitle}>{fr.windows.buildings}</h2>
          {state.era >= 2 && (
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
          <ul className={styles.list}>
            {visibleBuildings(state).map((def) => (
              <BuildingRow key={def.id} def={def} state={state} onBuy={store.buy} />
            ))}
          </ul>
        </section>

        <section className={`${styles.window} ${tab === "upgrade" ? styles.active : ""}`} aria-labelledby="w-up">
          <h2 id="w-up" className={styles.windowTitle}>{fr.windows.upgrades}</h2>
          <UpgradeList state={state} onBuy={store.upgrade} />
          <RenaissancePanel state={state} onRenaissance={store.renaissance} />
          <KnowledgeTree state={state} onBuy={store.buyKnowledge} />
          <Renaissance2Panel state={state} onRenaissance={store.renaissance2} />
          <AlgorithmsPanel state={state} store={store} />
          <TrainingPanel state={state} onStart={store.startTraining} />
        </section>

        <section className={`${styles.window} ${tab === "archives" ? styles.active : ""}`} aria-labelledby="w-arch">
          <h2 id="w-arch" className={styles.windowTitle}>{fr.archives.title}</h2>
          <ArchivesPanel state={state} />
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

function Renaissance2Panel({ state, onRenaissance }: { state: GameState; onRenaissance: () => void }) {
  const [preparing, setPreparing] = useState(false);
  if (state.era !== 2) return null;
  if (!canRenaissance2(state)) return <p className={styles.muted}>{fr.renaissance2.locked}</p>;
  return (
    <div className={styles.event}>
      <h2 className={styles.windowTitle}>{fr.renaissance2.title}</h2>
      {!preparing ? (
        <div className={styles.buyRow}>
          <button type="button" className={styles.button} onClick={() => setPreparing(true)}>
            {fr.renaissance.start}
          </button>
        </div>
      ) : (
        <>
          <h3 className={styles.itemName}>{fr.renaissance.explainTitle}</h3>
          <p className={styles.itemText}>{fr.renaissance2.lose}</p>
          <p className={styles.itemText}>{fr.renaissance2.keep}</p>
          <p className={styles.itemText}>{t(fr.renaissance2.gain, { points: algorithmPointGain(state) })}</p>
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
  if (state.era !== 3) return null;
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
    <div className={styles.event} role="alertdialog" aria-labelledby="ev-title">
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
