import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { claimDevice } from "@/server/saves";

/** « Reprendre ici » : the calling device becomes the one that plays. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Connexion requise" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400 });
  }
  const { status, body: payload } = await claimDevice(prisma, session.user.id, body);
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}
