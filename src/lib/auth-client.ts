import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

/** Browser client for /api/auth (same origin). */
export const authClient = createAuthClient({ plugins: [usernameClient()] });
