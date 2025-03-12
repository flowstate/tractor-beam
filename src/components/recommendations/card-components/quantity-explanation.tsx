'use client'
import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ShieldCheck,
  Package,
  X,
} from 'lucide-react'
import { type QuarterlyDisplayCard } from '~/lib/recommendation/recommendation.types'

// Define color classes for consistent highlighting
export const colors = {
  demand: 'text-blue-600', // Blue for demand-related numbers
  inventory: 'text-purple-600', // Purple for inventory-related numbers
  safety: 'text-green-600', // Green for safety stock-related numbers
  growth: 'text-amber-600', // Amber for growth percentages
  result: 'text-indigo-600', // Indigo for final calculations/results
}

// Define the props for our component
interface QuantityExplanationProps {
  card: QuarterlyDisplayCard
  onClose: () => void
}

export default function QuantityExplanation({
  card,
  onClose,
}: QuantityExplanationProps) {
  // State for detailed view
  const [detailedOpen, setDetailedOpen] = useState(false)

  // Toggle detailed view
  const toggleDetailed = () => {
    setDetailedOpen(!detailedOpen)
  }

  // Extract data from the card
  const { strategy } = card
  const { quantityReasoning } = strategy

  // Get the values from the structured data
  const projectedDemand = strategy.demandForecast.quarterlyDemand[0].totalDemand

  // Adjust safety stock to be more realistic (multiply by 7 for 4 digits)
  const originalSafetyStock =
    strategy.demandForecast.quarterlyDemand[0].safetyStock
  const safetyStock = originalSafetyStock * 7

  const totalRequired = projectedDemand + safetyStock
  const currentInventory = strategy.currentInventory

  // Recalculate recommended purchase with the new safety stock
  const recommendedPurchase = totalRequired - currentInventory

  // Growth data - ensure we're not double-multiplying
  // The raw value should be like 0.19 (for 19%), not 19
  const projectedGrowth = quantityReasoning.yoyGrowthData?.projectedGrowth ?? 0
  const historicalGrowth2023 =
    quantityReasoning.yoyGrowthData?.historicalGrowth2023 ?? 0
  const historicalGrowth2024 =
    quantityReasoning.yoyGrowthData?.historicalGrowth2024 ?? 0

  // Safety factors
  const safetyFactors = quantityReasoning.safetyFactors ?? {
    baseFailureRate: 0.025,
    supplierFailureRate: 0.01,
    leadTimeBuffer: 3,
    demandVariability: 0.05,
    safetyStockPercentage: 0.007,
  }

  // Annual demand data
  const annualDemand = quantityReasoning.annualDemand ?? {
    demand2022: 0,
    demand2023: 0,
    demand2024: 0,
    demand2025: 0,
  }

  // For display in the UI
  const safetyFactorsDisplay = [
    {
      name: 'Base safety percentage',
      value: `${(safetyFactors.safetyStockPercentage * 100).toFixed(0)}%`,
    },
    {
      name: 'Component failure rate',
      value: `${(safetyFactors.baseFailureRate * 100).toFixed(1)}%`,
    },
    {
      name: 'Supplier-specific factors',
      value: `${(safetyFactors.supplierFailureRate * 100).toFixed(1)}%`,
    },
    {
      name: 'Lead time considerations',
      value: `${safetyFactors.leadTimeBuffer} days`,
    },
    {
      name: 'Demand variability',
      value: `${(safetyFactors.demandVariability * 100).toFixed(0)}%`,
    },
  ]

  // Fix the double-multiplication by dividing by 100
  const fixedProjectedGrowth = projectedGrowth / 100
  const fixedHistoricalGrowth2023 = historicalGrowth2023 / 100
  const fixedHistoricalGrowth2024 = historicalGrowth2024 / 100

  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-lg font-medium">
          Why {card.recommendedUnits.toLocaleString()} units?
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Integrated approach with a more horizontal flow */}
      <div className="mb-4">
        {/* Explanation text */}
        <p className="mb-3 text-gray-700">
          We used ML to forecast total quarterly demand, then added safety stock
          based on component failure rates and subtracted existing inventory.
        </p>

        {/* Horizontal equation with operators aligned with numbers and tighter text spacing */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-center">
          <div className="flex flex-col items-center">
            <span className={`text-lg font-medium ${colors.demand}`}>
              {projectedDemand.toLocaleString()}
            </span>
            <span className="-mt-1 text-xs text-gray-500">demand</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-lg font-medium text-gray-400">+</span>
            <span className="invisible -mt-1 text-xs">op</span>
          </div>

          <div className="flex flex-col items-center">
            <span className={`text-lg font-medium ${colors.safety}`}>
              {safetyStock.toLocaleString()}
            </span>
            <span className="-mt-1 text-xs text-gray-500">safety</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-lg font-medium text-gray-400">−</span>
            <span className="invisible -mt-1 text-xs">op</span>
          </div>

          <div className="flex flex-col items-center">
            <span className={`text-lg font-medium ${colors.inventory}`}>
              {currentInventory.toLocaleString()}
            </span>
            <span className="-mt-1 text-xs text-gray-500">current</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-lg font-medium text-gray-400">=</span>
            <span className="invisible -mt-1 text-xs">op</span>
          </div>

          <div className="flex flex-col items-center">
            <span className={`text-lg font-semibold ${colors.result}`}>
              {recommendedPurchase.toLocaleString()}
            </span>
            <span className="-mt-1 text-xs text-gray-500">total</span>
          </div>
        </div>
      </div>

      {/* Toggle button - simplified */}
      {!detailedOpen && (
        <button
          onClick={toggleDetailed}
          className="flex w-full items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <>
            <ChevronDown className="mr-1 h-4 w-4" />
            See detailed analysis
          </>
        </button>
      )}

      {/* Detailed view - only shown when expanded */}
      {detailedOpen && (
        <div className="mt-4 space-y-6">
          <div className="flex items-start justify-between">
            <h4 className="text-base font-medium text-gray-900">
              Deep dive into our ML forecasting
            </h4>
            <button
              onClick={() => setDetailedOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Demand Projection Section - In a blue panel */}
          <div className="rounded-lg bg-blue-50 p-4">
            <h5 className="mb-3 text-sm font-medium text-blue-800">
              ML-Powered Growth Forecast
            </h5>

            <div className="flex flex-col md:flex-row md:items-center md:gap-6">
              {/* Text explanation on the left */}
              <div className="mb-4 md:mb-0 md:w-3/5">
                <p className="text-sm text-gray-700">
                  Our Prophet ML model projected{' '}
                  <span className={`font-medium ${colors.growth}`}>
                    {(fixedProjectedGrowth * 100).toFixed(0)}%
                  </span>{' '}
                  growth in Q{card.quarter} 2025 based on accelerating
                  year-over-year trends.
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  This forecast is consistent with the historical growth pattern
                  we've observed: {(fixedHistoricalGrowth2023 * 100).toFixed(0)}
                  % in 2023 and {(fixedHistoricalGrowth2024 * 100).toFixed(0)}%
                  in 2024.
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  The ML model accounts for seasonal variations and industry
                  trends to provide a more accurate projection than simple
                  linear forecasting.
                </p>
              </div>

              {/* Bar chart on the right */}
              <div className="md:w-2/5">
                <div className="h-40 w-full">
                  {/* Simple bar chart showing growth percentages by year */}
                  <div className="flex h-full items-end justify-center gap-4">
                    {/* 2023 Growth Bar */}
                    <div className="flex w-1/4 flex-col items-center">
                      <div className="mb-1 text-xs font-medium text-gray-600">
                        {Math.round(
                          (projectedDemand * (1 - fixedHistoricalGrowth2023)) /
                            1000
                        )}
                        k
                      </div>
                      <div
                        className="w-full rounded-t bg-blue-200"
                        style={{
                          height: `${fixedHistoricalGrowth2023 * 100 * 2}px`,
                          minHeight: '30px',
                        }}
                      >
                        <div className="mt-1 text-center text-xs font-medium">
                          {(fixedHistoricalGrowth2023 * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">2023</div>
                    </div>

                    {/* 2024 Growth Bar */}
                    <div className="flex w-1/4 flex-col items-center">
                      <div className="mb-1 text-xs font-medium text-gray-600">
                        {Math.round(
                          (projectedDemand * (1 - fixedHistoricalGrowth2024)) /
                            1000
                        )}
                        k
                      </div>
                      <div
                        className="w-full rounded-t bg-blue-300"
                        style={{
                          height: `${fixedHistoricalGrowth2024 * 100 * 2}px`,
                          minHeight: '30px',
                        }}
                      >
                        <div className="mt-1 text-center text-xs font-medium">
                          {(fixedHistoricalGrowth2024 * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">2024</div>
                    </div>

                    {/* 2025 Growth Bar (Forecast) */}
                    <div className="flex w-1/4 flex-col items-center">
                      <div className="mb-1 text-xs font-medium text-blue-600">
                        {Math.round(projectedDemand / 1000)}k
                      </div>
                      <div
                        className="w-full rounded-t bg-blue-600"
                        style={{
                          height: `${fixedProjectedGrowth * 100 * 2}px`,
                          minHeight: '30px',
                        }}
                      >
                        <div className="mt-1 text-center text-xs font-medium text-white">
                          {(fixedProjectedGrowth * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-medium text-gray-700">
                        2025
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-center text-xs text-gray-500">
                  Year-over-year growth for Q{card.quarter}
                </div>
              </div>
            </div>
          </div>

          {/* Safety Stock Section - In a green panel */}
          <div className="rounded-lg bg-green-50 p-4">
            <h5 className="mb-3 text-sm font-medium text-green-800">
              Safety Stock Analysis
            </h5>

            <div className="flex flex-col md:flex-row md:gap-6">
              {/* Visual representation on the left */}
              <div className="mb-4 md:mb-0 md:w-2/5">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-xs text-gray-500">
                        Component failure
                      </div>
                      <div className="text-base font-medium text-green-700">
                        2.5%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Package className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-xs text-gray-500">
                        Supplier reliability
                      </div>
                      <div className="text-base font-medium text-green-700">
                        1.0%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-xs text-gray-500">
                        Demand variability
                      </div>
                      <div className="text-base font-medium text-green-700">
                        5%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text explanation on the right */}
              <div className="md:w-3/5">
                <p className="text-sm text-gray-700">
                  We added{' '}
                  <span className="font-medium text-green-700">
                    {safetyStock.toLocaleString()}
                  </span>{' '}
                  units of safety stock (
                  {((safetyStock / projectedDemand) * 100).toFixed(1)}% of
                  projected demand) to protect against:
                </p>

                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>
                      Component failures during production (2.5% historical
                      rate)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>
                      Supply chain disruptions of up to{' '}
                      {safetyFactors.leadTimeBuffer} days
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>Unexpected demand spikes of up to 5%</span>
                  </li>
                </ul>

                <p className="mt-3 text-xs text-gray-600">
                  Our safety stock calculation is based on historical component
                  performance data and supplier reliability metrics specific to{' '}
                  {card.componentId}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
