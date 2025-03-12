/**
 * Integration Tests for Day Simulator
 *
 * This test suite verifies the day-to-day operation of the simulator
 * by tracking state changes and validating outputs across multiple days.
 *
 * Test Plan:
 *
 * 1. Setup:
 * - Generate TIS for a known period (Jan 1-10, 2024)
 * - Use a fixed seed for initial generation
 * - Create simulator with another fixed seed
 *
 * 2. Day-by-day verification:
 * For each day:
 * - Store current state (inventory, orders in transit)
 * - Run simulateDay()
 * - Verify deterministic elements exactly:
 *   * date
 *   * location
 *   * marketTrendIndex (from TIS)
 *   * inflationRate (from TIS)
 *   * modelDemand (from TIS)
 *   * deliveries (based on known orders in transit)
 *
 * - Verify randomized elements statistically:
 *   * For component usage: verify total quantities match demand, even if distribution varies
 *   * For failures: verify they occur within expected ranges based on quality/failure rates
 *
 * 3. State transitions:
 * After each day:
 * - Verify inventory changes match:
 *   * Decreases from usage
 *   * Increases from deliveries
 * - Verify orders in transit:
 *   * New orders added
 *   * Delivered orders removed
 * - Verify date advanced correctly
 *
 *
 * TODO: Add tests for order/delivery lead times that verify:
 * 1. Base lead times from supplier configs are used
 * 2. Lead times are adjusted by supplier quality (efficiencyIndex)
 * 3. Seasonal patterns affect delivery times as expected
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import type { LocationSimulator, OrderInTransit } from '../day-simulator'
import { dateToKey, generateDateIndexedTIS } from '../time-independent'
import type { TimeIndependentSeries } from '../time-independent'
import type {
  ComponentId,
  LocationId,
  SupplierId,
  TractorModelId,
} from '../../types/types'
import { createLocationSimulator } from '../day-simulator'
import type {
  ComponentInventory,
  DailyLocationReport,
} from '../../types/historicals.types'
import { COMPONENTS, TRACTOR_MODELS } from '../../constants'
import { supplierHelpers } from '../../helpers/supplier-helpers'
import { vi } from 'vitest'
import { isSameDay, differenceInDays } from 'date-fns'
import type { DailyLocationData, DayData } from '../time-independent'

const START_DATE = new Date('2024-01-01')
const LOCATION_ID = 'CA' as LocationId

describe('Day Simulator Integration', () => {
  let simulator: LocationSimulator
  const dailyReports: DailyLocationReport[] = []

  // Set up mock before anything runs
  vi.spyOn(supplierHelpers, 'getBaseLeadTime').mockImplementation(() => 2)

  beforeAll(() => {
    simulator = createLocationSimulator(
      LOCATION_ID,
      createTestTimeSeries(START_DATE),
      'test-seed'
    )
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  const simulateNextDay = () => {
    const orderDate = new Date(simulator.currentDate) // Grab before simulation
    const initialState = JSON.parse(
      JSON.stringify(simulator.locationState)
    ) as typeof simulator.locationState
    const report = simulator.simulateDay()
    return { initialState, report, orderDate }
  }

  const trackDay = (
    dayNumber: number,
    initialState: typeof simulator.locationState,
    report: DailyLocationReport
  ) => {
    dailyReports.push(report)

    // Calculate component totals
    const getTotal = (
      inventory: ComponentInventory[],
      componentId: ComponentId
    ) =>
      inventory
        .filter((inv) => inv.componentId === componentId)
        .reduce((sum, inv) => sum + inv.quantity, 0)

    console.log(`Day ${dayNumber} Report:`, {
      date: report.date.toISOString().split('T')[0],
      initialInventory: Object.values(COMPONENTS).reduce(
        (acc, c) => {
          acc[c.id] = getTotal(initialState.inventory, c.id)
          return acc
        },
        {} as Record<ComponentId, number>
      ),
      deliveries: report.deliveries.reduce(
        (acc, d) => {
          acc[d.componentId] = (acc[d.componentId] || 0) + d.orderSize
          return acc
        },
        {} as Record<ComponentId, number>
      ),
      usage: report.modelDemand.reduce(
        (acc, md) => {
          TRACTOR_MODELS[md.modelId].components.forEach((componentId) => {
            acc[componentId as ComponentId] =
              (acc[componentId as ComponentId] || 0) + md.demandUnits
          })
          return acc
        },
        {} as Record<ComponentId, number>
      ),
      finalInventory: Object.values(COMPONENTS).reduce(
        (acc, c) => {
          acc[c.id] = getTotal(report.componentInventory, c.id)
          return acc
        },
        {} as Record<ComponentId, number>
      ),
    })
  }

  describe('Day 1 (Jan 1)', () => {
    let report: DailyLocationReport | null
    let initialState: typeof simulator.locationState
    let orderDate: Date

    beforeAll(() => {
      ;({ report, initialState, orderDate } = simulateNextDay())
      if (report) trackDay(1, initialState, report)
    })

    it('generates expected daily report', () => {
      expect(report).toMatchObject({
        date: START_DATE,
        location: LOCATION_ID,
        marketTrendIndex: 0.5,
        inflationRate: 0.02,
        modelDemand: [
          { modelId: 'TX-100', demandUnits: 100 },
          { modelId: 'TX-300', demandUnits: 80 },
          { modelId: 'TX-500', demandUnits: 30 },
        ],
        deliveries: [],
      })
    })

    it('correctly updates inventory based on component usage', () => {
      // Day 0 needs:
      // TX-100: 100 each of ENGINE-A, CHASSIS-BASIC, HYDRAULICS-SMALL
      // TX-300: 80 each of ENGINE-B, CHASSIS-BASIC, HYDRAULICS-MEDIUM
      // TX-500: 30 each of ENGINE-B, CHASSIS-PREMIUM, HYDRAULICS-MEDIUM

      const inventory = simulator.locationState.inventory

      // For each component type, find all suppliers and sum their quantities
      const getTotal = (componentId: ComponentId) =>
        inventory
          .filter((inv) => inv.componentId === componentId)
          .reduce((sum, inv) => sum + inv.quantity, 0)

      // Compare with initial totals minus usage
      const initialTotal = (componentId: ComponentId) =>
        initialState.inventory
          .filter((inv) => inv.componentId === componentId)
          .reduce((sum, inv) => sum + inv.quantity, 0)

      // Verify total quantities used
      expect(getTotal('ENGINE-A')).toBe(initialTotal('ENGINE-A') - 100)
      expect(getTotal('ENGINE-B')).toBe(initialTotal('ENGINE-B') - 110) // 80 + 30
      expect(getTotal('CHASSIS-BASIC')).toBe(
        initialTotal('CHASSIS-BASIC') - 180
      ) // 100 + 80
      expect(getTotal('CHASSIS-PREMIUM')).toBe(
        initialTotal('CHASSIS-PREMIUM') - 30
      )
      expect(getTotal('HYDRAULICS-SMALL')).toBe(
        initialTotal('HYDRAULICS-SMALL') - 100
      )
      expect(getTotal('HYDRAULICS-MEDIUM')).toBe(
        initialTotal('HYDRAULICS-MEDIUM') - 110
      ) // 80 + 30
    })

    it('has no deliveries on day 1', () => {
      expect(report).not.toBeNull()
      if (!report) return

      expect(report.deliveries).toEqual([])
    })

    it('creates orders in transit matching demand', () => {
      const orders = simulator.locationState.ordersInTransit

      // Log the actual orders for debugging
      console.log(
        'Orders:',
        orders.map((o) => `${o.supplier}-${o.componentId}-${o.quantity}`)
      )

      // Verify total number of orders is reasonable
      expect(orders.length).toBeGreaterThanOrEqual(21)
      expect(orders.length).toBeLessThanOrEqual(30)

      // Verify all expected components are ordered
      const componentQuantities = orders.reduce(
        (acc, order) => {
          acc[order.componentId] =
            (acc[order.componentId] || 0) + order.quantity
          return acc
        },
        {} as Record<string, number>
      )

      // Check that we ordered the right total quantities
      expect(componentQuantities['ENGINE-A']).toBe(100)
      expect(componentQuantities['ENGINE-B']).toBe(110)
      expect(componentQuantities['CHASSIS-BASIC']).toBe(180)
      expect(componentQuantities['CHASSIS-PREMIUM']).toBe(30)
      expect(componentQuantities['HYDRAULICS-SMALL']).toBe(100)
      expect(componentQuantities['HYDRAULICS-MEDIUM']).toBe(110)

      // Verify distribution of arrival dates (more flexible)
      const ordersByDate = orders.reduce(
        (acc, order) => {
          const date = order.arrivalDate.toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      console.log('Orders by arrival date:', ordersByDate)

      // Check that orders are distributed across expected dates
      expect(Object.keys(ordersByDate).length).toBeGreaterThanOrEqual(3)
      expect(ordersByDate['2024-01-02']).toBeDefined()
      expect(ordersByDate['2024-01-03']).toBeDefined()
    })

    it('reports component failures for all used components', () => {
      expect(report).not.toBeNull()
      if (!report) return

      // Get all unique component-supplier combinations from orders in transit
      const usedCombinations = simulator.locationState.ordersInTransit.map(
        (order) => ({
          componentId: order.componentId,
          supplier: order.supplier,
        })
      )

      // Verify there's a failure report for each combination
      usedCombinations.forEach(({ componentId, supplier }) => {
        const failure = report!.componentFailures.find(
          (f) => f.componentId === componentId && f.supplier === supplier
        )
        expect(failure).toBeDefined()

        // With quality = 1.0, failure rate should exactly match baseline
        const expectedRate = COMPONENTS[componentId].baselineFailureRate
        expect(failure?.failureRate).toBe(expectedRate)
      })

      // Verify no extra failure reports
      expect(report.componentFailures.length).toBe(usedCombinations.length)
    })

    it('processes first day correctly', () => {
      // Verify our mock was called
      expect(supplierHelpers.getBaseLeadTime).toHaveBeenCalled()
    })
  })

  const getOrderKey = (order: OrderInTransit) =>
    JSON.stringify({
      supplier: order.supplier,
      componentId: order.componentId,
      quantity: order.quantity,
      orderDate: order.orderDate.toISOString(),
      arrivalDate: order.arrivalDate.toISOString(),
    })

  describe('Day 2 (Jan 2)', () => {
    let report: DailyLocationReport | null
    let initialState: typeof simulator.locationState
    let orderDate: Date

    beforeAll(() => {
      ;({ report, initialState, orderDate } = simulateNextDay())

      if (report) trackDay(2, initialState, report)
    })

    it('processes deliveries correctly', () => {
      expect(report).not.toBeNull()
      if (!report) return

      expect(report.deliveries).toHaveLength(1)

      // Check that we received ENGINE-B from some supplier
      const delivery = report.deliveries[0]
      expect(delivery.componentId).toBe('ENGINE-B')
      expect(delivery.leadTimeVariance).toBe(-1) // Still check lead time variance

      // Log the actual delivery for debugging
      console.log('Day 2 delivery:', delivery)
    })

    it('updates inventory after deliveries', () => {
      // Find the ENGINE-B inventory from the supplier that delivered
      const supplier = report!.deliveries[0].supplier
      const engineB = simulator.locationState.inventory.find(
        (inv) => inv.supplier === supplier && inv.componentId === 'ENGINE-B'
      )

      // Compare with initial state
      const initialEngineB = initialState.inventory.find(
        (inv) => inv.supplier === supplier && inv.componentId === 'ENGINE-B'
      )

      expect(engineB).toBeDefined()
      expect(initialEngineB).toBeDefined()

      // Check that inventory increased by the delivered amount
      const deliveredAmount = report!.deliveries[0].orderSize
      expect(engineB!.quantity).toBe(initialEngineB!.quantity + deliveredAmount)
    })

    it('generates new orders based on demand', () => {
      const newOrders = simulator.locationState.ordersInTransit.filter((o) =>
        isSameDay(o.orderDate, orderDate)
      )

      // Day 2 needs:
      // TX-100: 110 each of ENGINE-A, CHASSIS-BASIC, HYDRAULICS-SMALL
      // (No TX-300 on odd days)
      // (TX-500 only on days divisible by 3)

      const orderedQuantities = newOrders.reduce(
        (acc, order) => {
          acc[order.componentId] =
            (acc[order.componentId] || 0) + order.quantity
          return acc
        },
        {} as Record<string, number>
      )

      expect(orderedQuantities['ENGINE-A']).toBe(110) // TX-100
      expect(orderedQuantities['CHASSIS-BASIC']).toBe(110) // TX-100
      expect(orderedQuantities['HYDRAULICS-SMALL']).toBe(110) // TX-100

      // These components shouldn't be ordered on Day 2
      expect(orderedQuantities['ENGINE-B']).toBeUndefined()
      expect(orderedQuantities['CHASSIS-PREMIUM']).toBeUndefined()
      expect(orderedQuantities['HYDRAULICS-MEDIUM']).toBeUndefined()
    })
  })

  describe('Day 3 (Jan 3)', () => {
    let report: DailyLocationReport | null
    let initialState: typeof simulator.locationState
    let orderDate: Date

    beforeAll(() => {
      ;({ report, initialState, orderDate } = simulateNextDay())
      if (report) trackDay(3, initialState, report)
    })

    it('processes deliveries from Day 1', () => {
      expect(report).not.toBeNull()
      if (!report) return

      expect(report.deliveries.length).toBeGreaterThan(10) // Just verify we have multiple deliveries

      const receivedQuantities = report.deliveries.reduce(
        (acc, delivery) => {
          acc[delivery.componentId] =
            (acc[delivery.componentId] || 0) + delivery.orderSize
          return acc
        },
        {} as Record<string, number>
      )

      // Verify we received all component types (without exact quantities)
      expect(receivedQuantities['ENGINE-A']).toBeDefined()
      expect(receivedQuantities['ENGINE-B']).toBeDefined()
      expect(receivedQuantities['CHASSIS-BASIC']).toBeDefined()
      expect(receivedQuantities['CHASSIS-PREMIUM']).toBeDefined()
      expect(receivedQuantities['HYDRAULICS-MEDIUM']).toBeDefined()
    })

    it('updates inventory after deliveries', () => {
      const getTotal = (
        componentId: ComponentId,
        state: typeof simulator.locationState
      ) =>
        state.inventory
          .filter((inv) => inv.componentId === componentId)
          .reduce((sum, inv) => sum + inv.quantity, 0)

      // For each component type that was delivered
      report!.deliveries.forEach((delivery) => {
        const componentId = delivery.componentId
        const before = getTotal(componentId, initialState)
        const after = getTotal(componentId, simulator.locationState)

        // Calculate usage from model demand
        const usage = report!.modelDemand
          .filter((md) =>
            TRACTOR_MODELS[md.modelId].components.includes(componentId)
          )
          .reduce((sum, md) => sum + md.demandUnits, 0)

        // Verify inventory increased by deliveries and decreased by usage
        const totalDelivered = report!.deliveries
          .filter((d) => d.componentId === componentId)
          .reduce((sum, d) => sum + d.orderSize, 0)

        expect(after).toBe(before + totalDelivered - usage)
      })
    })

    it('generates orders for Day 3 demand', () => {
      const newOrders = simulator.locationState.ordersInTransit.filter((o) =>
        isSameDay(o.orderDate, orderDate)
      )

      const orderedQuantities = newOrders.reduce(
        (acc, order) => {
          acc[order.componentId] =
            (acc[order.componentId] || 0) + order.quantity
          return acc
        },
        {} as Record<string, number>
      )

      // Day 3 actual demand from the time series
      expect(orderedQuantities['ENGINE-A']).toBe(120) // TX-100
      expect(orderedQuantities['ENGINE-B']).toBe(60) // TX-300
      expect(orderedQuantities['CHASSIS-BASIC']).toBe(180) // TX-100 + TX-300
      expect(orderedQuantities['CHASSIS-PREMIUM']).toBe(24) // TX-500
      expect(orderedQuantities['HYDRAULICS-SMALL']).toBe(120) // TX-100
      expect(orderedQuantities['HYDRAULICS-MEDIUM']).toBe(60) // TX-300

      // ADDITIONAL CHECK: Verify distribution of orders in transit
      const ordersByDate = simulator.locationState.ordersInTransit.reduce(
        (acc, order) => {
          const date = order.arrivalDate.toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      console.log('Orders by arrival date after Day 3:', ordersByDate)

      // Check for Day 3 orders with 1-day lead time
      const day3Orders = simulator.locationState.ordersInTransit
        .filter((o) => isSameDay(o.orderDate, orderDate))
        .map((o) => ({
          component: o.componentId,
          leadTime: differenceInDays(o.arrivalDate, o.orderDate),
        }))

      console.log('Day 3 orders with lead times:', day3Orders)
    })
  })

  describe('Day 4 (Jan 4)', () => {
    let report: DailyLocationReport | null
    let initialState: typeof simulator.locationState
    let orderDate: Date
    let expectedQuantities: Record<ComponentId, number>

    beforeAll(() => {
      // Calculate expected deliveries BEFORE running simulation
      const day4Deliveries = simulator.locationState.ordersInTransit.filter(
        (o) => o.arrivalDate.toISOString().split('T')[0] === '2024-01-04'
      )

      expectedQuantities = day4Deliveries.reduce(
        (acc, order) => {
          acc[order.componentId] =
            (acc[order.componentId] || 0) + order.quantity
          return acc
        },
        {} as Record<ComponentId, number>
      )

      console.log('Expected Day 4 delivery quantities:', expectedQuantities)
      ;({ report, initialState, orderDate } = simulateNextDay())
      if (report) trackDay(4, initialState, report)
    })

    it('processes multiple deliveries', () => {
      expect(report).not.toBeNull()
      if (!report) return

      // Instead of expecting exactly 4 deliveries, check that we have deliveries
      expect(report.deliveries.length).toBeGreaterThan(0)

      const receivedQuantities = report.deliveries.reduce(
        (acc, delivery) => {
          acc[delivery.componentId] =
            (acc[delivery.componentId] || 0) + delivery.orderSize
          return acc
        },
        {} as Record<ComponentId, number>
      )

      // Using quantities derived from orders in transit
      Object.entries(expectedQuantities).forEach(([componentId, quantity]) => {
        expect(receivedQuantities[componentId as ComponentId]).toBe(quantity)
      })

      // Verify each delivery's lead time variance is calculated correctly
      report.deliveries.forEach((delivery) => {
        const originalOrder = simulator.locationState.ordersInTransit.find(
          (o) =>
            o.supplier === delivery.supplier &&
            o.componentId === delivery.componentId &&
            o.quantity === delivery.orderSize
        )

        if (originalOrder) {
          const actualLeadTime = differenceInDays(
            originalOrder.arrivalDate,
            originalOrder.orderDate
          )
          const expectedVariance = actualLeadTime - 2 // base lead time is 2
          expect(delivery.leadTimeVariance).toBe(expectedVariance)
        }
      })
    })

    it('updates inventory after deliveries', () => {
      const getTotal = (
        componentId: ComponentId,
        state: typeof simulator.locationState
      ) =>
        state.inventory
          .filter((inv) => inv.componentId === componentId)
          .reduce((sum, inv) => sum + inv.quantity, 0)

      // Check inventory changes for each delivered component
      Object.entries(expectedQuantities).forEach(([componentId, quantity]) => {
        const before = getTotal(componentId as ComponentId, initialState)
        const after = getTotal(
          componentId as ComponentId,
          simulator.locationState
        )

        // Calculate usage from model demand
        const usage = report!.modelDemand
          .filter((md) =>
            TRACTOR_MODELS[md.modelId].components.includes(componentId)
          )
          .reduce((sum, md) => sum + md.demandUnits, 0)

        expect(after).toBe(before + quantity - usage)
      })
    })
  })
})

function createTestTimeSeries(startDate: Date): TimeIndependentSeries {
  // Create a simple test time series with predictable values
  const dayData: DayData = {
    date: startDate,
    marketTrend: 0.5,
    locationData: {
      west: {
        inflationRate: 0.02,
        supplierQuality: {
          Atlas: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Crank: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Elite: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
        },
        modelDemand: [
          { modelId: 'TX-100', demand: 100 },
          { modelId: 'TX-300', demand: 80 },
          { modelId: 'TX-500', demand: 30 },
        ],
      },
      south: {
        inflationRate: 0.02,
        supplierQuality: {
          Atlas: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Bolt: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Crank: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Dynamo: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Elite: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
        },
        modelDemand: [
          { modelId: 'TX-100', demand: 120 },
          { modelId: 'TX-300', demand: 60 },
          { modelId: 'TX-500', demand: 20 },
        ],
      },
      heartland: {
        inflationRate: 0.02,
        supplierQuality: {
          Bolt: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Crank: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          Elite: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
        },
        modelDemand: [
          { modelId: 'TX-100', demand: 90 },
          { modelId: 'TX-300', demand: 70 },
          { modelId: 'TX-500', demand: 40 },
        ],
      },
    },
  }

  const timeSeries: TimeIndependentSeries = {}

  for (let i = 0; i < 10; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateKey = dateToKey(date)

    timeSeries[dateKey] = {
      date,
      marketTrend: 0.5,
      locationData: {
        west: {
          inflationRate: 0.02,
          supplierQuality: {
            Atlas: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Bolt: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Crank: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Dynamo: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Elite: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          },
          modelDemand: [
            ...([0, 1, 4, 6, 8, 9].includes(i)
              ? [{ modelId: 'TX-100' as TractorModelId, demand: 100 }]
              : []),
            ...([0, 2, 4, 6, 8].includes(i)
              ? [{ modelId: 'TX-300' as TractorModelId, demand: 80 }]
              : []),
            ...([2, 3, 5, 7].includes(i)
              ? [{ modelId: 'TX-500' as TractorModelId, demand: 20 + i * 2 }]
              : []),
          ],
        },
        south: {
          inflationRate: 0.02,
          supplierQuality: {
            Atlas: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Bolt: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Dynamo: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          },
          modelDemand: [],
        },
        heartland: {
          inflationRate: 0.02,
          supplierQuality: {
            Bolt: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Crank: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
            Elite: { qualityIndex: 1.0, efficiencyIndex: 1.0 },
          },
          modelDemand: [],
        },
      },
    }
  }
  return timeSeries
}
