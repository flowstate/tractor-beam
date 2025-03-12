'use client'
import { useMemo } from 'react'
import { type SupplierId } from '~/lib/types/types'
import type { SupplierComparisonBlocks } from '~/lib/recommendation/recommendation.types'

interface SupplierComparisonProps {
  suppliers: Array<{
    id: SupplierId
    name: string
    percentage: number
    pricePerUnit: number
    qualityScore: number
    failureRate: number
    allocationReason: string
  }>
  supplierTextColors: Record<SupplierId, string>
  primaryReason?: 'quality' | 'cost' | 'diversity' | 'balance'
  // Optional structured data from our interfaces
  supplierComparison?: SupplierComparisonBlocks
}

export default function SupplierComparison({
  suppliers,
  supplierTextColors,
  primaryReason = 'balance',
  supplierComparison,
}: SupplierComparisonProps) {
  // Find key suppliers for different metrics
  const highestQualitySupplier = useMemo(
    () =>
      suppliers.reduce((prev, current) =>
        prev.qualityScore > current.qualityScore ? prev : current
      ),
    [suppliers]
  )

  const lowestCostSupplier = useMemo(
    () =>
      suppliers.reduce((prev, current) =>
        prev.pricePerUnit < current.pricePerUnit ? prev : current
      ),
    [suppliers]
  )

  const lowestFailureSupplier = useMemo(
    () =>
      suppliers.reduce((prev, current) =>
        prev.failureRate < current.failureRate ? prev : current
      ),
    [suppliers]
  )

  return (
    <div className="my-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Supplier
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Allocation
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Price/Unit
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Quality
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Failure Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                {/* Supplier Name */}
                <td
                  className={`px-3 py-2 text-sm font-medium ${
                    supplierTextColors[supplier.id]
                  }`}
                >
                  {supplier.name}
                </td>

                {/* Allocation Percentage */}
                <td className="px-3 py-2 text-sm text-gray-700">
                  {supplier.percentage}%
                </td>

                {/* Price Per Unit */}
                <td
                  className={`px-3 py-2 text-sm text-gray-700 ${
                    supplier.id === lowestCostSupplier.id ? 'bg-green-50' : ''
                  }`}
                >
                  ${supplier.pricePerUnit.toLocaleString()}
                  {supplier.id === lowestCostSupplier.id && (
                    <span className="ml-1 text-xs text-green-600">(Best)</span>
                  )}
                </td>

                {/* Quality Score */}
                <td
                  className={`px-3 py-2 text-sm text-gray-700 ${
                    supplier.id === highestQualitySupplier.id
                      ? 'bg-green-50'
                      : ''
                  }`}
                >
                  {supplier.qualityScore.toFixed(1)}
                  {supplier.id === highestQualitySupplier.id && (
                    <span className="ml-1 text-xs text-green-600">(Best)</span>
                  )}
                </td>

                {/* Failure Rate */}
                <td
                  className={`px-3 py-2 text-sm text-gray-700 ${
                    supplier.id === lowestFailureSupplier.id
                      ? 'bg-green-50'
                      : ''
                  }`}
                >
                  {(supplier.failureRate * 100).toFixed(2)}%
                  {supplier.id === lowestFailureSupplier.id && (
                    <span className="ml-1 text-xs text-green-600">(Best)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
