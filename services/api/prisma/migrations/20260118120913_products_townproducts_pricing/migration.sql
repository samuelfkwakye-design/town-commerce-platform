-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('UNIT', 'WEIGHT');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TownProduct" (
    "id" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pricingModel" "PricingModel" NOT NULL DEFAULT 'UNIT',
    "pricePerUnit" DECIMAL(12,2),
    "pricePerKg" DECIMAL(12,2),
    "stockQty" INTEGER,
    "stockWeightGrams" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TownProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TownProduct_townId_idx" ON "TownProduct"("townId");

-- CreateIndex
CREATE INDEX "TownProduct_productId_idx" ON "TownProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TownProduct_townId_productId_key" ON "TownProduct"("townId", "productId");

-- AddForeignKey
ALTER TABLE "TownProduct" ADD CONSTRAINT "TownProduct_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TownProduct" ADD CONSTRAINT "TownProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
