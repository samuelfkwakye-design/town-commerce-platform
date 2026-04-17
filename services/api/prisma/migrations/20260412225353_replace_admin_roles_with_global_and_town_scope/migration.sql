/*
  Warnings:

  - The values [SUPER_ADMIN,OPS_ADMIN,DRIVER] on the enum `AdminRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminRole_new" AS ENUM ('GLOBAL_SUPER_ADMIN', 'TOWN_SUPER_ADMIN', 'WAREHOUSE_ADMIN');
ALTER TABLE "public"."AdminUser" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "AdminUser" ALTER COLUMN "role" TYPE "AdminRole_new" USING ("role"::text::"AdminRole_new");
ALTER TYPE "AdminRole" RENAME TO "AdminRole_old";
ALTER TYPE "AdminRole_new" RENAME TO "AdminRole";
DROP TYPE "public"."AdminRole_old";
ALTER TABLE "AdminUser" ALTER COLUMN "role" SET DEFAULT 'WAREHOUSE_ADMIN';
COMMIT;
