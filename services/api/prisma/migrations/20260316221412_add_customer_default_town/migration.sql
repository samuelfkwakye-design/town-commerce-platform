-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "defaultTownId" TEXT;

-- CreateIndex
CREATE INDEX "Customer_defaultTownId_idx" ON "Customer"("defaultTownId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_defaultTownId_fkey" FOREIGN KEY ("defaultTownId") REFERENCES "Town"("id") ON DELETE SET NULL ON UPDATE CASCADE;
