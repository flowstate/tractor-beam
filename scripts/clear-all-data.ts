import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearAllData(preserveBaseEntities = false) {
  console.log('Clearing data from the database...')
  if (preserveBaseEntities) {
    console.log(
      'Base entities (components, suppliers, models, locations) will be preserved'
    )
  } else {
    console.log('ALL data including base entities will be cleared')
  }

  try {
    // Delete in order to avoid foreign key constraint issues
    await prisma.$transaction([
      // First delete recommendation data
      prisma.recommendationImpact.deleteMany(),
      prisma.enhancedReasoning.deleteMany(),
      prisma.supplierAllocation.deleteMany(),
      prisma.supplierAllocationStrategy.deleteMany(),

      // Delete visualization data
      prisma.modelDemandByLocation.deleteMany(),
      prisma.quarterlyDemandOutlook.deleteMany(),

      // Delete forecasts and analysis data
      prisma.supplierPerformanceForecast.deleteMany(),
      prisma.demandForecast.deleteMany(),
      prisma.supplyChainAnalysis.deleteMany(),

      // Delete operational data
      prisma.componentFailure.deleteMany(),
      prisma.delivery.deleteMany(),
      prisma.componentInventory.deleteMany(),
      prisma.dailyModelDemand.deleteMany(),
      prisma.locationDailyReport.deleteMany(),
      prisma.dailyReport.deleteMany(),

      // Delete relationship data (only if not preserving base entities)
      ...(preserveBaseEntities
        ? []
        : [
            prisma.locationModelPreference.deleteMany(),
            prisma.locationSupplier.deleteMany(),
            prisma.modelComponent.deleteMany(),
            prisma.supplierComponent.deleteMany(),
          ]),

      // Finally delete the base entities (only if not preserving them)
      ...(preserveBaseEntities
        ? []
        : [
            prisma.component.deleteMany(),
            prisma.supplier.deleteMany(),
            prisma.tractorModel.deleteMany(),
            prisma.location.deleteMany(),
          ]),
    ])

    if (preserveBaseEntities) {
      console.log('All data except base entities successfully cleared!')
    } else {
      console.log('All data successfully cleared!')
    }
  } catch (error) {
    console.error('Error clearing data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const preserveBaseEntities =
  args.includes('--preserve-base') || args.includes('-p')

clearAllData(preserveBaseEntities).catch((e) => {
  console.error(e)
  process.exit(1)
})
