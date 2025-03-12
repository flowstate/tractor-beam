import React from 'react'

export default function DiscrepancyExplanationText() {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">
        The Q1-Q2 "Discrepancy" Explained
      </h3>

      <p className="text-gray-700">
        Looking at our recommendations, you'll notice a pattern:{' '}
        <strong>Q1 typically shows much larger savings than Q2</strong>. This
        isn't a flaw in our system—it's a direct result of the different
        inventory strategies being compared:
      </p>

      <p className="text-gray-700">
        <span className="font-semibold text-blue-500">Current Strategy</span>{' '}
        maintains consistently high inventory levels across quarters, with small
        frequent orders, and{' '}
        <span className="font-semibold">
          starts Q2 with the same high inventory level as Q1
        </span>
        .
      </p>

      <p className="text-gray-700">
        <span className="font-semibold text-green-600">
          Recommended Strategy
        </span>{' '}
        leverages existing inventory in Q1 with strategic bulk purchases, and{' '}
        <span className="font-semibold">
          starts Q2 with minimal inventory (just safety stock)
        </span>
        .
      </p>

      <p className="text-gray-700">
        While Q1 shows dramatic savings and Q2 shows smaller savings (or
        sometimes even slighly higher costs), the{' '}
        <strong>cumulative H1 savings</strong> demonstrate the true value of our
        approach. This is why we tend to present both quarterly and half-year
        totals.
      </p>
    </div>
  )
}
