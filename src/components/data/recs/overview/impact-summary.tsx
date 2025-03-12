import React from 'react'
import ImpactCard from '../impact-card'
import CurrentStrategyInventory from '../current/current-strategy-inventory'
import OptimalStrategyInventory from '../recommended/optimal-strategy-inventory'

type ImpactData = {
  q1: {
    currentCost: number
    recommendedCost: number
    costDelta: number
    costSavingsPercentage: number
    currentUnits: number
    recommendedUnits: number
    unitDelta: number
  }
  q2: {
    currentCost: number
    recommendedCost: number
    costDelta: number
    costSavingsPercentage: number
    currentUnits: number
    recommendedUnits: number
    unitDelta: number
  }
  h1: {
    currentCost: number
    recommendedCost: number
    costDelta: number
    costSavingsPercentage: number
    currentUnits: number
    recommendedUnits: number
    unitDelta: number
  }
}

type ImpactSummaryProps = {
  overallImpact: ImpactData
  heartlandImpact: ImpactData
  totalImpact: ImpactData
  locationId: string
  modelName: string
}

export default function ImpactSummary({
  overallImpact,
  heartlandImpact,
  totalImpact,
  locationId,
  modelName,
}: ImpactSummaryProps) {
  return (
    <div className="space-y-8">
      <ImpactCard
        companyImpact={overallImpact}
        locationImpact={heartlandImpact}
        modelImpact={totalImpact}
        locationId={locationId}
        modelName={modelName}
      />

      {/* Strategy visualizations with minimal text */}
      <div className="space-y-6">
        <CurrentStrategyInventory />
        <OptimalStrategyInventory />
      </div>
    </div>
  )
}
