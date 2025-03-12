-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baselineFailureRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "baseLeadTime" INTEGER NOT NULL,
    "qualityVolatility" DOUBLE PRECISION NOT NULL,
    "seasonalStrength" DOUBLE PRECISION NOT NULL,
    "qualityMomentum" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_components" (
    "supplierId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "supplier_components_pkey" PRIMARY KEY ("supplierId","componentId")
);

-- CreateTable
CREATE TABLE "tractor_models" (
    "id" TEXT NOT NULL,
    "marketSensitivity" DOUBLE PRECISION NOT NULL,
    "priceSensitivity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tractor_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_components" (
    "modelId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,

    CONSTRAINT "model_components_pkey" PRIMARY KEY ("modelId","componentId")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_suppliers" (
    "locationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "location_suppliers_pkey" PRIMARY KEY ("locationId","supplierId")
);

-- CreateTable
CREATE TABLE "location_model_preferences" (
    "locationId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "preference" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "location_model_preferences_pkey" PRIMARY KEY ("locationId","modelId")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_daily_reports" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,
    "marketTrendIndex" DOUBLE PRECISION NOT NULL,
    "inflationRate" DOUBLE PRECISION NOT NULL,
    "dailyReportId" TEXT NOT NULL,

    CONSTRAINT "location_daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_model_demand" (
    "id" TEXT NOT NULL,
    "demandUnits" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "locationReportId" TEXT NOT NULL,

    CONSTRAINT "daily_model_demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_inventory" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "locationReportId" TEXT NOT NULL,

    CONSTRAINT "component_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "orderSize" INTEGER NOT NULL,
    "leadTimeVariance" INTEGER NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "supplierId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "locationReportId" TEXT NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_failures" (
    "id" TEXT NOT NULL,
    "failureRate" DOUBLE PRECISION NOT NULL,
    "supplierId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "locationReportId" TEXT NOT NULL,

    CONSTRAINT "component_failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_chain_analyses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL,
    "supplierPerformance" JSONB NOT NULL,
    "demandPatterns" JSONB NOT NULL,
    "componentRisks" JSONB NOT NULL,
    "inventoryParameters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_chain_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecasts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "summary" JSONB NOT NULL,
    "forecastData" JSONB NOT NULL,
    "historicalData" JSONB NOT NULL,
    "futureMti" DOUBLE PRECISION[],
    "futureInflation" DOUBLE PRECISION[],

    CONSTRAINT "demand_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPerformanceForecast" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualityForecast" JSONB NOT NULL,
    "leadTimeForecast" JSONB NOT NULL,
    "historicalData" JSONB NOT NULL,

    CONSTRAINT "SupplierPerformanceForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAllocationStrategy" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "overallStrategy" TEXT NOT NULL,
    "demandForecast" JSONB NOT NULL,

    CONSTRAINT "SupplierAllocationStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAllocation" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "allocationPercentage" DOUBLE PRECISION NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL,
    "futureScore" DOUBLE PRECISION NOT NULL,
    "weightedScore" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "quarterlyQuantities" JSONB NOT NULL,

    CONSTRAINT "SupplierAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnhancedReasoning" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyFactors" JSONB NOT NULL,
    "comparisons" JSONB NOT NULL,
    "detailedExplanation" TEXT NOT NULL,

    CONSTRAINT "EnhancedReasoning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationImpact" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "unitDelta" INTEGER NOT NULL,
    "costDelta" DOUBLE PRECISION NOT NULL,
    "riskDelta" DOUBLE PRECISION NOT NULL,
    "priorityScore" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "currentUnits" INTEGER NOT NULL,
    "currentCost" DOUBLE PRECISION NOT NULL,
    "recommendedUnits" INTEGER NOT NULL,
    "recommendedCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationImpact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_reports_date_idx" ON "daily_reports"("date");

-- CreateIndex
CREATE INDEX "location_daily_reports_date_locationId_idx" ON "location_daily_reports"("date", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "location_daily_reports_date_locationId_key" ON "location_daily_reports"("date", "locationId");

-- CreateIndex
CREATE INDEX "daily_model_demand_modelId_idx" ON "daily_model_demand"("modelId");

-- CreateIndex
CREATE INDEX "component_inventory_supplierId_componentId_idx" ON "component_inventory"("supplierId", "componentId");

-- CreateIndex
CREATE INDEX "component_inventory_locationReportId_idx" ON "component_inventory"("locationReportId");

-- CreateIndex
CREATE INDEX "deliveries_supplierId_componentId_idx" ON "deliveries"("supplierId", "componentId");

-- CreateIndex
CREATE INDEX "deliveries_locationReportId_idx" ON "deliveries"("locationReportId");

-- CreateIndex
CREATE INDEX "component_failures_supplierId_componentId_idx" ON "component_failures"("supplierId", "componentId");

-- CreateIndex
CREATE INDEX "component_failures_locationReportId_idx" ON "component_failures"("locationReportId");

-- CreateIndex
CREATE UNIQUE INDEX "demand_forecasts_locationId_modelId_isDefault_key" ON "demand_forecasts"("locationId", "modelId", "isDefault");

-- CreateIndex
CREATE INDEX "SupplierPerformanceForecast_supplierId_componentId_idx" ON "SupplierPerformanceForecast"("supplierId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "EnhancedReasoning_allocationId_key" ON "EnhancedReasoning"("allocationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationImpact_strategyId_key" ON "RecommendationImpact"("strategyId");

-- AddForeignKey
ALTER TABLE "supplier_components" ADD CONSTRAINT "supplier_components_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_components" ADD CONSTRAINT "supplier_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_components" ADD CONSTRAINT "model_components_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "tractor_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_components" ADD CONSTRAINT "model_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_suppliers" ADD CONSTRAINT "location_suppliers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_suppliers" ADD CONSTRAINT "location_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_model_preferences" ADD CONSTRAINT "location_model_preferences_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_model_preferences" ADD CONSTRAINT "location_model_preferences_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "tractor_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_daily_reports" ADD CONSTRAINT "location_daily_reports_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_daily_reports" ADD CONSTRAINT "location_daily_reports_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "daily_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_model_demand" ADD CONSTRAINT "daily_model_demand_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "tractor_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_model_demand" ADD CONSTRAINT "daily_model_demand_locationReportId_fkey" FOREIGN KEY ("locationReportId") REFERENCES "location_daily_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_inventory" ADD CONSTRAINT "component_inventory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_inventory" ADD CONSTRAINT "component_inventory_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_inventory" ADD CONSTRAINT "component_inventory_locationReportId_fkey" FOREIGN KEY ("locationReportId") REFERENCES "location_daily_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_locationReportId_fkey" FOREIGN KEY ("locationReportId") REFERENCES "location_daily_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_failures" ADD CONSTRAINT "component_failures_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_failures" ADD CONSTRAINT "component_failures_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_failures" ADD CONSTRAINT "component_failures_locationReportId_fkey" FOREIGN KEY ("locationReportId") REFERENCES "location_daily_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "tractor_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAllocation" ADD CONSTRAINT "SupplierAllocation_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "SupplierAllocationStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnhancedReasoning" ADD CONSTRAINT "EnhancedReasoning_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "SupplierAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationImpact" ADD CONSTRAINT "RecommendationImpact_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "SupplierAllocationStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
