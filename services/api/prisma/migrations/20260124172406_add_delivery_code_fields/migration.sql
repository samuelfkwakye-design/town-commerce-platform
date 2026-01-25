-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "deliveryCodeHash" TEXT;
