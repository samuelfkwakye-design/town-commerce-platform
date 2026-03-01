CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Product.id is cuid() in Prisma schema, but DB cannot generate cuid().
-- Use UUID for DB-level default so Studio inserts work.
ALTER TABLE "Product"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "Product"
  ALTER COLUMN "createdAt" SET DEFAULT now();

ALTER TABLE "Product"
  ALTER COLUMN "updatedAt" SET DEFAULT now();
