import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** One client per process; Next's dev server reloads modules, so it is kept on globalThis. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({
    // DATABASE_POOL_MAX=1 for the in-memory test database (PGlite serves one session at a time).
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DATABASE_POOL_MAX) || undefined }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
