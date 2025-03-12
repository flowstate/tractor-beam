import { getLatestSupplierPerformanceForecast } from './supplier-performance-prediction'
import { getLatestAnalysisResults } from '../analysis/storage'
import { SUPPLIER_IDS, type SupplierId } from '../types/types'
import fs from 'fs'
import path from 'path'

interface QualityForecastPoint {
  date: string
  value: number
  lower: number
  upper: number
}

interface ValidationResult {
  analysisDirection: string
  analysisMagnitude: number
  predictionDirection: string
  predictionMagnitude: number
  match: boolean
  qualityStartValue: number
  qualityEndValue: number
  predictionStartValue: number
  predictionEndValue: number
}

/**
 * Determines the direction of a prediction based on start and end values
 */
function determinePredictionDirection(
  startValue: number,
  endValue: number
): string {
  const delta = endValue - startValue

  if (delta > 0.01) {
    return 'improving'
  }

  if (delta < -0.01) {
    return 'declining'
  }

  return 'stable'
}

/**
 * Validates predictions for a single supplier
 */
async function validateSupplierPrediction(
  supplierId: SupplierId
): Promise<ValidationResult | null> {
  // Get the analysis trend data
  const analysisResults = await getLatestAnalysisResults()
  if (!analysisResults?.supplierPerformance.qualityTrends) {
    console.log(`No quality trend data available for analysis`)
    return null
  }

  const qualityTrend =
    analysisResults.supplierPerformance.qualityTrends.bySupplierId[supplierId]
  if (!qualityTrend) {
    console.log(`No quality trend data for ${supplierId}`)
    return null
  }

  // Get the prediction data
  const forecast = await getLatestSupplierPerformanceForecast(supplierId)
  if (!forecast) {
    console.log(`No forecast found for ${supplierId}`)
    return null
  }

  // Get the first and last values from the quality forecast
  const qualityForecast = forecast.qualityForecast as QualityForecastPoint[]
  if (!qualityForecast || qualityForecast.length === 0) {
    console.log(`Empty quality forecast for ${supplierId}`)
    return null
  }

  const firstPrediction = qualityForecast[0]
  const lastPrediction = qualityForecast[qualityForecast.length - 1]

  // Calculate the prediction trend
  const predictionStartValue = firstPrediction.value
  const predictionEndValue = lastPrediction.value
  const predictionDelta = predictionEndValue - predictionStartValue

  // Get the analysis trend values
  const analysisDirection = qualityTrend.direction
  const analysisMagnitude = qualityTrend.magnitude

  // Determine prediction direction
  const predictionDirection = determinePredictionDirection(
    predictionStartValue,
    predictionEndValue
  )

  // Calculate prediction magnitude (normalized to be comparable)
  const predictionMagnitude = Math.abs(predictionDelta) * 10

  // Check if the directions match
  const match = predictionDirection === analysisDirection

  // Get the first and last values from the combined quality index
  const combinedQuality = qualityTrend.combinedQuality
  const combinedQualityValues = Object.values(combinedQuality)
  const qualityStartValue = combinedQualityValues[0]
  const qualityEndValue =
    combinedQualityValues[combinedQualityValues.length - 1]

  return {
    analysisDirection,
    analysisMagnitude,
    predictionDirection,
    predictionMagnitude,
    match,
    qualityStartValue,
    qualityEndValue,
    predictionStartValue,
    predictionEndValue,
  }
}

/**
 * Saves validation results to a JSON file
 */
function saveValidationResults(
  validationResults: Record<string, ValidationResult>
): void {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const filePath = path.join(dataDir, 'supplier_prediction_validation.json')
  fs.writeFileSync(filePath, JSON.stringify(validationResults, null, 2))

  console.log(`Validation results saved to ${filePath}`)
}

/**
 * Prints a summary of validation results
 */
function printValidationSummary(
  validationResults: Record<string, ValidationResult>
): void {
  const matches = Object.values(validationResults).filter((r) => r.match).length
  const total = Object.keys(validationResults).length

  console.log(
    `Validation summary: ${matches}/${total} predictions match analysis trends (${(
      (matches / total) *
      100
    ).toFixed(1)}%)`
  )
}

/**
 * Simple utility to validate supplier performance predictions against analysis trends
 * Outputs a JSON file with validation results
 */
export async function validateSupplierPredictions(): Promise<void> {
  console.log('Validating supplier performance predictions...')

  const validationResults: Record<string, ValidationResult> = {}

  // For each supplier, compare analysis trends with prediction trends
  for (const supplierId of SUPPLIER_IDS) {
    const result = await validateSupplierPrediction(supplierId)

    if (result) {
      validationResults[supplierId] = result

      console.log(
        `${supplierId}: Analysis trend: ${result.analysisDirection} (${result.analysisMagnitude.toFixed(4)}), ` +
          `Prediction trend: ${result.predictionDirection} (${result.predictionMagnitude.toFixed(4)}) - ` +
          `${result.match ? 'MATCH' : 'MISMATCH'}`
      )
    }
  }

  // Save the validation results to a file
  saveValidationResults(validationResults)

  // Print a summary
  printValidationSummary(validationResults)
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`

// If this script is run directly
if (isMainModule) {
  validateSupplierPredictions()
    .then(() => {
      console.log('Validation complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error during validation:', error)
      process.exit(1)
    })
}
