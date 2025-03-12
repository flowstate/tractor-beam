-- CreateTable
CREATE TABLE "quarterly_recommendation_cards" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "currentUnits" INTEGER NOT NULL,
    "currentCost" DOUBLE PRECISION NOT NULL,
    "recommendedUnits" INTEGER NOT NULL,
    "recommendedCost" DOUBLE PRECISION NOT NULL,
    "unitDelta" INTEGER NOT NULL,
    "costDelta" DOUBLE PRECISION NOT NULL,
    "urgency" TEXT NOT NULL,
    "impactLevel" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "opportunityScore" DOUBLE PRECISION NOT NULL,
    "strategy" JSONB NOT NULL,

    CONSTRAINT "quarterly_recommendation_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quarterly_recommendation_cards_locationId_componentId_idx" ON "quarterly_recommendation_cards"("locationId", "componentId");

-- CreateIndex
CREATE INDEX "quarterly_recommendation_cards_quarter_year_idx" ON "quarterly_recommendation_cards"("quarter", "year");

-- CreateIndex
CREATE INDEX "quarterly_recommendation_cards_priority_idx" ON "quarterly_recommendation_cards"("priority");

-- CreateIndex
CREATE INDEX "quarterly_recommendation_cards_opportunityScore_idx" ON "quarterly_recommendation_cards"("opportunityScore");
