-- Fix Category.id so DB auto-generates value
-- This prevents Prisma Studio insert failures

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Category"
ALTER COLUMN "id"
SET DEFAULT gen_random_uuid()::text;
