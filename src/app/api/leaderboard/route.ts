import { prisma } from "@/server/db";
import { readLeaderboard } from "@/server/leaderboard";

/** Public: pseudos and durations only, never an email or an id. */
export async function GET() {
  return Response.json(await readLeaderboard(prisma), { headers: { "Cache-Control": "public, max-age=30" } });
}
