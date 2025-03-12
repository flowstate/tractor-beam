import React from 'react'
import { formatCurrency } from '~/lib/utils'

type ImpactData = {
  q1: {
    currentCost: number
    recommendedCost: number
    costDelta: number
    costSavingsPercentage: number
  }
  q2: {
    currentCost: number
    recommendedCost: number
    costDelta: number
    costSavingsPercentage: number
  }
  h1: {
    currentCost: number
    recommendedCost: number
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
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3">
        <h3 className="text-lg font-medium text-white">
          Business Impact Summary
        </h3>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <ImpactColumn
          title="Company-Wide"
          q1Savings={companyImpact.q1.costDelta}
          q2Savings={companyImpact.q2.costDelta}
          totalSavings={companyImpact.h1.costDelta}
          color="blue"
        />

        <ImpactColumn
          title={`${locationId} Location`}
          q1Savings={locationImpact.q1.costDelta}
          q2Savings={locationImpact.q2.costDelta}
          totalSavings={locationImpact.h1.costDelta}
          color="purple"
        />

        <ImpactColumn
          title={`${modelName} @ ${locationId}`}
          q1Savings={modelImpact.q1.costDelta}
          q2Savings={modelImpact.q2.costDelta}
          totalSavings={modelImpact.h1.costDelta}
          color="green"
        />
      </div>
    </div>
  )
}

function ImpactColumn({
  title,
  q1Savings,
  q2Savings,
  totalSavings,
  color,
}: {
  title: string
  q1Savings: number
  q2Savings: number
  totalSavings: number
  color: 'blue' | 'purple' | 'green'
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
  }

  const bgColorClasses = {
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    green: 'bg-green-50',
  }

  return (
    <div className="px-4 py-4">
      <h4 className="mb-3 text-center text-sm font-medium text-gray-600">
        {title}
      </h4>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500">Q1 Savings</p>
          <p className={`text-lg font-semibold ${colorClasses[color]}`}>
            {formatCurrency(q1Savings)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Q2 Savings</p>
          <p className={`text-lg font-semibold ${colorClasses[color]}`}>
            {formatCurrency(q2Savings)}
          </p>
        </div>

        <div className={`mt-2 rounded-md ${bgColorClasses[color]} p-2`}>
          <p className="text-xs font-medium text-gray-600">Total H1 Savings</p>
          <p className={`text-xl font-bold ${colorClasses[color]}`}>
            {formatCurrency(totalSavings)}
          </p>
        </div>
      </div>
    </div>
  )
}
