import React from 'react'
import { OriginalQualityChart } from './original-quality-chart'
import { FailureRateChart } from './failure-rate-chart'
import { LeadTimeVarianceChart } from './lead-time-variance-chart'
import { AnalyzedQualityChart } from './analyzed-quality-chart'
import { ForecastChart } from './forecast-chart'
import { ConfidenceIntervalChart } from './confidence-interval-chart'
import { TrendAnalysisSummary } from './trend-analysis-summary'
import type {
  EnhancedVisualizationData,
  ForecastDisplayData,
} from '~/app/data/suppliers/page'

interface SupplierVizProps {
  enhancedData: EnhancedVisualizationData
  forecastData: ForecastDisplayData
}

export const SupplierViz: React.FC<SupplierVizProps> = ({
  enhancedData,
  forecastData,
}) => {
  return (
    <div className="space-y-[30vh]">
      {/* Section 1: Quality Generation and Observable Metrics */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Quality Generation and Observable Metrics
        </h2>

        <div className="flex flex-col gap-10">
          {/* Original Quality Index */}
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="flex w-full items-center lg:w-1/2">
              <div className="space-y-4">
                <p className="text-gray-700">
                  We generated 3 years of supplier quality data with an
                  intentional narrative for Bolt:
                  <span className="mx-1 font-semibold text-red-600">
                    initial decline
                  </span>
                  , followed by{' '}
                  <span className="mx-1 font-semibold text-blue-600">
                    stabilization
                  </span>
                  , and finally{' '}
                  <span className="mx-1 font-semibold text-green-600">
                    improvement
                  </span>{' '}
                  in year 3.
                </p>

                <p className="text-gray-700">
                  This underlying quality index isn't directly observable in the
                  real world, but manifests through two key metrics: component
                  failure rates and delivery lead time variance.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="h-[280px]">
                  <OriginalQualityChart enhancedData={enhancedData} />
                </div>
              </div>
            </div>
          </div>

          {/* Failure Rate Chart */}
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="flex w-full items-center lg:w-1/2">
              <div className="space-y-4">
                <p className="text-gray-700">
                  <span className="font-medium text-orange-500">
                    Component failure rates
                  </span>{' '}
                  are a direct indicator of supplier quality. Higher rates
                  indicate more defective parts, which can lead to production
                  delays and increased costs.
                </p>

                <p className="text-gray-700">
                  Note how the failure rate follows the quality trend but with
                  added noise and volatility, making it challenging to identify
                  the underlying pattern without proper analysis.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="h-[280px]">
                  <FailureRateChart
                    enhancedData={enhancedData}
                    showMonthlyOnly={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lead Time Variance Chart */}
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="flex w-full items-center lg:w-1/2">
              <div className="space-y-4">
                <p className="text-gray-700">
                  <span className="font-medium text-blue-500">
                    Delivery lead time variance
                  </span>{' '}
                  measures how consistently a supplier delivers components on
                  schedule. Positive values indicate late deliveries, while
                  negative values represent early deliveries.
                </p>

                <p className="text-gray-700">
                  Inconsistent delivery timing can disrupt production schedules
                  and inventory management, even if the components themselves
                  are high quality.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="h-[280px]">
                  <LeadTimeVarianceChart
                    enhancedData={enhancedData}
                    showMonthlyOnly={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Analysis and Trend Detection */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Analysis and Trend Detection
        </h2>

        <div className="flex flex-col gap-10">
          {/* Analyzed Quality Chart */}
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="flex w-full items-center lg:w-1/2">
              <div className="space-y-4">
                <p className="text-gray-700">
                  Our analysis pipeline reconstructs a{' '}
                  <span className="font-medium text-purple-600">
                    Combined Quality Index
                  </span>{' '}
                  from the observable metrics, effectively recovering the
                  underlying quality pattern.
                </p>

                <p className="text-gray-700">
                  By combining multiple metrics, we can filter out noise and
                  volatility to reveal the true quality trend, which closely
                  matches the original quality index we generated.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="h-[280px]">
                  <AnalyzedQualityChart enhancedData={enhancedData} />
                </div>
              </div>
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="flex w-full items-center lg:w-1/2">
              <div className="space-y-4">
                <p className="text-gray-700">
                  We analyze trends on a quarterly basis, identifying:
                </p>

                <div className="space-y-3 pl-4">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-3 w-3 rounded-full bg-purple-600"></div>
                    <p className="text-gray-700">
                      <span className="font-medium">Direction</span> - Whether
                      quality is improving, declining, or stable over time
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-3 w-3 rounded-full bg-blue-500"></div>
                    <p className="text-gray-700">
                      <span className="font-medium">Magnitude</span> - The
                      significance of quality changes between quarters
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-3 w-3 rounded-full bg-green-500"></div>
                    <p className="text-gray-700">
                      <span className="font-medium">Confidence</span> -
                      Statistical certainty in our projections based on
                      historical patterns
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-gray-700">
                  Our analysis shows that after a period of decline and
                  stabilization, Bolt is now on a clear improvement trajectory
                  with a confidence level of{' '}
                  <span className="font-semibold text-green-600">
                    {(enhancedData.projection.confidence * 100).toFixed(1)}%
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <div className="h-[280px] overflow-y-auto">
                  <TrendAnalysisSummary enhancedData={enhancedData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Prophet Forecasting */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold text-gray-800">
          Prophet Forecasting
        </h2>

        <div className="flex flex-col gap-10">
          {/* Forecast Chart */}
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="flex w-full items-center lg:w-1/2">
              <div className="space-y-4">
                <p className="text-gray-700">
                  Using Facebook's Prophet, we extend our analysis with
                  sophisticated time series forecasting. Prophet automatically
                  detects the improvement trend in Bolt's quality and projects
                  it forward.
                </p>

                <p className="text-gray-700">
                  The forecast shows continued improvement over the next year,
                  with the rate of improvement gradually stabilizing.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="h-[280px]">
                  <ForecastChart forecastData={forecastData} />
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Interval Chart */}
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="flex w-full items-center lg:w-1/2">
              <div className="space-y-4">
                <p className="text-gray-700">
                  Prophet provides{' '}
                  <span className="font-medium text-blue-400">
                    confidence intervals
                  </span>{' '}
                  that quantify the uncertainty in our forecasts. These
                  intervals widen as we project further into the future,
                  reflecting increased uncertainty.
                </p>

                <p className="text-gray-700">
                  Unlike our analysis pipeline which uses a Combined Quality
                  Index, Prophet directly forecasts the observable metrics used
                  in business decisions.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="h-[280px]">
                  <ConfidenceIntervalChart forecastData={forecastData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
