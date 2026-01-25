-- CreateTable
CREATE TABLE "Town" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Town_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Town_name_key" ON "Town"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Town_slug_key" ON "Town"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_townId_key" ON "Warehouse"("townId");

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;
