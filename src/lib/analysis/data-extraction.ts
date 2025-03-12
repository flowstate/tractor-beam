import { PrismaClient } from '@prisma/client'
import {
  type HistoricalData,
  type RawHistoricalData,
  type SupplierQuarterData,
  type LocationQuarterData,
  type ComponentSupplierData,
  type TimeFeatures,
  type NormalizedMetrics,
  type DeliveryData,
  type ComponentFailureData,
  type LocationReportData,
} from '../types/analytics.types'
import { type TractorModelId, TRACTOR_MODEL_IDS } from '../types/types'

const prisma = new PrismaClient()

/**
 * Defines the date range for historical data
 */
interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * Extracts 3 years of historical data from the database and preprocesses it
 * for analysis. This includes grouping by relevant dimensions and extracting
 * time-based features.
 */
export async function extractHistoricalData(): Promise<HistoricalData> {
  try {
    // Extract raw data for the past 3 years
    const rawData = await queryHistoricalData()

    // Group data by different dimensions
    const supplierQuarterlyData = groupBySupplierAndQuarter(rawData)
    const locationQuarterlyData = groupByLocationAndQuarter(rawData)
    const componentSupplierData = groupByComponentAndSupplier(rawData)

    // Extract time-based features
    const timeFeatures = extractTimeFeatures(rawData)

    // Normalize metrics for consistent analysis
    const normalizedData = normalizeMetrics(rawData)

    // Transform models with proper typing
    const models = await fetchAndTransformModels()

    return {
      raw: rawData,
      bySupplierQuarter: supplierQuarterlyData,
      byLocationQuarter: locationQuarterlyData,
      byComponentSupplier: componentSupplierData,
      timeFeatures,
      normalized: normalizedData,
      models,
    }
  } catch (error) {
    console.error('Error extracting historical data:', error)
    throw error
  }
}

/**
 * Fetches and transforms tractor models from the database
 */
async function fetchAndTransformModels() {
  // Transform Prisma TractorModels to our app's TractorModel format
  const prismaModels = await prisma.tractorModel.findMany({
    include: {
      modelComponents: true,
    },
  })

  // Transform to our app model format with proper typing
  return prismaModels.map((model) => {
    // Validate that the ID is one we expect
    if (!TRACTOR_MODEL_IDS.includes(model.id as TractorModelId)) {
      throw new Error(`Invalid tractor model ID from database: ${model.id}`)
    }

    return {
      id: model.id as TractorModelId,
      marketSensitivity: model.marketSensitivity,
      inflationSensitivity: model.priceSensitivity,
      components: model.modelComponents.map((mc) => mc.componentId),
    }
  })
}

/**
 * Queries the database for 3 years of historical data across all relevant tables
 */
async function queryHistoricalData(): Promise<RawHistoricalData> {
  const dateRange = getFixedDateRange()

  // Query static data
  const [suppliers, components, locations] = await Promise.all([
    fetchSuppliers(),
    fetchComponents(),
    fetchLocations(),
  ])

  // Query dynamic data with date filters
  const [models, locationReportsRaw, deliveriesRaw, componentFailuresRaw] =
    await Promise.all([
      fetchModels(),
      fetchLocationReports(dateRange),
      fetchDeliveries(dateRange),
      fetchComponentFailures(dateRange),
    ])

  // Transform the data into our application format
  const locationReports = transformLocationReports(locationReportsRaw)
  const deliveries = transformDeliveries(deliveriesRaw)
  const componentFailures = transformComponentFailures(componentFailuresRaw)

  return {
    suppliers,
    components,
    models,
    locations,
    locationReports,
    deliveries,
    componentFailures,
    inventory: [], // This will be populated elsewhere if needed
  }
}

/**
 * Transforms location reports to match our application format
 */
function transformLocationReports(
  locationReportsRaw: Array<{
    id: string
    date: Date
    locationId: string
    marketTrendIndex: number
    inflationRate: number
    modelDemand: Array<{
      id: string
      modelId: string
      demandUnits: number
    }>
  }>
): LocationReportData[] {
  return locationReportsRaw.map((lr) => ({
    id: lr.id,
    date: lr.date,
    locationId: lr.locationId,
    marketTrendIndex: lr.marketTrendIndex,
    inflationRate: lr.inflationRate,
    modelDemand: lr.modelDemand.map((md) => ({
      id: md.id,
      modelId: md.modelId,
      demandUnits: md.demandUnits,
    })),
  }))
}

/**
 * Transforms deliveries to match our application format
 */
function transformDeliveries(
  deliveriesRaw: Array<{
    id: string
    supplierId: string
    componentId: string
    orderSize: number
    leadTimeVariance: number
    discount: number
    locationReport: {
      date: Date
      locationId: string
    }
  }>
): DeliveryData[] {
  return deliveriesRaw.map((d) => ({
    id: d.id,
    date: d.locationReport.date,
    supplierId: d.supplierId,
    componentId: d.componentId,
    locationId: d.locationReport.locationId,
    orderSize: d.orderSize,
    leadTimeVariance: d.leadTimeVariance,
    discount: d.discount,
  }))
}

/**
 * Transforms component failures to match our application format
 */
function transformComponentFailures(
  componentFailuresRaw: Array<{
    id: string
    supplierId: string
    componentId: string
    failureRate: number
    locationReport: {
      date: Date
      locationId: string
    }
  }>
): ComponentFailureData[] {
  return componentFailuresRaw.map((f) => ({
    id: f.id,
    date: f.locationReport.date,
    supplierId: f.supplierId,
    componentId: f.componentId,
    locationId: f.locationReport.locationId,
    failureRate: f.failureRate,
  }))
}

/**
 * Returns the fixed date range for the interview take-home
 */
function getFixedDateRange(): DateRange {
  return {
    startDate: new Date('2022-01-01'),
    endDate: new Date('2024-12-31'),
  }
}

/**
 * Fetches all suppliers from the database
 */
async function fetchSuppliers() {
  return await prisma.supplier.findMany()
}

/**
 * Fetches all components from the database
 */
async function fetchComponents() {
  return await prisma.component.findMany()
}

/**
 * Fetches all locations from the database
 */
async function fetchLocations() {
  return await prisma.location.findMany()
}

/**
 * Fetches and transforms tractor models with their components
 */
async function fetchModels() {
  // Query models with their components
  const prismaModels = await prisma.tractorModel.findMany({
    include: {
      modelComponents: true,
    },
  })

  // Transform models to include components array
  return prismaModels.map((model) => {
    // Validate that the ID is one we expect
    if (!TRACTOR_MODEL_IDS.includes(model.id as TractorModelId)) {
      throw new Error(`Invalid tractor model ID from database: ${model.id}`)
    }

    return {
      id: model.id as TractorModelId,
      marketSensitivity: model.marketSensitivity,
      inflationSensitivity: model.priceSensitivity,
      components: model.modelComponents.map((mc) => mc.componentId),
    }
  })
}

/**
 * Fetches location daily reports for the given date range
 */
async function fetchLocationReports(dateRange: DateRange) {
  return await prisma.locationDailyReport.findMany({
    where: {
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    },
    include: {
      modelDemand: true,
    },
    orderBy: {
      date: 'asc',
    },
  })
}

/**
 * Fetches deliveries for the given date range
 */
async function fetchDeliveries(dateRange: DateRange) {
  return await prisma.delivery.findMany({
    where: {
      locationReport: {
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    },
    include: {
      locationReport: {
        select: {
          date: true,
          locationId: true,
        },
      },
    },
  })
}

/**
 * Fetches component failures for the given date range
 */
async function fetchComponentFailures(dateRange: DateRange) {
  return await prisma.componentFailure.findMany({
    where: {
      locationReport: {
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    },
    include: {
      locationReport: {
        select: {
          date: true,
          locationId: true,
        },
      },
    },
  })
}

/**
 * Groups data by supplier and quarter to analyze seasonal performance patterns
 * This helps identify how each supplier's performance varies by season
 */
function groupBySupplierAndQuarter(
  data: RawHistoricalData
): SupplierQuarterData[] {
  const result: SupplierQuarterData[] = []
  const supplierQuarterMap = new Map<
    string,
    Map<
      string,
      {
        leadTimeVariances: number[]
        failureRates: number[]
        discounts: number[]
        deliveryCount: number
      }
    >
  >()

  // Initialize the map for all suppliers
  data.suppliers.forEach((supplier) => {
    supplierQuarterMap.set(supplier.id, new Map())
  })

  // Process deliveries for lead time variance and discounts
  data.deliveries.forEach((delivery) => {
    const year = delivery.date.getFullYear()
    const quarter = Math.floor(delivery.date.getMonth() / 3) + 1
    const key = `${year}-${quarter}`

    const supplierMap = supplierQuarterMap.get(delivery.supplierId)
    if (!supplierMap) return

    if (!supplierMap.has(key)) {
      supplierMap.set(key, {
        leadTimeVariances: [],
        failureRates: [],
        discounts: [],
        deliveryCount: 0,
      })
    }

    const quarterData = supplierMap.get(key)!
    quarterData.leadTimeVariances.push(delivery.leadTimeVariance)
    quarterData.discounts.push(delivery.discount)
    quarterData.deliveryCount++
  })

  // Process component failures for failure rates
  data.componentFailures.forEach((failure) => {
    const year = failure.date.getFullYear()
    const quarter = Math.floor(failure.date.getMonth() / 3) + 1
    const key = `${year}-${quarter}`

    const supplierMap = supplierQuarterMap.get(failure.supplierId)
    if (!supplierMap) return

    if (!supplierMap.has(key)) {
      supplierMap.set(key, {
        leadTimeVariances: [],
        failureRates: [],
        discounts: [],
        deliveryCount: 0,
      })
    }

    const quarterData = supplierMap.get(key)!
    quarterData.failureRates.push(failure.failureRate)
  })

  // Calculate averages and create result objects
  data.suppliers.forEach((supplier) => {
    const supplierMap = supplierQuarterMap.get(supplier.id)
    if (!supplierMap) return

    supplierMap.forEach((data, key) => {
      const [year, quarter] = key.split('-').map(Number)

      const avgLeadTimeVariance =
        data.leadTimeVariances.length > 0
          ? data.leadTimeVariances.reduce((sum, val) => sum + val, 0) /
            data.leadTimeVariances.length
          : 0

      const avgFailureRate =
        data.failureRates.length > 0
          ? data.failureRates.reduce((sum, val) => sum + val, 0) /
            data.failureRates.length
          : 0

      const avgDiscount =
        data.discounts.length > 0
          ? data.discounts.reduce((sum, val) => sum + val, 0) /
            data.discounts.length
          : 0

      // Normalize lead time variance by supplier's base lead time
      const normalizedLeadTimeVariance =
        supplier.baseLeadTime > 0
          ? avgLeadTimeVariance / supplier.baseLeadTime
          : avgLeadTimeVariance

      result.push({
        supplierId: supplier.id,
        year,
        quarter,
        avgLeadTimeVariance,
        normalizedLeadTimeVariance,
        avgFailureRate,
        normalizedFailureRate: avgFailureRate, // Will be normalized in normalizeMetrics
        avgDiscount,
        totalDeliveries: data.deliveryCount,
      })
    })
  })

  return result
}

/**
 * Groups data by location and quarter to analyze regional seasonal patterns
 * This helps identify location-specific demand fluctuations
 */
function groupByLocationAndQuarter(
  data: RawHistoricalData
): LocationQuarterData[] {
  const result: LocationQuarterData[] = []
  const locationQuarterMap = new Map<
    string,
    Map<
      string,
      {
        mtiValues: number[]
        inflationValues: number[]
        modelDemand: Record<string, number>
        totalDemand: number
      }
    >
  >()

  // Initialize the map for all locations
  data.locations.forEach((location) => {
    locationQuarterMap.set(location.id, new Map())
  })

  // Process location reports for MTI, inflation, and demand
  data.locationReports.forEach((report) => {
    const year = report.date.getFullYear()
    const quarter = Math.floor(report.date.getMonth() / 3) + 1
    const key = `${year}-${quarter}`

    const locationMap = locationQuarterMap.get(report.locationId)
    if (!locationMap) return

    if (!locationMap.has(key)) {
      locationMap.set(key, {
        mtiValues: [],
        inflationValues: [],
        modelDemand: {},
        totalDemand: 0,
      })
    }

    const quarterData = locationMap.get(key)!
    quarterData.mtiValues.push(report.marketTrendIndex)
    quarterData.inflationValues.push(report.inflationRate)

    // Process model demand
    report.modelDemand.forEach((demand) => {
      if (!quarterData.modelDemand[demand.modelId]) {
        quarterData.modelDemand[demand.modelId] = 0
      }
      quarterData.modelDemand[demand.modelId] += demand.demandUnits
      quarterData.totalDemand += demand.demandUnits
    })
  })

  // Calculate averages and create result objects
  data.locations.forEach((location) => {
    const locationMap = locationQuarterMap.get(location.id)
    if (!locationMap) return

    locationMap.forEach((data, key) => {
      const [year, quarter] = key.split('-').map(Number)

      const avgMTI =
        data.mtiValues.length > 0
          ? data.mtiValues.reduce((sum, val) => sum + val, 0) /
            data.mtiValues.length
          : 0

      const avgInflation =
        data.inflationValues.length > 0
          ? data.inflationValues.reduce((sum, val) => sum + val, 0) /
            data.inflationValues.length
          : 0

      result.push({
        locationId: location.id,
        year,
        quarter,
        avgMTI,
        avgInflation,
        modelDemand: data.modelDemand,
        totalDemand: data.totalDemand,
      })
    })
  })

  return result
}

/**
 * Groups data by component and supplier to analyze supplier-specific performance
 * for each component type
 */
function groupByComponentAndSupplier(
  data: RawHistoricalData
): ComponentSupplierData[] {
  const result: ComponentSupplierData[] = []
  const componentSupplierMap = new Map<
    string,
    Map<
      string,
      {
        failureRates: number[]
        leadTimeVariances: number[]
        discounts: number[]
      }
    >
  >()

  // Initialize the map for all components and suppliers
  data.components.forEach((component) => {
    const supplierMap = new Map<
      string,
      {
        failureRates: number[]
        leadTimeVariances: number[]
        discounts: number[]
      }
    >()

    data.suppliers.forEach((supplier) => {
      supplierMap.set(supplier.id, {
        failureRates: [],
        leadTimeVariances: [],
        discounts: [],
      })
    })

    componentSupplierMap.set(component.id, supplierMap)
  })

  // Process component failures
  data.componentFailures.forEach((failure) => {
    const componentMap = componentSupplierMap.get(failure.componentId)
    if (!componentMap) return

    const supplierData = componentMap.get(failure.supplierId)
    if (!supplierData) return

    supplierData.failureRates.push(failure.failureRate)
  })

  // Process deliveries for lead time variance and discounts
  data.deliveries.forEach((delivery) => {
    const componentMap = componentSupplierMap.get(delivery.componentId)
    if (!componentMap) return

    const supplierData = componentMap.get(delivery.supplierId)
    if (!supplierData) return

    supplierData.leadTimeVariances.push(delivery.leadTimeVariance)
    supplierData.discounts.push(delivery.discount)
  })

  // Calculate averages and create result objects
  data.components.forEach((component) => {
    const componentMap = componentSupplierMap.get(component.id)
    if (!componentMap) return

    data.suppliers.forEach((supplier) => {
      const supplierData = componentMap.get(supplier.id)
      if (!supplierData) return

      // Only create entries if we have data
      if (
        supplierData.failureRates.length === 0 &&
        supplierData.leadTimeVariances.length === 0
      ) {
        return
      }

      const avgFailureRate =
        supplierData.failureRates.length > 0
          ? supplierData.failureRates.reduce((sum, val) => sum + val, 0) /
            supplierData.failureRates.length
          : 0

      const avgLeadTimeVariance =
        supplierData.leadTimeVariances.length > 0
          ? supplierData.leadTimeVariances.reduce((sum, val) => sum + val, 0) /
            supplierData.leadTimeVariances.length
          : 0

      const avgDiscount =
        supplierData.discounts.length > 0
          ? supplierData.discounts.reduce((sum, val) => sum + val, 0) /
            supplierData.discounts.length
          : 0

      // Normalize metrics
      const normalizedFailureRate =
        component.baselineFailureRate > 0
          ? avgFailureRate / component.baselineFailureRate
          : avgFailureRate

      const normalizedLeadTimeVariance =
        supplier.baseLeadTime > 0
          ? avgLeadTimeVariance / supplier.baseLeadTime
          : avgLeadTimeVariance

      result.push({
        componentId: component.id,
        supplierId: supplier.id,
        avgFailureRate,
        normalizedFailureRate,
        avgLeadTimeVariance,
        normalizedLeadTimeVariance,
        avgDiscount,
      })
    })
  })

  return result
}

/**
 * Extracts time-based features (quarter, month, etc.) from date fields
 * These features help identify seasonal and cyclical patterns
 */
function extractTimeFeatures(data: RawHistoricalData): TimeFeatures {
  // Initialize quarterly and monthly aggregation objects
  const quarterlyMTI: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] }
  const quarterlyInflation: Record<number, number[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  }
  const quarterlyDemand: Record<number, number[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  }

  const monthlyMTI: Record<number, number[]> = {}
  const monthlyInflation: Record<number, number[]> = {}
  const monthlyDemand: Record<number, number[]> = {}

  // Initialize monthly arrays
  for (let i = 1; i <= 12; i++) {
    monthlyMTI[i] = []
    monthlyInflation[i] = []
    monthlyDemand[i] = []
  }

  // Process location reports for time-based features
  data.locationReports.forEach((report) => {
    const month = report.date.getMonth() + 1 // 1-12
    const quarter = Math.floor((month - 1) / 3) + 1 // 1-4

    // Add MTI and inflation to the appropriate arrays
    quarterlyMTI[quarter].push(report.marketTrendIndex)
    quarterlyInflation[quarter].push(report.inflationRate)

    monthlyMTI[month].push(report.marketTrendIndex)
    monthlyInflation[month].push(report.inflationRate)

    // Calculate total demand for this report
    const totalDemand = report.modelDemand.reduce(
      (sum, demand) => sum + demand.demandUnits,
      0
    )

    // Add demand to the appropriate arrays
    quarterlyDemand[quarter].push(totalDemand)
    monthlyDemand[month].push(totalDemand)
  })

  // Calculate averages
  const quarterlyAverages = {
    mti: {} as Record<number, number>,
    inflation: {} as Record<number, number>,
    demand: {} as Record<number, number>,
  }

  const monthlyAverages = {
    mti: {} as Record<number, number>,
    inflation: {} as Record<number, number>,
    demand: {} as Record<number, number>,
  }

  // Calculate quarterly averages
  for (let quarter = 1; quarter <= 4; quarter++) {
    quarterlyAverages.mti[quarter] =
      quarterlyMTI[quarter].length > 0
        ? quarterlyMTI[quarter].reduce((sum, val) => sum + val, 0) /
          quarterlyMTI[quarter].length
        : 0

    quarterlyAverages.inflation[quarter] =
      quarterlyInflation[quarter].length > 0
        ? quarterlyInflation[quarter].reduce((sum, val) => sum + val, 0) /
          quarterlyInflation[quarter].length
        : 0

    quarterlyAverages.demand[quarter] =
      quarterlyDemand[quarter].length > 0
        ? quarterlyDemand[quarter].reduce((sum, val) => sum + val, 0) /
          quarterlyDemand[quarter].length
        : 0
  }

  // Calculate monthly averages
  for (let month = 1; month <= 12; month++) {
    monthlyAverages.mti[month] =
      monthlyMTI[month].length > 0
        ? monthlyMTI[month].reduce((sum, val) => sum + val, 0) /
          monthlyMTI[month].length
        : 0

    monthlyAverages.inflation[month] =
      monthlyInflation[month].length > 0
        ? monthlyInflation[month].reduce((sum, val) => sum + val, 0) /
          monthlyInflation[month].length
        : 0

    monthlyAverages.demand[month] =
      monthlyDemand[month].length > 0
        ? monthlyDemand[month].reduce((sum, val) => sum + val, 0) /
          monthlyDemand[month].length
        : 0
  }

  return {
    quarterlyAverages,
    monthlyAverages,
  }
}

/**
 * Normalizes metrics for consistent analysis
 * - Lead time variance normalized by supplier's baseLeadTime
 * - Failure rates normalized by component's baselineFailureRate
 * - Demand normalized by location's typical volume
 */
function normalizeMetrics(data: RawHistoricalData): NormalizedMetrics {
  // Initialize result structure
  const normalizedLeadTime: Record<string, number[]> = {}
  const normalizedFailureRates: Record<string, Record<string, number[]>> = {}
  const normalizedDemand: Record<string, Record<string, number[]>> = {}

  // Initialize supplier maps
  data.suppliers.forEach((supplier) => {
    normalizedLeadTime[supplier.id] = []
    normalizedFailureRates[supplier.id] = {}

    // Initialize component maps for each supplier
    data.components.forEach((component) => {
      normalizedFailureRates[supplier.id][component.id] = []
    })
  })

  // Initialize location and model maps for demand
  data.locations.forEach((location) => {
    normalizedDemand[location.id] = {}

    data.models.forEach((model) => {
      normalizedDemand[location.id][model.id] = []
    })
  })

  // Normalize lead time variance
  data.deliveries.forEach((delivery) => {
    const supplier = data.suppliers.find((s) => s.id === delivery.supplierId)
    if (!supplier) return

    const normalizedValue =
      supplier.baseLeadTime > 0
        ? delivery.leadTimeVariance / supplier.baseLeadTime
        : delivery.leadTimeVariance

    normalizedLeadTime[delivery.supplierId].push(normalizedValue)
  })

  // Normalize failure rates
  data.componentFailures.forEach((failure) => {
    const component = data.components.find((c) => c.id === failure.componentId)
    if (!component) return

    const normalizedValue =
      component.baselineFailureRate > 0
        ? failure.failureRate / component.baselineFailureRate
        : failure.failureRate

    if (normalizedFailureRates[failure.supplierId]?.[failure.componentId]) {
      normalizedFailureRates[failure.supplierId][failure.componentId].push(
        normalizedValue
      )
    }
  })

  // Calculate average demand per location and model to use as baseline
  const avgDemand: Record<string, Record<string, number>> = {}

  data.locations.forEach((location) => {
    avgDemand[location.id] = {}

    data.models.forEach((model) => {
      // Get all demand entries for this location and model
      const demands = data.locationReports
        .filter((r) => r.locationId === location.id)
        .flatMap((r) => r.modelDemand.filter((d) => d.modelId === model.id))
        .map((d) => d.demandUnits)

      // Calculate average if we have data
      avgDemand[location.id][model.id] =
        demands.length > 0
          ? demands.reduce((sum, val) => sum + val, 0) / demands.length
          : 0
    })
  })

  // Normalize demand
  data.locationReports.forEach((report) => {
    report.modelDemand.forEach((demand) => {
      const baseline = avgDemand[report.locationId][demand.modelId]

      // Only normalize if we have a non-zero baseline
      const normalizedValue =
        baseline > 0 ? demand.demandUnits / baseline : demand.demandUnits

      normalizedDemand[report.locationId][demand.modelId].push(normalizedValue)
    })
  })

  return {
    leadTimeVariance: normalizedLeadTime,
    failureRates: normalizedFailureRates,
    demand: normalizedDemand,
  }
}
