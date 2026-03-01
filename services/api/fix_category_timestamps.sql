ALTER TABLE "Category"
  ALTER COLUMN "createdAt" SET DEFAULT now();

ALTER TABLE "Category"
  ALTER COLUMN "updatedAt" SET DEFAULT now();
