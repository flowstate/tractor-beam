import { describe, it, expect, beforeEach } from 'vitest'
import type { LocationSimulator } from '../day-simulator'
import { dateToKey, generateDateIndexedTIS } from '../time-independent'
import type { TimeIndependentSeries } from '../time-independent'
import type { LocationId } from '../../types/types'
import { createLocationSimulator } from '../day-simulator'
import { initializeLocationStates } from '../day-simulator'
import { addDays } from 'date-fns'

describe('LocationSimulator', () => {
  let simulator: LocationSimulator
  let timeSeries: TimeIndependentSeries
  const locationId = 'west' as LocationId

  beforeEach(() => {
    // Generate 6 months of predictable data
    timeSeries = generateDateIndexedTIS(
      new Date('2024-01-01'),
      new Date('2024-07-01'),
      {
        inflation: {
          baseRate: 0.02,
          mtiInfluence: 0.02,
          locationVolatility: 0.01,
          lagDays: 30,
        },
        demand: {
          marketMultiplier: 500,
          inflationMultiplier: 300,
          randomness: 0,
        },
      },
      'test-seed'
    )

    simulator = createLocationSimulator(locationId, timeSeries, 'test-seed')
  })

  describe('processDeliveries', () => {
    it('processes arriving orders and updates inventory', () => {
      const arrivalDate = new Date('2024-01-01')
      const futureDate = new Date('2024-01-03')

      simulator.locationState.ordersInTransit = [
        {
          supplier: 'Atlas',
          componentId: 'ENGINE-A',
          quantity: 100,
          arrivalDate: arrivalDate,
          orderDate: addDays(arrivalDate, -2),
        },
        {
          supplier: 'Atlas',
          componentId: 'ENGINE-B',
          quantity: 50,
          arrivalDate: futureDate,
          orderDate: addDays(arrivalDate, -3),
        },
      ]

      const initialInventory = simulator.locationState.inventory.find(
        (inv) => inv.supplier === 'Atlas' && inv.componentId === 'ENGINE-A'
      )!.quantity

      const deliveries = simulator.processDeliveries()

      expect(deliveries).toHaveLength(1)
      expect(deliveries[0]).toEqual({
        supplier: 'Atlas',
        componentId: 'ENGINE-A',
        orderSize: 100,
        leadTimeVariance: -6,
        discount: 0,
      })

      const updatedInventory = simulator.locationState.inventory.find(
        (inv) => inv.supplier === 'Atlas' && inv.componentId === 'ENGINE-A'
      )
      expect(updatedInventory!.quantity).toBe(initialInventory + 100)
      expect(simulator.locationState.ordersInTransit).toHaveLength(1)
      expect(simulator.locationState.ordersInTransit[0].arrivalDate).toEqual(
        futureDate
      )
    })

    it('handles multiple deliveries on same day', () => {
      const arrivalDate = new Date('2024-01-01')

      simulator.locationState.ordersInTransit = [
        {
          supplier: 'Atlas',
          componentId: 'ENGINE-A',
          quantity: 100,
          arrivalDate: arrivalDate,
          orderDate: addDays(arrivalDate, -2),
        },
        {
          supplier: 'Atlas',
          componentId: 'ENGINE-B',
          quantity: 50,
          arrivalDate: arrivalDate,
          orderDate: addDays(arrivalDate, -3),
        },
      ]

      const deliveries = simulator.processDeliveries()

      expect(deliveries).toHaveLength(2)
      expect(simulator.locationState.ordersInTransit).toHaveLength(0)
    })
  })

  describe('processModelDemand', () => {
    it('distributes demand among available suppliers', () => {
      console.log('Initial date:', simulator.currentDate)
      console.log('Initial inventory:', simulator.locationState.inventory)
      console.log('Today data:', timeSeries[dateToKey(simulator.currentDate)])

      const result = simulator.processModelDemand()
      console.log('Result:', result)

      expect(result.ordersGenerated.length).toBeGreaterThan(0)
      expect(result.componentsUsed.length).toBe(result.ordersGenerated.length)
    })

    it('throws error when insufficient inventory available', () => {
      // Deplete inventory completely
      simulator.locationState.inventory.forEach((inv) => {
        inv.quantity = 0
      })

      expect(() => simulator.processModelDemand()).toThrow(
        /Attempt to deplete inventory/
      )
    })

    it('randomly distributes demand among multiple suppliers', () => {
      // Run multiple times to ensure random distribution
      const results = Array.from({ length: 5 }, () => {
        const sim = createLocationSimulator(
          locationId,
          timeSeries,
          'different-seed-' + Math.random()
        )
        return sim.processModelDemand()
      })

      // Check that we get different distributions
      const distributions = results.map((r) =>
        JSON.stringify(r.componentsUsed.map((u) => u.quantity))
      )

      // At least some distributions should be different
      const uniqueDistributions = new Set(distributions)
      expect(uniqueDistributions.size).toBeGreaterThan(1)
    })
  })

  describe('generateFailures', () => {
    it('generates failures based on supplier quality', () => {
      const { componentsUsed } = simulator.processModelDemand()
      const failures = simulator.generateFailures(componentsUsed)

      // Should have some failures due to base failure rates
      expect(failures.length).toBeGreaterThan(0)

      // Each failure should match a used component
      failures.forEach((failure) => {
        const matchingUsage = componentsUsed.find(
          (u) =>
            u.supplier === failure.supplier &&
            u.componentId === failure.componentId
        )
        expect(matchingUsage).toBeDefined()
      })
    })
  })

  describe('simulateDay', () => {
    it('generates a complete daily report', () => {
      const report = simulator.simulateDay()
      expect(report).not.toBeNull()
      if (!report) return

      expect(report.date).toEqual(new Date('2024-01-01'))
      expect(report.location).toBe(locationId)
      expect(report.marketTrendIndex).toBeGreaterThan(0)
      expect(report.inflationRate).toBeGreaterThan(0)
      expect(report.modelDemand.length).toBeGreaterThan(0)
      expect(report.componentInventory.length).toBeGreaterThan(0)
      expect(report.componentFailures.length).toBeGreaterThan(0)
    })

    it('advances to next day after simulation', () => {
      console.log('Initial date:', simulator.currentDate)
      simulator.simulateDay()
      console.log('Final date:', simulator.currentDate)
      expect(simulator.currentDate).toEqual(new Date('2024-01-02'))
    })

    it.skip('returns null when simulation is finished', () => {
      // Simulate all days
      while (!simulator.simulationFinished) {
        simulator.simulateDay()
      }
      expect(simulator.simulateDay()).toBeNull()
    })
  })
})
