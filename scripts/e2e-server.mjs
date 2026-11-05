/**
 * Serveur des tests E2E : une base PostgreSQL neuve en mémoire (PGlite), les migrations
 * appliquées, puis `next build` et `next start`. Lancé par playwright.config.ts.
 */
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = process.argv[2] ?? "3100";
const db = await PGlite.create();
const migrations = path.join(import.meta.dirname, "../prisma/migrations");
const dirs = readdirSync(migrations, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
for (const dir of dirs) await db.exec(readFileSync(path.join(migrations, dir, "migration.sql"), "utf8"));
const server = new PGLiteSocketServer({ db, port: 0, maxConnections: 1 });
await server.start();

const app = spawn(`npm run build && npm run start -- -p ${port}`, {
  shell: true,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: `postgresql://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable` },
});

async function shutdown(code) {
  app.kill();
  await server.stop();
  await db.close();
  process.exit(code);
}
app.on("exit", (code) => void shutdown(code ?? 0));
process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));
