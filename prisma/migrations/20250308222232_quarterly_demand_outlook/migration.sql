-- CreateTable
CREATE TABLE "quarterly_demand_outlooks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "quarters" JSONB NOT NULL,
    "historicalDemand" JSONB NOT NULL,
    "forecastDemand" JSONB NOT NULL,
    "upperBound" JSONB NOT NULL,
    "lowerBound" JSONB NOT NULL,
    "yoyGrowth" JSONB NOT NULL,
    "keyPatterns" JSONB NOT NULL,
    "predictionBasis" JSONB NOT NULL,
    "businessImplications" JSONB NOT NULL,
    "seasonalPeaks" JSONB NOT NULL,
    "confidenceInterval" DOUBLE PRECISION NOT NULL,
    "seasonalityStrength" DOUBLE PRECISION NOT NULL,
    "trendStrength" DOUBLE PRECISION NOT NULL,
    "rmse" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quarterly_demand_outlooks_pkey" PRIMARY KEY ("id")
);
