import { PrismaClient } from '@prisma/client'
import {
  type AnalysisResults,
  type SupplierPerformanceAnalysis,
  type DemandPatternAnalysis,
  type ComponentRiskAnalysis,
  type InventoryParameterAnalysis,
} from '../types/analytics.types'

const prisma = new PrismaClient()

/**
 * Type guard for SupplierPerformanceAnalysis
 */
function isSupplierPerformanceAnalysis(
  value: unknown
): value is SupplierPerformanceAnalysis {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'leadTimeVariance' in obj &&
    'failureRates' in obj &&
    'seasonalPatterns' in obj &&
    'locationPerformance' in obj &&
    'qualityTrends' in obj &&
    'overallPerformance' in obj
  )
}

/**
 * Type guard for DemandPatternAnalysis
 */
function isDemandPatternAnalysis(
  value: unknown
): value is DemandPatternAnalysis {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'seasonalDemand' in obj &&
    'marketSensitivity' in obj &&
    'priceSensitivity' in obj &&
    'correlations' in obj
  )
}

/**
 * Type guard for ComponentRiskAnalysis
 */
function isComponentRiskAnalysis(
  value: unknown
): value is ComponentRiskAnalysis {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'failureRates' in obj &&
    'criticalThresholds' in obj &&
    'costImpact' in obj &&
    'seasonalVariations' in obj
  )
}

/**
 * Type guard for InventoryParameterAnalysis
 */
function isInventoryParameterAnalysis(
  value: unknown
): value is InventoryParameterAnalysis {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'optimalLevels' in obj &&
    'reorderPoints' in obj &&
    'safetyStock' in obj &&
    'inflationAdjustments' in obj &&
    'supplierAdjustments' in obj
  )
}

/**
 * Type guard for AnalysisResults
 */
function isAnalysisResults(value: unknown): value is AnalysisResults {
  const obj = value as Record<string, unknown>
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isSupplierPerformanceAnalysis(obj.supplierPerformance) &&
    isDemandPatternAnalysis(obj.demandPatterns) &&
    isComponentRiskAnalysis(obj.componentRisks) &&
    isInventoryParameterAnalysis(obj.inventoryParameters)
  )
}

/**
 * Saves the analysis results to the database
 */
export async function saveAnalysisResults(results: AnalysisResults) {
  try {
    // Debug the serialization process
    console.log('DEBUG: Serializing analysis results for storage')

    // Check if we're doing any transformation before storage
    const serializedData = JSON.stringify(results)
    console.log(`- Serialized data length: ${serializedData.length} characters`)

    // Check if qualityTrends is in the serialized data
    const hasQualityTrends = serializedData.includes('"qualityTrends"')
    console.log(`- Serialized data includes qualityTrends: ${hasQualityTrends}`)

    // Format the results for storage
    // This ensures we have a consistent structure and removes any circular references
    const formattedResults = {
      supplierPerformance: {
        leadTimeVariance: results.supplierPerformance.leadTimeVariance,
        failureRates: results.supplierPerformance.failureRates,
        seasonalPatterns: results.supplierPerformance.seasonalPatterns,
        locationPerformance: results.supplierPerformance.locationPerformance,
        qualityTrends: results.supplierPerformance.qualityTrends,
        overallPerformance: results.supplierPerformance.overallPerformance,
      },
      demandPatterns: {
        seasonalDemand: results.demandPatterns.seasonalDemand,
        marketSensitivity: results.demandPatterns.marketSensitivity,
        priceSensitivity: results.demandPatterns.priceSensitivity,
        correlations: results.demandPatterns.correlations,
      },
      componentRisks: {
        failureRates: results.componentRisks.failureRates,
        criticalThresholds: results.componentRisks.criticalThresholds,
        costImpact: results.componentRisks.costImpact,
        seasonalVariations: results.componentRisks.seasonalVariations,
      },
      inventoryParameters: {
        optimalLevels: results.inventoryParameters.optimalLevels,
        reorderPoints: results.inventoryParameters.reorderPoints,
        safetyStock: results.inventoryParameters.safetyStock,
        inflationAdjustments: results.inventoryParameters.inflationAdjustments,
        supplierAdjustments: results.inventoryParameters.supplierAdjustments,
      },
    }

    // Create a new analysis record in the database
    const analysis = await prisma.supplyChainAnalysis.create({
      data: {
        date: new Date(),
        version: '1.1',
        supplierPerformance: formattedResults.supplierPerformance,
        demandPatterns: formattedResults.demandPatterns,
        componentRisks: formattedResults.componentRisks,
        inventoryParameters: formattedResults.inventoryParameters,
      },
    })

    console.log(`Analysis results saved with ID: ${analysis.id}`)
    return analysis
  } catch (error) {
    console.error('Error saving analysis results:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Retrieves the most recent analysis results from the database
 */
export async function getLatestAnalysisResults(): Promise<AnalysisResults | null> {
  try {
    const latestAnalysis = await prisma.supplyChainAnalysis.findFirst({
      orderBy: {
        date: 'desc',
      },
    })

    if (!latestAnalysis) return null

    // Validate the structure matches our expected types
    if (!isAnalysisResults(latestAnalysis)) {
      throw new Error('Invalid analysis results structure')
    }

    return latestAnalysis
  } catch (error) {
    console.error('Error retrieving analysis results:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}
