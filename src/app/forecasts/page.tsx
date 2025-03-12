import ForecastFilters from '~/components/forecasts/forecast-filters'
import ModelDemandChart from '~/components/forecasts/model-demand-chart'
import ComponentDemandChart from '~/components/forecasts/component-demand-chart'
import SupplierPerformanceChart from '~/components/forecasts/supplier-performance-chart'
import SeasonalPatternChart from '~/components/forecasts/seasonal-pattern-chart'

export default function ForecastsPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Demand & Performance Forecasts
        </h1>
        <p className="mt-2 text-gray-600">
          Detailed forecasts for model demand and supplier performance
        </p>
      </div>

      <ForecastFilters />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <ModelDemandChart />
          <ComponentDemandChart />
        </div>

        <div className="space-y-6">
          <SupplierPerformanceChart />
          <SeasonalPatternChart />
        </div>
      </div>
    </div>
  )
}
