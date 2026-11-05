import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { PASSWORD_MIN, USERNAME_PATTERN, isPlaceholderEmail, placeholderEmail } from "@/lib/account";
import { prisma } from "./db";

/**
 * Better Auth: pseudo + mot de passe, email facultatif (cahier §7). Mots de passe hachés par
 * Better Auth (scrypt), sessions en cookie httpOnly. Secret et URL viennent de
 * BETTER_AUTH_SECRET et BETTER_AUTH_URL.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: PASSWORD_MIN, maxPasswordLength: 128 },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 20,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        // A no-email address belongs to its own pseudo only: nobody can squat someone else's.
        before: async (user) => {
          const name = typeof user.username === "string" ? user.username : "";
          if (isPlaceholderEmail(user.email) && user.email.toLowerCase() !== placeholderEmail(name)) {
            throw new APIError("BAD_REQUEST", { message: "Adresse email réservée." });
          }
        },
      },
    },
  },
});
