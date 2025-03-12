import { PrismaClient } from '@prisma/client'
import { extractHistoricalData } from './data-extraction'
import { analyzeSupplierPerformance } from './supplier-performance'
import { analyzeDemandPatterns } from './demand-patterns'
import { analyzeComponentRisks } from './component-risks'
import { calculateInventoryParameters } from './inventory-parameters'
import { saveAnalysisResults } from './storage'
import { verifyAnalysisResults, logAnalysisSummary } from './verification'
import { type AnalysisResults } from '../types/analytics.types'

/**
 * Deletes existing analysis records
 */
async function deleteExistingAnalysisRecords(): Promise<number> {
  const prisma = new PrismaClient()

  try {
    console.log('Deleting existing analysis records...')
    const deletedRecords = await prisma.supplyChainAnalysis.deleteMany({})
    console.log(`Deleted ${deletedRecords.count} existing analysis records`)
    return deletedRecords.count
  } catch (error) {
    console.error('Error deleting existing analysis records:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Extracts data and runs all analysis modules
 */
async function executeAnalysisModules(): Promise<AnalysisResults> {
  // Step 1: Extract and preprocess historical data
  console.log('Extracting historical data...')
  const historicalData = await extractHistoricalData()
  console.log('Data extraction complete.')

  // Step 2: Run the various analysis modules
  console.log('Analyzing supplier performance...')
  const supplierPerformance = analyzeSupplierPerformance(historicalData)

  console.log('Analyzing demand patterns...')
  const demandPatterns = await analyzeDemandPatterns(historicalData)

  console.log('Analyzing component risks...')
  const componentRisks = await analyzeComponentRisks(historicalData)

  console.log('Calculating inventory parameters...')
  const inventoryParameters = await calculateInventoryParameters(
    supplierPerformance,
    demandPatterns,
    componentRisks,
    historicalData
  )

  // Combine all results
  return {
    supplierPerformance,
    demandPatterns,
    componentRisks,
    inventoryParameters,
  }
}

/**
 * Handles verification and warnings for analysis results
 */
function handleVerification(results: AnalysisResults): void {
  console.log('Verifying analysis results...')
  const verification = verifyAnalysisResults(results)

  if (verification.warnings.length > 0) {
    console.warn('Analysis verification produced warnings:')
    verification.warnings.forEach((warning) => console.warn(`- ${warning}`))
  }
}

/**
 * Main function to run the entire supply chain analysis pipeline
 */
async function runSupplyChainAnalysis() {
  console.log('Starting supply chain analysis...')

  try {
    // First, delete existing analysis records
    await deleteExistingAnalysisRecords()

    // Run all analysis modules
    const results = await executeAnalysisModules()

    // Verify the results
    handleVerification(results)

    // Log a summary of the results
    logAnalysisSummary(results)

    // Save the results to the database
    console.log('Saving analysis results...')
    const savedAnalysis = await saveAnalysisResults(results)

    console.log('Analysis complete!')
    console.log(`Results saved with ID: ${savedAnalysis.id}`)

    return savedAnalysis
  } catch (error) {
    console.error('Error running supply chain analysis:', error)
    throw error
  }
}

// If this script is run directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  runSupplyChainAnalysis()
    .then(() => {
      console.log('Analysis script completed successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Analysis script failed:', error)
      process.exit(1)
    })
}

// Export for use in other modules
export { runSupplyChainAnalysis }
