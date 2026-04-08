/*
  Warnings:

  - You are about to drop the column `assignedDriverName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `assignedDriverPhone` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "assignedDriverName",
DROP COLUMN "assignedDriverPhone",
ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "driverPhone" TEXT;
