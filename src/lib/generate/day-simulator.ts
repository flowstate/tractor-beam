import type {
  DailyLocationReport,
  Delivery,
  ComponentInventory,
  ComponentFailure,
} from '../types/historicals.types'
import type { LocationId, SupplierId, ComponentId } from '../types/types'
import {
  type TimeIndependentSeries,
  type DailyLocationData,
  dateToKey,
} from './time-independent'
import Rand from 'rand-seed'
import { COMPONENTS, LOCATIONS, SUPPLIERS, TRACTOR_MODELS } from '../constants'
import { supplierHelpers } from '../helpers/supplier-helpers'
import { addDays, differenceInDays } from 'date-fns'
import { getTargetInventoryLevel } from '../constants'

export interface OrderInTransit {
  supplier: SupplierId
  componentId: ComponentId
  quantity: number
  arrivalDate: Date
  orderDate: Date
}

export interface ComponentUsage {
  supplier: SupplierId
  componentId: ComponentId
  quantity: number
}

// Internal state for a location
export interface LocationState {
  inventory: ComponentInventory[]
  ordersInTransit: OrderInTransit[]
}

export interface ProcessDemandResult {
  ordersGenerated: OrderInTransit[]
  componentsUsed: ComponentUsage[]
}

export interface LocationSimulator {
  currentDate: Date
  locationState: LocationState
  locationId: LocationId
  simulationFinished: boolean
  processDeliveries(): Delivery[]
  processModelDemand(): ProcessDemandResult
  generateFailures(componentsUsed: ComponentUsage[]): ComponentFailure[]
  simulateDay(): DailyLocationReport | null
}

export const createLocationSimulator = (
  locationId: LocationId,
  timeSeries: TimeIndependentSeries,
  seed: string,
  initialState: LocationState | null = null
): LocationSimulator => {
  const rng = new Rand(seed)
  const simulator = {
    currentDate: new Date(Object.keys(timeSeries)[0]),
    locationState: initialState ?? initializeLocationStates()[locationId],
    locationId,
    simulationFinished: false,
  }

  const incrementDay = () => {
    const nextDate = new Date(simulator.currentDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateKey = dateToKey(nextDate)

    if (!timeSeries[nextDateKey]) {
      simulator.simulationFinished = true
      return
    }
    simulator.currentDate = nextDate
  }

  const takeFromSupplier = (
    supplier: ComponentInventory,
    quantity: number
  ): OrderInTransit => {
    // Verify we have enough inventory
    if (supplier.quantity - quantity < 1) {
      console.error('\nInventory depletion debug:')
      console.error(
        `Date: ${simulator.currentDate.toISOString().split('T')[0]}`
      )
      console.error(`Location: ${locationId}`)
      console.error(`Supplier: ${supplier.supplier}`)
      console.error(`Component: ${supplier.componentId}`)
      console.error(`Current inventory: ${supplier.quantity}`)
      console.error(`Requested quantity: ${quantity}`)

      // Get today's demand for context
      const todayData = getLocationData()
      console.error("\nToday's demand:")
      todayData.modelDemand.forEach((md) => {
        console.error(`Model ${md.modelId}: ${md.demand} units`)
      })

      // Show all inventory levels for this component
      console.error('\nAll inventory for this component:')
      simulator.locationState.inventory
        .filter((inv) => inv.componentId === supplier.componentId)
        .forEach((inv) => {
          console.error(`${inv.supplier}: ${inv.quantity} units`)
        })

      // Show pending orders
      console.error('\nPending orders for this component:')
      simulator.locationState.ordersInTransit
        .filter((order) => order.componentId === supplier.componentId)
        .forEach((order) => {
          console.error(
            `${order.supplier}: ${order.quantity} units, arriving ${order.arrivalDate.toISOString().split('T')[0]}`
          )
        })

      throw new Error(
        `Attempt to deplete inventory for supplier ${supplier.supplier} ` +
          `component ${supplier.componentId} in location ${locationId}. ` +
          `INVENTORY_START may need to be increased.`
      )
    }

    // Reduce inventory
    supplier.quantity -= quantity

    const baseLeadTime = supplierHelpers.getBaseLeadTime(supplier.supplier)
    const supplierQuality = getLocationData().supplierQuality[supplier.supplier]

    if (!supplierQuality) {
      throw new Error(
        `No supplier quality data found for ${supplier.supplier} in location ${locationId}. ` +
          `This indicates a data generation issue.`
      )
    }

    if (rng.next() < 0.3) {
      // Get quality index instead of efficiency
      const qualityIndex = supplierQuality.qualityIndex

      // Normalize quality to 0-1 range for probability calculations
      // Quality index ranges from 0.7 to 1.3
      const normalizedQuality = (qualityIndex - 0.7) / 0.6 // 0.7 -> 0, 1.3 -> 1

      // Calculate early/late probability based on quality
      const earlyThreshold = 0.05 + normalizedQuality * 0.6 // ranges from 0.05 to 0.65
      const isEarly = rng.next() < earlyThreshold

      // Calculate severity of variance based on quality
      const severityRoll = rng.next()
      let dayAdjustment: number

      if (isEarly) {
        // Early delivery: -1 or -2 days
        // Better quality = more likely to be 2 days early
        dayAdjustment = severityRoll < normalizedQuality * 1.2 ? -2 : -1
      } else {
        // Late delivery: +1 to +7 days (increased from +5)
        // Worse quality = more likely to be very late
        const latenessFactor = Math.pow(1 - normalizedQuality, 1.5) // Exponential relationship
        if (severityRoll < latenessFactor * 0.7) {
          dayAdjustment = 7 // Very late (increased from 5)
        } else if (severityRoll < latenessFactor * 1.2) {
          dayAdjustment = 5 // Increased from 3
        } else if (severityRoll < latenessFactor * 1.8) {
          dayAdjustment = 3 // Increased from 2
        } else {
          dayAdjustment = 2 // Increased from 1
        }
      }

      // Apply the adjustment to the base lead time
      const actualLeadTime = Math.max(1, baseLeadTime + dayAdjustment)

      const orderDate = new Date(simulator.currentDate)
      return {
        supplier: supplier.supplier,
        componentId: supplier.componentId,
        quantity,
        orderDate,
        arrivalDate: addDays(orderDate, actualLeadTime),
      }
    }

    // Standard delivery (70% of the time)
    const actualLeadTime = baseLeadTime

    const orderDate = new Date(simulator.currentDate)
    return {
      supplier: supplier.supplier,
      componentId: supplier.componentId,
      quantity,
      orderDate,
      arrivalDate: addDays(orderDate, actualLeadTime),
    }
  }

  const getToday = () => {
    const dateKey = dateToKey(simulator.currentDate)
    const todayData = timeSeries[dateKey]

    if (!todayData) {
      throw new Error(
        `No data found for date ${dateKey}. ` +
          `This should have been caught by incrementDay().`
      )
    }

    return todayData
  }

  const getLocationData = (): DailyLocationData => {
    return getToday().locationData[locationId]
  }

  const processModelDemand = (): ProcessDemandResult => {
    const result: ProcessDemandResult = {
      ordersGenerated: [],
      componentsUsed: [],
    }

    const todayData = getLocationData()

    // Process each model's demand for today
    todayData.modelDemand.forEach(({ modelId, demand }) => {
      const model = TRACTOR_MODELS[modelId]

      model.components.forEach((componentId) => {
        let remainingDemand = demand
        const availableInventory = simulator.locationState.inventory
          .filter((inv) => inv.componentId === componentId)
          .slice()

        while (remainingDemand > 0) {
          if (availableInventory.length === 0) {
            throw new Error(
              `Insufficient inventory for component ${componentId} in location ${locationId}. ` +
                `Need ${remainingDemand} more units. INVENTORY_START may need to be increased.`
            )
          }

          if (availableInventory.length === 1) {
            const order = takeFromSupplier(
              availableInventory[0],
              remainingDemand
            )
            result.ordersGenerated.push(order)
            result.componentsUsed.push({
              supplier: order.supplier,
              componentId: order.componentId,
              quantity: order.quantity,
            })
            remainingDemand = 0
            continue
          }

          const randomIndex = Math.floor(rng.next() * availableInventory.length)
          const selectedInventory = availableInventory[randomIndex]
          const useQuantity = Math.floor(rng.next() * remainingDemand) + 1

          const order = takeFromSupplier(selectedInventory, useQuantity)
          result.ordersGenerated.push(order)
          result.componentsUsed.push({
            supplier: order.supplier,
            componentId: order.componentId,
            quantity: order.quantity,
          })

          remainingDemand -= useQuantity
          availableInventory.splice(randomIndex, 1)
        }
      })
    })

    // Add generated orders to ordersInTransit
    result.ordersGenerated.forEach((order) => {
      simulator.locationState.ordersInTransit.push(order)
    })

    return result
  }

  const processDeliveries = (): Delivery[] => {
    const deliveries: Delivery[] = []

    for (
      let i = simulator.locationState.ordersInTransit.length - 1;
      i >= 0;
      i--
    ) {
      const order = simulator.locationState.ordersInTransit[i]
      if (order.arrivalDate.getTime() !== simulator.currentDate.getTime()) {
        continue
      }

      const inventory = simulator.locationState.inventory.find(
        (inv) =>
          inv.supplier === order.supplier &&
          inv.componentId === order.componentId
      )!

      inventory.quantity += order.quantity

      // Calculate actual lead time vs expected
      const baseLeadTime = supplierHelpers.getBaseLeadTime(order.supplier)
      const actualLeadTime = differenceInDays(
        order.arrivalDate,
        order.orderDate
      )
      const leadTimeVariance = actualLeadTime - baseLeadTime

      deliveries.push({
        supplier: order.supplier,
        componentId: order.componentId,
        orderSize: order.quantity,
        leadTimeVariance, // Renamed property
        discount: 0,
      })

      simulator.locationState.ordersInTransit.splice(i, 1)
    }

    return deliveries
  }

  const generateFailures = (
    componentsUsed: ComponentUsage[]
  ): ComponentFailure[] => {
    const todayData = getLocationData()
    const failures: ComponentFailure[] = []

    componentsUsed.forEach(({ supplier, componentId }) => {
      const supplierQuality =
        todayData.supplierQuality[supplier]?.qualityIndex ?? 1
      const baseFailureRate = COMPONENTS[componentId].baselineFailureRate

      // Make failure rate exponentially worse as quality decreases
      // This creates a much more dramatic effect for low quality suppliers
      const qualityImpact = Math.pow(2.0, (1 - supplierQuality) * 10)
      const adjustedFailureRate = baseFailureRate * qualityImpact

      // Always report the failure rate for this component-supplier combination
      failures.push({
        supplier,
        componentId,
        failureRate: adjustedFailureRate,
      })
    })

    return failures
  }

  const simulateDay = (): DailyLocationReport | null => {
    if (simulator.simulationFinished) {
      return null
    }

    const reportDate = new Date(simulator.currentDate)
    const todayData = getToday()
    const locationData = getLocationData()

    const deliveries = processDeliveries()
    const { componentsUsed } = processModelDemand()
    const failures = generateFailures(componentsUsed)

    // Increment the day BEFORE creating the report
    incrementDay()

    return {
      date: reportDate,
      location: locationId,
      marketTrendIndex: todayData.marketTrend,
      inflationRate: locationData.inflationRate,
      modelDemand: locationData.modelDemand.map((md) => ({
        modelId: md.modelId,
        demandUnits: md.demand,
      })),
      componentInventory: simulator.locationState.inventory.map((inv) => ({
        supplier: inv.supplier,
        componentId: inv.componentId,
        quantity: inv.quantity,
      })),
      deliveries,
      componentFailures: failures,
    }
  }

  return {
    get currentDate() {
      return simulator.currentDate
    },
    get locationState() {
      return simulator.locationState
    },
    get locationId() {
      return simulator.locationId
    },
    get simulationFinished() {
      return simulator.simulationFinished
    },
    processDeliveries,
    processModelDemand,
    generateFailures,
    simulateDay,
  }
}

export function initializeLocationStates(): Record<LocationId, LocationState> {
  const locationStates: Record<LocationId, LocationState> = {} as Record<
    LocationId,
    LocationState
  >

  Object.entries(LOCATIONS).forEach(([locationId, location]) => {
    const inventory: ComponentInventory[] = []

    // For each supplier in this location
    location.suppliers.forEach((supplierId) => {
      const supplier = SUPPLIERS[supplierId]

      // Add base inventory for each component this supplier provides
      supplier.components.forEach(({ componentId }) => {
        // Get target inventory level for this component at this location
        const targetInventory = getTargetInventoryLevel(
          locationId as LocationId,
          componentId as ComponentId
        )

        // Divide inventory evenly among suppliers for this component
        const suppliersForComponent = location.suppliers.filter((sid) =>
          SUPPLIERS[sid].components.some((c) => c.componentId === componentId)
        )

        const supplierShare = targetInventory / suppliersForComponent.length

        inventory.push({
          supplier: supplierId,
          componentId: componentId as ComponentId,
          quantity: Math.ceil(supplierShare),
        })
      })
    })

    locationStates[locationId as LocationId] = {
      inventory,
      ordersInTransit: [],
    }
  })

  return locationStates
}
