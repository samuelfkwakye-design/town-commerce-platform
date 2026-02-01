-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('FULFILMENT', 'REFUND', 'MANUAL_ADJUSTMENT');

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "townProductId" TEXT NOT NULL,
    "deltaQty" INTEGER,
    "deltaWeightGrams" INTEGER,
    "reason" "StockMovementReason" NOT NULL,
    "orderId" TEXT,
    "refundId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_townProductId_createdAt_idx" ON "StockMovement"("townProductId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_reason_createdAt_idx" ON "StockMovement"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- CreateIndex
CREATE INDEX "StockMovement_refundId_idx" ON "StockMovement"("refundId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_townProductId_fkey" FOREIGN KEY ("townProductId") REFERENCES "TownProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
