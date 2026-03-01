-- AlterEnum
ALTER TYPE "PricingModel" ADD VALUE 'VARIANT';

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "townProductVariantId" TEXT;

-- CreateTable
CREATE TABLE "TownProductVariant" (
    "id" TEXT NOT NULL,
    "townProductId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packWeightGrams" INTEGER,

    CONSTRAINT "TownProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TownProductVariant_townProductId_idx" ON "TownProductVariant"("townProductId");

-- CreateIndex
CREATE INDEX "TownProductVariant_isActive_idx" ON "TownProductVariant"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TownProductVariant_townProductId_label_key" ON "TownProductVariant"("townProductId", "label");

-- CreateIndex
CREATE INDEX "OrderItem_townProductVariantId_idx" ON "OrderItem"("townProductVariantId");

-- AddForeignKey
ALTER TABLE "TownProductVariant" ADD CONSTRAINT "TownProductVariant_townProductId_fkey" FOREIGN KEY ("townProductId") REFERENCES "TownProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_townProductVariantId_fkey" FOREIGN KEY ("townProductVariantId") REFERENCES "TownProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
