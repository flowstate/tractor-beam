import React from 'react'

export default function CurrentStrategyText() {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">
        Current Strategy Simulation
      </h3>
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
  )
}
