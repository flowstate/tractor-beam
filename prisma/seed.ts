import { PrismaClient } from '@prisma/client'
import {
  COMPONENTS,
  TRACTOR_MODELS,
  SUPPLIERS,
  LOCATIONS,
  SUPPLIER_QUALITY_CONFIGS,
} from '../src/lib/constants'
import type { SupplierId } from '../src/lib/types/types'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.$transaction([
    prisma.componentFailure.deleteMany(),
    prisma.delivery.deleteMany(),
    prisma.componentInventory.deleteMany(),
    prisma.dailyModelDemand.deleteMany(),
    prisma.locationDailyReport.deleteMany(),
    prisma.dailyReport.deleteMany(),
    prisma.locationModelPreference.deleteMany(),
    prisma.locationSupplier.deleteMany(),
    prisma.modelComponent.deleteMany(),
    prisma.supplierComponent.deleteMany(),
    prisma.component.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.tractorModel.deleteMany(),
    prisma.location.deleteMany(),
  ])

  // Seed Components
  await Promise.all(
    Object.values(COMPONENTS).map((component) =>
      prisma.component.create({
        data: {
          id: component.id,
          name: component.name,
          baselineFailureRate: component.baselineFailureRate,
        },
      })
    )
  )

  // Seed Suppliers with their quality configs and components
  await Promise.all(
    Object.entries(SUPPLIERS).map(([id, supplier]) => {
      const supplierId = id as SupplierId
      return prisma.supplier.create({
        data: {
          id: supplier.id,
          baseLeadTime: supplier.baseLeadTime,
          qualityVolatility:
            SUPPLIER_QUALITY_CONFIGS[supplierId].qualityVolatility,
          seasonalStrength:
            SUPPLIER_QUALITY_CONFIGS[supplierId].seasonalStrength,
          qualityMomentum: SUPPLIER_QUALITY_CONFIGS[supplierId].qualityMomentum,
          supplierComponents: {
            create: supplier.components.map((comp) => ({
              componentId: comp.componentId,
              pricePerUnit: comp.pricePerUnit,
            })),
          },
        },
      })
    })
  )

  // Seed Tractor Models with their components
  await Promise.all(
    Object.values(TRACTOR_MODELS).map((model) =>
      prisma.tractorModel.create({
        data: {
          id: model.id,
          marketSensitivity: model.marketSensitivity,
          priceSensitivity: model.inflationSensitivity,
          modelComponents: {
            create: model.components.map((componentId) => ({
              componentId,
            })),
          },
        },
      })
    )
  )

  // Seed Locations with their suppliers and model preferences
  await Promise.all(
    Object.values(LOCATIONS).map((location) =>
      prisma.location.create({
        data: {
          id: location.code,
          suppliers: {
            create: location.suppliers.map((supplierId) => ({
              supplierId,
            })),
          },
          modelPreferences: {
            create: Object.entries(location.modelPreferences).map(
              ([modelId, preference]) => ({
                modelId,
                preference,
              })
            ),
          },
        },
      })
    )
  )

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
