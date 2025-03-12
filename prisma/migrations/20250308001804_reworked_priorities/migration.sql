/*
  Warnings:

  - Added the required column `impactLevel` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `opportunityScore` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urgency` to the `RecommendationImpact` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RecommendationImpact" ADD COLUMN     "impactLevel" TEXT NOT NULL,
ADD COLUMN     "opportunityScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "priority" TEXT NOT NULL,
ADD COLUMN     "urgency" TEXT NOT NULL;
