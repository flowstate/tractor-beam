import { PrismaClient } from '@prisma/client'
import {
  generateTimeIndependentSeries,
  transformToDateIndexed,
} from '../src/lib/generate/time-independent'
import { createLocationSimulator } from '../src/lib/generate/day-simulator'
import { LOCATIONS } from '../src/lib/constants'
import type { LocationId } from '../src/lib/types/types'
import type {
  DailyLocationReport,
  DailyReport,
} from '../src/lib/types/historicals.types'
import {
  clearSupplierQualityData,
  writeSupplierQualityDataToFile,
} from '../src/lib/generate/supplier-quality'

const prisma = new PrismaClient()

interface GeneratedData {
  startDate: Date
  endDate: Date
  dailyReports: DailyReport[]
}

async function generateHistoricalData(): Promise<GeneratedData> {
  // Clear any existing supplier quality data before starting
  clearSupplierQualityData()

  const startDate = new Date('2022-01-01')
  const endDate = new Date('2024-12-31')
  console.log(
    'Generating data from:',
    startDate.toISOString().split('T')[0],
    'to:',
    endDate.toISOString().split('T')[0]
  )

  const seed = `production-seed-${startDate.toISOString()}`

  const config = {
    inflation: {
      baseRate: 0.025,
      mtiInfluence: 0.02,
      locationVolatility: 0.015,
      lagDays: 30,
    },
    demand: {
      marketMultiplier: 120,
      inflationMultiplier: 100,
      randomness: 0.15,
    },
  }

  console.log('Generating time-independent series...')
  const legacyTIS = generateTimeIndependentSeries(startDate, endDate, config)
  const tis = transformToDateIndexed(legacyTIS)
  // Remove entry for 2025-01-01 if it exists
  delete tis['2025-01-01']
  console.log('Time-independent series entries:', Object.keys(tis).length)

  // Write supplier quality data to file after generation
  console.log('Writing supplier quality data to file...')
  writeSupplierQualityDataToFile()

  const simulators = Object.keys(LOCATIONS).map((locationId) =>
    createLocationSimulator(
      locationId as LocationId,
      tis,
      `${seed}-${locationId}`
    )
  )

  console.log('Starting simulation...')
  const currentDay = new Date(startDate)
  const allDailyReports: DailyReport[] = []
  let dayCount = 0

  while (currentDay <= endDate) {
    try {
      const locationReports: DailyLocationReport[] = []

      for (const simulator of simulators) {
        const report = simulator.simulateDay()
        if (report) {
          validateDailyReport(report, currentDay)
          locationReports.push(report)
        }
      }

      currentDay.setDate(currentDay.getDate() + 1)
      dayCount++
      if (locationReports.length > 0) {
        allDailyReports.push({
          date: new Date(currentDay),
          locationReports,
        })
      } else {
        console.warn(`No reports collected for ${currentDay.toISOString()}`)
      }
    } catch (error) {
      console.error(`\nSimulation failed on day ${dayCount}`)
      console.error(`Date: ${currentDay.toISOString().split('T')[0]}`)
      console.error('Days simulated successfully:', dayCount)
      console.error('Reports collected:', allDailyReports.length)
      throw error
    }
  }

  console.log(`Total days simulated: ${dayCount}`)
  console.log(`Total days stored: ${allDailyReports.length}`)
  return {
    startDate,
    endDate,
    dailyReports: allDailyReports,
  }
}

function validateDailyReport(report: DailyLocationReport, date: Date) {
  // Market trend should be 0-1
  if (report.marketTrendIndex < 0 || report.marketTrendIndex > 1) {
    console.warn(
      `Invalid MTI: ${report.marketTrendIndex} for ${date.toISOString()}`
    )
  }

  // Inflation shouldn't be extreme
  if (Math.abs(report.inflationRate) > 0.1) {
    console.warn(
      `High inflation: ${report.inflationRate} for ${date.toISOString()}`
    )
  }

  // Check demand patterns
  const totalDemand = report.modelDemand.reduce(
    (sum, md) => sum + md.demandUnits,
    0
  )
  if (totalDemand === 0 || totalDemand > 5000) {
    console.warn(`Unusual demand: ${totalDemand} for ${date.toISOString()}`)
  }

  // Check inventory levels
  report.componentInventory.forEach((inv) => {
    if (inv.quantity < 100) {
      console.warn(
        `Low inventory: ${inv.quantity} for ${inv.componentId} at ${report.location}`
      )
    }
  })
}

function debugGeneratedData(data: GeneratedData) {
  console.log('\nAnalyzing generated data:')
  console.log(
    `Date range: ${data.startDate.toISOString().split('T')[0]} to ${data.endDate.toISOString().split('T')[0]}`
  )

  const expectedDays =
    Math.round(
      (data.endDate.getTime() - data.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  console.log(`Expected days: ${expectedDays}`)
  console.log(`Generated days: ${data.dailyReports.length}`)

  if (data.dailyReports.length > 0) {
    const firstDay = data.dailyReports[0]
    const lastDay = data.dailyReports[data.dailyReports.length - 1]

    console.log('\nFirst day details:')
    console.log(`Date: ${firstDay.date.toISOString().split('T')[0]}`)
    console.log(`Locations reported: ${firstDay.locationReports.length}`)
    console.log(
      `MTI: ${firstDay.locationReports[0].marketTrendIndex.toFixed(4)}`
    )

    console.log('\nLast day details:')
    console.log(`Date: ${lastDay.date.toISOString().split('T')[0]}`)
    console.log(`Locations reported: ${lastDay.locationReports.length}`)
    console.log(
      `MTI: ${lastDay.locationReports[0].marketTrendIndex.toFixed(4)}`
    )
  }
}

async function writeToDatabase(data: GeneratedData) {
  console.log('\nWriting to database...')
  const BATCH_SIZE = 100
  let writtenCount = 0

  for (let i = 0; i < data.dailyReports.length; i += BATCH_SIZE) {
    const batch = data.dailyReports.slice(i, i + BATCH_SIZE)
    console.log(
      `Writing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(
        data.dailyReports.length / BATCH_SIZE
      )}...`
    )

    try {
      await prisma.$transaction(
        batch.map((dailyReport) =>
          prisma.dailyReport.create({
            data: {
              date: dailyReport.date,
              locationReports: {
                create: dailyReport.locationReports.map((report) => ({
                  date: report.date,
                  locationId: report.location,
                  marketTrendIndex: report.marketTrendIndex,
                  inflationRate: report.inflationRate,
                  modelDemand: {
                    create: report.modelDemand.map((md) => ({
                      modelId: md.modelId,
                      demandUnits: md.demandUnits,
                    })),
                  },
                  inventory: {
                    create: report.componentInventory.map((ci) => ({
                      supplierId: ci.supplier,
                      componentId: ci.componentId,
                      quantity: ci.quantity,
                    })),
                  },
                  deliveries: {
                    create: report.deliveries.map((d) => ({
                      supplierId: d.supplier,
                      componentId: d.componentId,
                      orderSize: d.orderSize,
                      leadTimeVariance: d.leadTimeVariance,
                      discount: d.discount,
                    })),
                  },
                  failures: {
                    create: report.componentFailures.map((cf) => ({
                      supplierId: cf.supplier,
                      componentId: cf.componentId,
                      failureRate: cf.failureRate,
                    })),
                  },
                })),
              },
            },
          })
        )
      )
      writtenCount += batch.length
      console.log(
        `Progress: ${writtenCount}/${data.dailyReports.length} days written`
      )
    } catch (error) {
      console.error('Error writing batch:', error)
      console.error('First record in failed batch:', batch[0].date)
      throw error
    }
  }
}

async function main() {
  const data = await generateHistoricalData()
  debugGeneratedData(data)
  // Uncomment when ready to write to database
  await writeToDatabase(data)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
