import React from 'react'
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react'

export default function PipelineOverviewText() {
  return (
    <div className="space-y-6">
      <div className="max-w-[90%]">
        <h3 className="text-xl font-semibold text-gray-800">
          Turning Data into Business Value
        </h3>
        <p className="mt-2 text-gray-700">
          The recommendation engine is where all the generation, analysis, and
          forecasting transform into tangible business impact.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">
              Current Strategy Analysis
            </p>
            <p className="text-sm text-gray-600">
              Calculate costs with existing purchasing patterns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">
              Optimized Recommendations
            </p>
            <p className="text-sm text-gray-600">
              Calculate costs with AI-optimized purchasing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">
              Business Impact Calculation
            </p>
            <p className="text-sm text-gray-600">
              Quantify savings from strategy optimization
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
