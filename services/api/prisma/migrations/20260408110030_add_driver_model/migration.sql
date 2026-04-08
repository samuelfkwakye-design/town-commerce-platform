-- DropForeignKey
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_townId_fkey";

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;
