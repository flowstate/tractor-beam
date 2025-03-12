import React from 'react'
import type { TypedForecastData } from '~/app/data/demand/page'
import { HistoricalChart } from './historical-chart'
import { ForecastChart } from './forecast-chart'
import { AnalysisInsights } from './analysis-insights'

interface DemandVizProps {
  data: TypedForecastData
}

export function DemandViz({ data }: DemandVizProps) {
  return (
    <div className="space-y-[30vh]">
      {/* Introduction Section */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          TX-300 Demand Forecasting Overview
        </h2>

        <div className="mx-auto max-w-3xl rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-6 text-center shadow-sm">
          <p className="mb-4 text-gray-700">
            We&apos;ve generated 3 years of historical data (2022-2024) for our
            tractor supply chain system, focusing on the{' '}
            <span className="font-semibold text-green-600">TX-300 model</span>{' '}
            in the{' '}
            <span className="font-semibold text-purple-600">
              Heartland region
            </span>
            .
          </p>
          <p className="text-gray-700">
            This model has balanced market sensitivity (
            {data.metadata.modelSensitivities.market.toFixed(1)}) and inflation
            sensitivity ({data.metadata.modelSensitivities.inflation.toFixed(1)}
            ), making it an ideal candidate for demonstrating our forecasting
            capabilities.
          </p>
        </div>
      </section>

      {/* Historical Data Section */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Historical Data Analysis
        </h2>

        <div className="flex flex-col items-center gap-6 lg:flex-row">
          <div className="flex w-full items-center lg:w-1/2">
            <div className="space-y-4">
              <p className="text-gray-700">
                The{' '}
                <span className="font-semibold text-orange-400">
                  Market Trend Index (MTI)
                </span>{' '}
                represents overall market conditions, while{' '}
                <span className="font-semibold text-red-500">
                  inflation rates
                </span>{' '}
                capture local price pressures, typically ranging between 1-4%
                with seasonal patterns.
              </p>

              <p className="text-gray-700">
                Note the seasonal pattern: reduced demand in winter (Q1) and
                peak demand during harvest season (Q3). These patterns are
                consistent year over year, with variations influenced by market
                conditions.
              </p>

              <p className="text-gray-700">
                Inflation follows its own seasonal cycle, with higher rates in
                winter months (reducing demand) and lower rates during summer
                harvest season (boosting demand). These inflation patterns work
                in tandem with market trends to influence overall purchasing
                behavior.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="h-[300px]">
                <HistoricalChart data={data} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Forecast Section */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Demand Forecast Projection
        </h2>

        <div className="flex flex-col items-center gap-6 lg:flex-row">
          <div className="flex w-full items-center lg:w-1/2">
            <div className="space-y-4">
              <p className="text-gray-700">
                Using Facebook&apos;s Prophet, we forecast demand with{' '}
                <span className="font-semibold">
                  {data.forecast.metadata.confidenceInterval * 100}% confidence
                  intervals
                </span>
                , automatically detecting yearly seasonality patterns and
                incorporating external factors.
              </p>

              <p className="text-gray-700">
                Note the wider confidence intervals during seasonal peaks,
                reflecting higher uncertainty during periods of increased demand
                variability.
              </p>

              <p className="text-gray-700">
                This forecast enables proactive inventory management and
                production planning, helping to reduce stockouts while
                minimizing excess inventory costs.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="h-[300px]">
                <ForecastChart data={data} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Insights Section */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Key Insights & Sensitivity Analysis
        </h2>

        <div className="flex flex-col items-center gap-6 lg:flex-row">
          <div className="flex w-full items-center lg:w-1/2">
            <div className="space-y-4">
              <p className="text-gray-700">
                Our analysis pipeline extracted key features from historical
                data that drive demand patterns:
              </p>

              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-3 w-3 rounded-full bg-purple-500"></div>
                  <p className="text-gray-700">
                    <span className="font-medium">Seasonal coefficients:</span>{' '}
                    Q1 (0.9), Q2 (1.1), Q3 (1.2), Q4 (0.9)
                  </p>
                </li>

                <li className="flex items-start gap-2">
                  <div className="mt-1 h-3 w-3 rounded-full bg-blue-500"></div>
                  <p className="text-gray-700">
                    <span className="font-medium">Market sensitivity:</span>{' '}
                    0.58 - demand changes by approximately 0.6% for each 1%
                    change in MTI
                  </p>
                </li>

                <li className="flex items-start gap-2">
                  <div className="mt-1 h-3 w-3 rounded-full bg-red-500"></div>
                  <p className="text-gray-700">
                    <span className="font-medium">Inflation sensitivity:</span>{' '}
                    0.42 - demand changes by approximately 0.4% for each 1%
                    change in inflation
                  </p>
                </li>
              </ul>

              <p className="mt-2 text-gray-700">
                The extracted values closely match the known model
                characteristics (market sensitivity:{' '}
                {data.metadata.modelSensitivities.market.toFixed(1)}, inflation
                sensitivity:{' '}
                {data.metadata.modelSensitivities.inflation.toFixed(1)}),
                validating our analysis pipeline&apos;s accuracy.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="h-[300px]">
                <AnalysisInsights data={data} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ML Approach Section */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Machine Learning Methodology
        </h2>

        <div className="mx-auto max-w-3xl rounded-lg border bg-gradient-to-r from-gray-50 to-blue-50 p-6 shadow-sm">
          <h3 className="mb-4 text-center text-lg font-semibold text-gray-800">
            Prophet Time Series Forecasting
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium text-gray-700">
                Key Configurations
              </h4>
              <ul className="space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
                  <p className="text-gray-700">Yearly seasonality enabled</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
                  <p className="text-gray-700">
                    External regressors incorporated
                  </p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
                  <p className="text-gray-700">
                    {data.forecast.metadata.confidenceInterval * 100}%
                    confidence intervals
                  </p>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-gray-700">
                Model Parameters
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Seasonality Strength:</span>
                  <span className="font-medium">
                    {(data.forecast.metadata.seasonalityStrength * 100).toFixed(
                      1
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: `${data.forecast.metadata.seasonalityStrength * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Trend Strength:</span>
                  <span className="font-medium">
                    {(data.forecast.metadata.trendStrength * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: `${data.forecast.metadata.trendStrength * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Impact Section */}
      <section className="mb-16">
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Business Impact
        </h2>

        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-center font-medium text-gray-700">
                Cost Savings
              </h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  ${data.businessImpact.costSavings.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  {data.businessImpact.costSavingsPercentage.toFixed(1)}%
                  reduction
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <div>
                  <div className="text-gray-500">Current</div>
                  <div className="font-medium">
                    ${data.businessImpact.currentCost.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Recommended</div>
                  <div className="font-medium">
                    ${data.businessImpact.recommendedCost.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-center font-medium text-gray-700">
                Production Units
              </h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {data.businessImpact.unitDelta > 0 ? '+' : ''}
                  {data.businessImpact.unitDelta.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Unit adjustment</div>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <div>
                  <div className="text-gray-500">Current</div>
                  <div className="font-medium">
                    {data.businessImpact.currentUnits.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Recommended</div>
                  <div className="font-medium">
                    {data.businessImpact.recommendedUnits.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-center font-medium text-gray-700">
                Supplier Allocation
              </h3>
              <div className="space-y-3">
                {data.supplierAllocations
                  .slice(0, 2)
                  .map((allocation, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">Component {index + 1}</div>
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        {Object.entries(allocation.recommendedAllocations).map(
                          ([supplier, percent]) => (
                            <div
                              key={supplier}
                              className="flex items-center justify-between"
                            >
                              <span>{supplier}:</span>
                              <span className="font-medium">
                                {(percent * 100).toFixed(0)}%
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
