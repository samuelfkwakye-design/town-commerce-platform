CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "TownProduct"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "TownProduct"
  ALTER COLUMN "createdAt" SET DEFAULT now();

ALTER TABLE "TownProduct"
  ALTER COLUMN "updatedAt" SET DEFAULT now();
