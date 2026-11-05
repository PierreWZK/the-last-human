# Image de production pour Coolify. NODE_ENV n'est volontairement défini qu'à l'exécution :
# en variable de build, `npm ci` n'installe pas les outils de build (leçon de Cartouche).

FROM node:22-alpine AS deps
WORKDIR /app
# .npmrc (peers optionnels de better-auth) et le schéma : `npm ci` lance `prisma generate`.
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
# Prisma CLI à part, pour appliquer les migrations au démarrage (la sortie standalone ne l'embarque pas).
WORKDIR /opt/migrate
RUN npm init -y >/dev/null && npm install --no-audit --no-fund prisma@7.10.1
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
WORKDIR /app
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["sh", "-c", "cd /opt/migrate && npx prisma migrate deploy && cd /app && exec node server.js"]
