import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { readProfile, setHidden } from "@/server/leaderboard";

const noStore = { "Cache-Control": "no-store" };

async function userId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

export async function GET(request: Request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Connexion requise" }, { status: 401, headers: noStore });
  return Response.json(await readProfile(prisma, id), { headers: noStore });
}

/** `{ hidden: boolean }`: show or hide the player on the public leaderboard. */
export async function PATCH(request: Request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Connexion requise" }, { status: 401, headers: noStore });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400, headers: noStore });
  }
  if (!(await setHidden(prisma, id, body))) return Response.json({ error: "Requête invalide" }, { status: 400, headers: noStore });
  return Response.json(await readProfile(prisma, id), { headers: noStore });
}
