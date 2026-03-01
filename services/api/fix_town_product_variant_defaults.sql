CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "TownProductVariant"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "TownProductVariant"
  ALTER COLUMN "createdAt" SET DEFAULT now();

ALTER TABLE "TownProductVariant"
  ALTER COLUMN "updatedAt" SET DEFAULT now();
