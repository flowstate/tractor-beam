import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing historical data...')

  // Delete in reverse order of dependencies
  console.log('Deleting model demand records...')
  await prisma.dailyModelDemand.deleteMany()

  console.log('Deleting component inventory records...')
  await prisma.componentInventory.deleteMany()

  console.log('Deleting delivery records...')
  await prisma.delivery.deleteMany()

  console.log('Deleting component failure records...')
  await prisma.componentFailure.deleteMany()

  console.log('Deleting location daily reports...')
  await prisma.locationDailyReport.deleteMany()

  console.log('Deleting daily reports...')
  await prisma.dailyReport.deleteMany()

  console.log('All historical data cleared!')
}

main()
  .catch(console.error)
  .finally(() => void prisma.$disconnect())
