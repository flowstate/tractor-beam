/*
  Warnings:

  - Added the required column `q1CostDelta` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q1CurrentCost` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q1CurrentUnits` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q1RecommendedCost` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q1RecommendedUnits` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q1UnitDelta` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q2CostDelta` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q2CurrentCost` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q2CurrentUnits` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q2RecommendedCost` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q2RecommendedUnits` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `q2UnitDelta` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RecommendationImpact" ADD COLUMN     "q1CostDelta" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "q1CurrentCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "q1CurrentUnits" INTEGER NOT NULL,
ADD COLUMN     "q1RecommendedCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "q1RecommendedUnits" INTEGER NOT NULL,
ADD COLUMN     "q1UnitDelta" INTEGER NOT NULL,
ADD COLUMN     "q2CostDelta" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "q2CurrentCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "q2CurrentUnits" INTEGER NOT NULL,
ADD COLUMN     "q2RecommendedCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "q2RecommendedUnits" INTEGER NOT NULL,
ADD COLUMN     "q2UnitDelta" INTEGER NOT NULL;
