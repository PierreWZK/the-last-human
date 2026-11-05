import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { readSave, writeSave, type SaveResponse } from "@/server/saves";

/** Each player reads and writes only their own save: the user id comes from the session cookie. */
async function userId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

const json = ({ status, body }: SaveResponse) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const id = await userId(request);
  if (!id) return json({ status: 401, body: { error: "Connexion requise" } });
  return json(await readSave(prisma, id));
}

export async function PUT(request: Request) {
  const id = await userId(request);
  if (!id) return json({ status: 401, body: { error: "Connexion requise" } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: 400, body: { error: "JSON invalide" } });
  }
  return json(await writeSave(prisma, id, body));
}
