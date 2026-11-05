-- Classement (phase 9) : une ligne par humanité jouée avec un compte, mesurée sur l'horloge du serveur.

-- AlterTable
ALTER TABLE "user" ADD COLUMN "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "valid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "run_userId_runId_key" ON "run"("userId", "runId");

-- CreateIndex
CREATE INDEX "run_valid_durationSec_idx" ON "run"("valid", "durationSec");

-- AddForeignKey
ALTER TABLE "run" ADD CONSTRAINT "run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
