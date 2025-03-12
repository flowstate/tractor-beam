import React from 'react'

type ImpactData = {
  q1: {
    costDelta: number
    costSavingsPercentage: number
  }
  q2: {
    costDelta: number
    costSavingsPercentage: number
  }
  h1: {
    costDelta: number
    costSavingsPercentage: number
  }
}

type ImpactCardProps = {
  companyImpact: ImpactData
  locationImpact: ImpactData
  modelImpact: ImpactData
  locationId: string
  modelName: string
}

export default function ImpactCard({
  companyImpact,
  locationImpact,
  modelImpact,
  locationId,
  modelName,
}: ImpactCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-semibold text-gray-800">
        Business Impact Summary
      </h3>
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Company-wide Panel */}
        <div className="flex-1 rounded-lg bg-gray-50 p-4">
          <h4 className="mb-3 font-semibold text-gray-800">Company-Wide</h4>
          <div className="space-y-2">
            <p className="text-sm">
              Q1 Savings:{' '}
              <span className="font-medium">
                ${Math.abs(companyImpact.q1.costDelta).toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              Q2 Savings:{' '}
              <span className="font-medium">
                ${Math.abs(companyImpact.q2.costDelta).toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              Total (H1):{' '}
              <span className="font-medium text-green-600">
                ${Math.abs(companyImpact.h1.costDelta).toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* Location Panel */}
        <div className="flex-1 rounded-lg bg-gray-50 p-4">
          <h4 className="mb-3 font-semibold text-gray-800">
            {locationId} Location
          </h4>
          <div className="space-y-2">
            <p className="text-sm">
              Q1 Savings:{' '}
              <span className="font-medium">
                ${Math.abs(locationImpact.q1.costDelta).toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              Q2 Savings:{' '}
              <span className="font-medium">
                ${Math.abs(locationImpact.q2.costDelta).toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              Total (H1):{' '}
              <span className="font-medium text-green-600">
                ${Math.abs(locationImpact.h1.costDelta).toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* Model Panel */}
        <div className="flex-1 rounded-lg bg-gray-50 p-4">
          <h4 className="mb-3 font-semibold text-gray-800">
            {modelName} @ {locationId}
          </h4>
          <div className="space-y-2">
            <p className="text-sm">
              Q1 Savings:{' '}
              <span className="font-medium">
                ${Math.abs(modelImpact.q1.costDelta).toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              Q2 Savings:{' '}
              <span className="font-medium">
                ${Math.abs(modelImpact.q2.costDelta).toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              Total (H1):{' '}
              <span className="font-medium text-green-600">
                ${Math.abs(modelImpact.h1.costDelta).toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
