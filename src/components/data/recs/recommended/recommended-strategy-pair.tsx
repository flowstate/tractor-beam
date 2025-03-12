import React from 'react'
import RecommendedStrategyText from './recommended-strategy-text'
import OptimalStrategyInventory from './optimal-strategy-inventory'

export default function RecommendedStrategyPair() {
  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="w-full lg:w-1/2">
        <RecommendedStrategyText />
      </div>
      <div className="w-full lg:w-1/2">
        <OptimalStrategyInventory />
      </div>
    </div>
  )
}
