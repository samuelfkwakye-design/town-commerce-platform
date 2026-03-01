CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Product
ALTER TABLE "Product"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- TownProduct
ALTER TABLE "TownProduct"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- TownProductVariant
ALTER TABLE "TownProductVariant"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Supplier
ALTER TABLE "Supplier"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- ProductSupplier
ALTER TABLE "ProductSupplier"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Order
ALTER TABLE "Order"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- OrderItem
ALTER TABLE "OrderItem"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- StockMovement
ALTER TABLE "StockMovement"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Sale
ALTER TABLE "Sale"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- SaleItem
ALTER TABLE "SaleItem"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Refund
ALTER TABLE "Refund"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- RefundItem
ALTER TABLE "RefundItem"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Payment
ALTER TABLE "Payment"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
