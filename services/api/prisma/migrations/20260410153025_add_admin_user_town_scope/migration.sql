-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "townId" TEXT;

-- CreateIndex
CREATE INDEX "AdminUser_townId_idx" ON "AdminUser"("townId");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE SET NULL ON UPDATE CASCADE;
