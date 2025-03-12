import React from 'react'
import CurrentStrategyText from './current-strategy-text'
import CurrentStrategyInventory from './current-strategy-inventory'

export default function CurrentStrategyPair() {
  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="w-full lg:w-1/2">
        <CurrentStrategyText />
      </div>
      <div className="w-full lg:w-1/2">
        <CurrentStrategyInventory />
      </div>
    </div>
  )
}
