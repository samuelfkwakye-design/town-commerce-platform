CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Category"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "Category"
  ALTER COLUMN "updatedAt" SET DEFAULT now();
