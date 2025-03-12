import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateComponentDemand,
  calculateSafetyStock,
  type ComponentDemand,
} from '../prediction/component-demand'
import { type LocationId, type ComponentId } from '~/lib/types/types'

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const mockDemandForecastFindMany = vi.fn()
  const mockLocationFindMany = vi.fn()

  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      demandForecast: {
        findMany: mockDemandForecastFindMany,
      },
      location: {
        findMany: mockLocationFindMany,
      },
    })),
  }
})

// Mock constants
vi.mock('../constants', () => {
  return {
    TRACTOR_MODELS: {
      'TX-100': {
        id: 'TX-100',
        components: ['ENGINE-A', 'CHASSIS-BASIC', 'HYDRAULICS-SMALL'],
      },
      'TX-300': {
        id: 'TX-300',
        components: ['ENGINE-B', 'CHASSIS-BASIC', 'HYDRAULICS-MEDIUM'],
      },
      'TX-500': {
        id: 'TX-500',
        components: ['ENGINE-B', 'CHASSIS-PREMIUM', 'HYDRAULICS-MEDIUM'],
      },
    },
    SUPPLIERS: {
      Elite: { baseLeadTime: 5 },
      Crank: { baseLeadTime: 7 },
      Atlas: { baseLeadTime: 8 },
    },
    LOCATIONS: {
      west: {
        code: 'west',
        suppliers: ['Atlas', 'Crank', 'Elite'],
      },
      south: {
        code: 'south',
        suppliers: ['Atlas', 'Bolt', 'Dynamo'],
      },
      heartland: {
        code: 'heartland',
        suppliers: ['Bolt', 'Crank', 'Elite'],
      },
    },
  }
})

// Import the mocked PrismaClient
import { PrismaClient } from '@prisma/client'

describe('Component Demand Calculation', () => {
  // Get the mocked instance
  const prisma = new PrismaClient()

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the mock implementations for each test
    prisma.location.findMany.mockResolvedValue([
      { id: 'west' },
      { id: 'south' },
      { id: 'heartland' },
    ])
  })

  describe('calculateSafetyStock', () => {
    it('should calculate safety stock correctly for a given demand and location', () => {
      // Direct test of the safety stock calculation
      const result = calculateSafetyStock(100, 'west' as LocationId)

      // With average lead time of (5+7+8)/3 = 6.67
      // Standard deviation = 100 * 0.3 = 30
      // Safety stock = 1.65 * 30 * sqrt(6.67) ≈ 127.5, rounded up to 128
      expect(result).toBe(128)
    })
  })

  describe('calculateComponentDemand', () => {
    it('should calculate component demand correctly', async () => {
      const mockDemandForecasts = [
        {
          modelId: 'TX-300',
          forecastData: JSON.stringify([
            { date: '2023-01-15', value: 10 },
            { date: '2023-01-16', value: 12 },
            { date: '2023-02-15', value: 15 },
          ]),
        },
        {
          modelId: 'TX-500',
          forecastData: JSON.stringify([
            { date: '2023-01-15', value: 5 },
            { date: '2023-01-16', value: 6 },
            { date: '2023-02-15', value: 8 },
          ]),
        },
      ]

      // Set up the mock to return our test data
      prisma.demandForecast.findMany.mockResolvedValue(mockDemandForecasts)

      const result = await calculateComponentDemand(
        'west' as LocationId,
        'ENGINE-B' as ComponentId
      )

      expect(result).toBeDefined()
      expect(result.componentId).toBe('ENGINE-B')
      expect(result.locationId).toBe('west')
      expect(result.quarterlyDemand).toHaveLength(1)

      // Q1 2023 should have total demand of 56 (sum of all daily values)
      const q1Data = result.quarterlyDemand[0]
      expect(q1Data.quarter).toBe(1)
      expect(q1Data.year).toBe(2023)
      expect(q1Data.totalDemand).toBe(56)

      // Safety stock calculation can be verified
      // With average lead time of (5+7+8)/3 = 6.67
      // Standard deviation = 56 * 0.3 = 16.8
      // Safety stock = 1.65 * 16.8 * sqrt(6.67) ≈ 71.4, rounded up to 72
      expect(q1Data.safetyStock).toBe(72)

      // Total required = demand + safety stock
      expect(q1Data.totalRequired).toBe(128)
    })

    it('should handle empty forecast data gracefully', async () => {
      // Set up the mock to return empty forecast data
      prisma.demandForecast.findMany.mockResolvedValue([
        {
          modelId: 'TX-300',
          forecastData: '[]',
        },
      ])

      const result = await calculateComponentDemand(
        'west' as LocationId,
        'ENGINE-B' as ComponentId
      )

      expect(result).toBeDefined()
      expect(result.quarterlyDemand).toHaveLength(0)
    })

    it('should throw an error if no models use the component', async () => {
      await expect(
        calculateComponentDemand(
          'west' as LocationId,
          'NONEXISTENT' as ComponentId
        )
      ).rejects.toThrow('No models use component NONEXISTENT')
    })

    it('should throw an error if no forecasts are found', async () => {
      // Set up the mock to return an empty array
      prisma.demandForecast.findMany.mockResolvedValue([])

      await expect(
        calculateComponentDemand(
          'west' as LocationId,
          'ENGINE-B' as ComponentId
        )
      ).rejects.toThrow(
        'No demand forecasts found for location west and component ENGINE-B'
      )
    })
  })
})
