-- CreateTable
CREATE TABLE "model_demand_by_location" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "locationData" JSONB NOT NULL,
    "highlights" JSONB NOT NULL,

    CONSTRAINT "model_demand_by_location_pkey" PRIMARY KEY ("id")
);
