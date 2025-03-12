import React from 'react'
import PipelineOverviewText from './pipeline-overview-text'
import ImpactCard from './impact-card'

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

type PipelineOverviewPairProps = {
  overallImpact: ImpactData
  heartlandImpact: ImpactData
  totalImpact: ImpactData
  locationId: string
  modelName: string
}

// Export the text component separately
export const Text = () => {
  return <PipelineOverviewText />
}

// Export the visual component separately
export const Visual = ({
  overallImpact,
  heartlandImpact,
  totalImpact,
  locationId,
  modelName,
}: PipelineOverviewPairProps) => {
  return (
    <ImpactCard
      companyImpact={overallImpact}
      locationImpact={heartlandImpact}
      modelImpact={totalImpact}
      locationId={locationId}
      modelName={modelName}
    />
  )
}

// Keep the original component for backward compatibility
export default function PipelineOverviewPair({
  overallImpact,
  heartlandImpact,
  totalImpact,
  locationId,
  modelName,
}: PipelineOverviewPairProps) {
  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="w-full lg:w-1/2">
        <PipelineOverviewText />
      </div>
      <div className="w-full lg:w-1/2">
        <ImpactCard
          companyImpact={overallImpact}
          locationImpact={heartlandImpact}
          modelImpact={totalImpact}
          locationId={locationId}
          modelName={modelName}
        />
      </div>
    </div>
  )
}
