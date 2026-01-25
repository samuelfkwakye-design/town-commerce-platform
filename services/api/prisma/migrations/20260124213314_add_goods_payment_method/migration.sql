-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'SETTLED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "goodsPaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD';
