import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearForecastData() {
  try {
    console.log('Clearing all demand forecast records...')

    const deleteResult = await prisma.demandForecast.deleteMany({})

    console.log(`Successfully deleted ${deleteResult.count} forecast records`)
    return deleteResult
  } catch (error) {
    console.error('Error clearing forecast data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Execute if this file is run directly
if (process.argv[1].includes('clear-forecast-data.ts')) {
  clearForecastData()
    .then(() => {
      console.log('Forecast data clearing complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to clear forecast data:', error)
      process.exit(1)
    })
}

export { clearForecastData }
