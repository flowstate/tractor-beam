import { generateAndStoreSupplierPerformanceForecasts } from './supplier-performance-prediction'

interface ForecastOptions {
  clearExisting: boolean
  futurePeriods: number
}

/**
 * Parses command line arguments to extract forecast options
 */
function parseCommandLineArgs(): ForecastOptions {
  const args = process.argv.slice(2)

  const options: ForecastOptions = {
    clearExisting: args.includes('--clear'),
    futurePeriods: 365, // Default to a year projection
  }

  // Check for futurePeriods argument
  const periodsArg = args.find((arg) => arg.startsWith('--periods='))
  if (periodsArg) {
    const parsedValue = parseInt(periodsArg.split('=')[1], 10)
    if (!isNaN(parsedValue) && parsedValue > 0) {
      options.futurePeriods = parsedValue
    } else {
      console.warn(
        `Invalid periods value: ${periodsArg}. Using default of 365 days.`
      )
    }
  }

  return options
}

// If this script is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseCommandLineArgs()

  console.log(`Starting supplier performance forecast with options:`)
  console.log(`- Clear existing: ${options.clearExisting}`)
  console.log(`- Future periods: ${options.futurePeriods} days`)

  generateAndStoreSupplierPerformanceForecasts(options)
    .then((results) => {
      console.log('Script completed successfully')
      console.log(results)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}
