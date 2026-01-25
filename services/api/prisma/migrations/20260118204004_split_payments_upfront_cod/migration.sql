-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('UPFRONT_FEES', 'COD_GOODS');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOMO', 'COD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "itemsSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payNowTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payOnDeliveryTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "serviceFee" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "provider" TEXT,
    "clientReference" TEXT,
    "hubtelTransactionId" TEXT,
    "hubtelResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_clientReference_key" ON "Payment"("clientReference");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_purpose_key" ON "Payment"("orderId", "purpose");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
