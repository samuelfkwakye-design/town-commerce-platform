-- Make Category inserts work from Prisma Studio by ensuring DB defaults

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure id has a default
ALTER TABLE "Category"
ALTER COLUMN "id"
SET DEFAULT gen_random_uuid()::text;

-- Ensure updatedAt is not-null safe on insert
ALTER TABLE "Category"
ALTER COLUMN "updatedAt"
SET DEFAULT now();

-- (Optional but recommended) also default createdAt if needed
ALTER TABLE "Category"
ALTER COLUMN "createdAt"
SET DEFAULT now();