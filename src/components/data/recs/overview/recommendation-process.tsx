import React from 'react'

export default function RecommendationProcess() {
  return (
    <div className="space-y-6">
      <p className="text-gray-700">
        The final stage in our data pipeline is recommendations, where all of
        the previous work generating, analyzing, and predicting is translated
        into concrete business impact.
      </p>

      <h3 className="mb-3 mt-6 text-xl font-semibold text-gray-800">
        Our Process
      </h3>

      <div className="space-y-4">
        {/* Current Strategy */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="mb-2 font-semibold text-gray-700">
            Current Strategy Simulation
          </h4>
          <ol className="ml-5 list-decimal space-y-2 text-gray-600">
            <li>
              Take demand forecasts and calculate component-level requirements
            </li>
            <li>Simulate daily ordering pattern (small, frequent orders)</li>
            <li>
              Calculate net quarterly purchases after accounting for existing
              inventory
            </li>
            <li>
              Allocate purchases between suppliers based on historical patterns
            </li>
            <li>
              Calculate quarterly costs based on each supplier&apos;s component
              pricing
            </li>
          </ol>
        </div>

        {/* Recommended Strategy */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="mb-2 font-semibold text-blue-700">
            Recommended Strategy Calculation
          </h4>
          <ol className="ml-5 list-decimal space-y-2 text-gray-600">
            <li>Take demand forecasts and add safety stock buffer</li>
            <li>Calculate optimal quarterly purchase amounts</li>
            <li>
              Score suppliers using supplier performance forecasts (70% quality,
              30% cost)
            </li>
            <li>
              Determine optimal supplier allocation with risk diversification
            </li>
            <li>
              Adjust purchase amounts to offset projected component failure
              risks
            </li>
          </ol>
        </div>
      </div>

      <div className="rounded-lg bg-purple-50 p-4">
        <h4 className="mb-2 font-semibold text-purple-700">
          Connecting the Pipeline
        </h4>
        <p className="text-gray-600">
          This recommendation process directly leverages both the demand
          forecasting and supplier performance forecasting we&apos;ve explored
          in previous visualizations:
        </p>
        <ul className="mt-2 space-y-2 text-gray-600">
          <li className="flex items-start">
            <span className="mr-2 text-blue-500">•</span>
            <span>
              <strong>Demand Forecasts</strong> determine how many units of each
              component will be needed
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">•</span>
            <span>
              <strong>Supplier Performance Forecasts</strong> drive optimal
              supplier allocation decisions
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
