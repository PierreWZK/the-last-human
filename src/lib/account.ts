/**
 * Règles de compte partagées par le client et le serveur (cahier §7).
 * Better Auth exige un email par utilisateur ; l'email est facultatif pour le joueur. Sans email,
 * on stocke une adresse dérivée du pseudo dans le domaine réservé `.invalid` (RFC 2606) : elle
 * ne reçoit jamais de courrier, et le serveur refuse qu'un autre pseudo s'en serve.
 */

export const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;

export const PASSWORD_MIN = 8;

export const NO_EMAIL_DOMAIN = "sans-email.thelasthuman.invalid";

export function placeholderEmail(username: string): string {
  return `${username.toLowerCase()}@${NO_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${NO_EMAIL_DOMAIN}`);
}

/** Message d'erreur en français pour l'inscription, ou null si tout est valide. */
export function validateSignUp(input: { username: string; password: string; email: string }): string | null {
  if (!USERNAME_PATTERN.test(input.username)) {
    return "Le pseudo fait 3 à 20 caractères : lettres, chiffres, _ et - uniquement.";
  }
  if (input.password.length < PASSWORD_MIN) return `Le mot de passe fait au moins ${PASSWORD_MIN} caractères.`;
  const email = input.email.trim();
  if (email !== "" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPlaceholderEmail(email))) {
    return "Cette adresse email n'est pas valide.";
  }
  return null;
}
