import { PrismaClient } from '@prisma/client'
import { SUPPLIERS, LOCATIONS } from '../src/lib/constants'
import type {
  SupplierId,
  ComponentId,
  LocationId,
} from '../src/lib/types/types'

const prisma = new PrismaClient()

async function checkSuppliers() {
  // Component and location to check
  const componentId = 'ENGINE-B' as ComponentId
  const locationId = 'west' as LocationId

  console.log(
    `Checking suppliers for component ${componentId} at location ${locationId}...`
  )

  // 1. Check what's in the constants
  console.log('\n=== FROM CONSTANTS ===')
  const locationSuppliers = LOCATIONS[locationId].suppliers
  console.log(
    `Location suppliers in constants: ${locationSuppliers.join(', ')}`
  )

  const relevantSuppliers = locationSuppliers.filter((supplierId) =>
    SUPPLIERS[supplierId]?.components.some((c) => c.componentId === componentId)
  )

  console.log(
    `Suppliers for ${componentId} in constants: ${relevantSuppliers.join(', ') || 'NONE'}`
  )

  // 2. Check what's in the database
  console.log('\n=== FROM DATABASE ===')
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      suppliers: {
        select: {
          supplier: {
            select: {
              id: true,
              supplierComponents: {
                where: { componentId },
                select: { componentId: true },
              },
            },
          },
        },
      },
    },
  })

  if (!location) {
    console.log(`Location ${locationId} not found in database!`)
    return
  }

  const dbSuppliers = location.suppliers.map((s) => s.supplier.id)
  console.log(`Location suppliers in database: ${dbSuppliers.join(', ')}`)

  const dbRelevantSuppliers = location.suppliers
    .filter((s) => s.supplier.supplierComponents.length > 0)
    .map((s) => s.supplier.id)

  console.log(
    `Suppliers for ${componentId} in database: ${dbRelevantSuppliers.join(', ') || 'NONE'}`
  )

  // 3. Check the actual query used in the test
  console.log('\n=== USING TEST QUERY ===')
  const testLocation = await prisma.location.findUnique({
    where: { id: locationId },
    select: { suppliers: true },
  })

  if (!testLocation) {
    console.log(`Location ${locationId} not found using test query!`)
    return
  }

  const testLocationSuppliers =
    testLocation.suppliers as unknown as SupplierId[]
  console.log(
    `Location suppliers using test query: ${testLocationSuppliers.join(', ')}`
  )

  const testRelevantSuppliers = testLocationSuppliers.filter((supplierId) =>
    SUPPLIERS[supplierId]?.components.some((c) => c.componentId === componentId)
  )

  console.log(
    `Suppliers for ${componentId} using test query: ${testRelevantSuppliers.join(', ') || 'NONE'}`
  )
}

checkSuppliers()
  .catch((e) => {
    console.error('Error:', e)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
