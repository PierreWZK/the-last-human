import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env by itself; Node does it without an extra dependency.
try {
  process.loadEnvFile();
} catch {
  // No .env file: the variables come from the environment (Coolify, CI).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Empty during `prisma generate` in the Docker build, which needs no database.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
