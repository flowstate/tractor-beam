import React from 'react'

export default function RecommendedStrategyText() {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-blue-700">
        Recommended Strategy Calculation
      </h3>
      <ol className="ml-5 list-decimal space-y-2 text-gray-600">
        <li>Take demand forecasts and add safety stock buffer</li>
        <li>Calculate optimal quarterly purchase amounts</li>
        <li>
          Score suppliers using supplier performance forecasts (70% quality, 30%
          cost)
        </li>
        <li>Determine optimal supplier allocation with risk diversification</li>
        <li>
          Adjust purchase amounts to offset projected component failure risks
        </li>
      </ol>
    </div>
  )
}
