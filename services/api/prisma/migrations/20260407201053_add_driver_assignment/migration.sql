-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedDriverName" TEXT,
ADD COLUMN     "assignedDriverPhone" TEXT,
ADD COLUMN     "driverAssignedAt" TIMESTAMP(3);
