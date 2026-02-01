/*
  Warnings:

  - The values [REFUND_PENDING] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `StockMovement` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'FULFILLED', 'SETTLED', 'PARTIALLY_REFUNDED', 'CANCELLED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_townId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_townProductId_fkey";

-- DropIndex
DROP INDEX "Refund_paymentId_key";

-- DropTable
DROP TABLE "StockMovement";

-- DropEnum
DROP TYPE "StockMovementReason";

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");
