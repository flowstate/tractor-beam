/*
  Warnings:

  - You are about to drop the column `componentId` on the `SupplierPerformanceForecast` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SupplierPerformanceForecast_supplierId_componentId_idx";

-- AlterTable
ALTER TABLE "SupplierPerformanceForecast" DROP COLUMN "componentId";

-- CreateIndex
CREATE INDEX "SupplierPerformanceForecast_supplierId_idx" ON "SupplierPerformanceForecast"("supplierId");
