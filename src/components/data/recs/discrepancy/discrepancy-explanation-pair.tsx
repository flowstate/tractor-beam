import React from 'react'
import DiscrepancyExplanationText from './discrepancy-explanation-text'
import CombinedInventoryComparison from './combined-inventory-comparison'

export default function DiscrepancyExplanationPair() {
  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="w-full lg:w-1/2">
        <DiscrepancyExplanationText />
      </div>
      <div className="w-full lg:w-1/2">
        <CombinedInventoryComparison />
      </div>
    </div>
  )
}
