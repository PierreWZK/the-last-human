"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getCloud, type CloudStatus } from "@/game/cloud";
import { deserialize } from "@/game/save";
import { getStore } from "@/game/store";
import { fr, t } from "@/i18n/fr";
import { isPlaceholderEmail, placeholderEmail, validateSignUp } from "@/lib/account";
import { authClient } from "@/lib/auth-client";
import styles from "./GameScreen.module.css";

const GUEST: CloudStatus = { kind: "guest" };

function useCloud() {
  const store = getStore();
  const cloud = getCloud(store);
  const status = useSyncExternalStore(cloud.subscribe, cloud.getStatus, () => GUEST);
  return { store, cloud, status };
}

/** Starts the cloud sync once a session exists. Rendered once, at the top of the game screen. */
export function CloudBanner() {
  const { cloud, status } = useCloud();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (userId) void cloud.connect(userId);
    else cloud.disconnect();
  }, [cloud, userId]);

  if (status.kind !== "elsewhere" && status.kind !== "conflict") return null;
  return (
    <div className={styles.notice} role="alert">
      <p>{status.kind === "elsewhere" ? fr.account.elsewhere : fr.account.conflict}</p>
      <button type="button" className={styles.button} onClick={() => void cloud.resumeHere()}>
        {fr.account.resumeHere}
      </button>
    </div>
  );
}

export function AccountPanel() {
  const { status } = useCloud();
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <p className={styles.muted}>{fr.account.loading}</p>;
  return (
    <>
      {session ? (
        <SignedIn name={session.user.displayUsername ?? session.user.name} email={session.user.email} status={status} />
      ) : (
        <SignedOut />
      )}
      <ExportImport />
    </>
  );
}

function SignedIn({ name, email, status }: { name: string; email: string; status: CloudStatus }) {
  const { cloud } = useCloud();
  return (
    <div className={styles.item}>
      <p className={styles.itemName}>{t(fr.account.signedIn, { name })}</p>
      {!isPlaceholderEmail(email) && <p className={styles.muted}>{email}</p>}
      <p className={styles.muted} role="status">
        {statusText(status)}
      </p>
      <div className={styles.buyRow}>
        <button type="button" className={styles.button} disabled={status.kind !== "synced"} onClick={() => void cloud.push()}>
          {fr.account.syncNow}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={async () => {
            await cloud.push();
            await authClient.signOut();
          }}
        >
          {fr.account.signOut}
        </button>
      </div>
    </div>
  );
}

function statusText(status: CloudStatus): string {
  switch (status.kind) {
    case "synced":
      return t(fr.account.synced, { revision: status.revision });
    case "connecting":
      return fr.account.connecting;
    case "offline":
      return fr.account.offline;
    case "elsewhere":
      return fr.account.elsewhere;
    case "conflict":
      return fr.account.conflict;
    case "guest":
      return "";
  }
}

function SignedOut() {
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "");
    setError(null);
    if (mode === "signUp") {
      const input = { username: get("username").trim(), password: get("password"), email: get("email").trim() };
      const invalid = validateSignUp(input);
      if (invalid) return setError(invalid);
      setBusy(true);
      const { error: failure } = await authClient.signUp.email({
        email: input.email || placeholderEmail(input.username),
        password: input.password,
        name: input.username,
        username: input.username,
      });
      setBusy(false);
      if (failure) setError(failure.status === 429 ? fr.account.tooMany : signUpError(failure.code));
    } else {
      const login = get("login").trim();
      const password = get("password");
      setBusy(true);
      const { error: failure } = login.includes("@")
        ? await authClient.signIn.email({ email: login, password })
        : await authClient.signIn.username({ username: login, password });
      setBusy(false);
      if (failure) setError(failure.status === 429 ? fr.account.tooMany : fr.account.badCredentials);
    }
  }

  return (
    <div className={styles.item}>
      <div className={styles.buyRow} role="tablist" aria-label={fr.account.title}>
        {(["signUp", "signIn"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className={styles.button}
            onClick={() => {
              setMode(key);
              setError(null);
            }}
          >
            {fr.account[key]}
          </button>
        ))}
      </div>
      <p className={styles.muted}>{mode === "signUp" ? fr.account.signUpHint : fr.account.signInHint}</p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {mode === "signUp" ? (
          <>
            <label className={styles.field}>
              {fr.account.username}
              <input name="username" autoComplete="username" required minLength={3} maxLength={20} />
            </label>
            <label className={styles.field}>
              {fr.account.password}
              <input name="password" type="password" autoComplete="new-password" required minLength={8} />
            </label>
            <label className={styles.field}>
              {fr.account.email}
              <input name="email" type="email" autoComplete="email" />
            </label>
            <p className={styles.muted}>{fr.account.noEmailWarning}</p>
          </>
        ) : (
          <>
            <label className={styles.field}>
              {fr.account.login}
              <input name="login" autoComplete="username" required />
            </label>
            <label className={styles.field}>
              {fr.account.password}
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
          </>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.buyRow}>
          <button type="submit" className={styles.button} disabled={busy}>
            {mode === "signUp" ? fr.account.signUpSubmit : fr.account.signInSubmit}
          </button>
        </div>
      </form>
    </div>
  );
}

function signUpError(code: string | undefined): string {
  if (code?.startsWith("USERNAME_IS_ALREADY_TAKEN")) return fr.account.usernameTaken;
  if (code?.startsWith("USER_ALREADY_EXISTS")) return fr.account.emailTaken;
  return fr.account.signUpFailed;
}

/** Export and import of the save as text (cahier §8, récupération). */
function ExportImport() {
  const store = getStore();
  const [exported, setExported] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const raw = String(new FormData(formElement).get("save") ?? "").trim();
    const result = deserialize(raw);
    if (!result.ok) return setMessage(t(fr.account.importFailed, { reason: result.reason }));
    store.replaceState(result.state, fr.account.imported);
    setMessage(fr.account.imported);
    formElement.reset();
  }

  return (
    <div className={styles.item}>
      <h3 className={styles.itemName}>{fr.account.backupTitle}</h3>
      <div className={styles.buyRow}>
        <button type="button" className={styles.button} onClick={() => setExported(store.serialized())}>
          {fr.account.export}
        </button>
      </div>
      {exported && (
        <label className={styles.field}>
          {fr.account.exportLabel}
          <textarea readOnly rows={4} value={exported} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
      <form className={styles.form} onSubmit={onImport}>
        <label className={styles.field}>
          {fr.account.importLabel}
          <textarea name="save" rows={4} required />
        </label>
        <p className={styles.muted}>{fr.account.importHint}</p>
        <div className={styles.buyRow}>
          <button type="submit" className={styles.button}>
            {fr.account.import}
          </button>
        </div>
      </form>
      {message && (
        <p className={styles.muted} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
