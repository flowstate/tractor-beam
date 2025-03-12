'use client'
import { useMemo } from 'react'
import { type SupplierId } from '~/lib/types/types'
import { formatCurrency } from '~/lib/utils/formatting'
import type {
  AllocationRationaleBlocks,
  SupplierComparisonBlocks,
} from '~/lib/recommendation/recommendation.types'

// Define the props for our component
interface AllocationLevelTwoTextProps {
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
  totalUnits: number
  // Optional structured data from our interfaces
  allocationRationale?: AllocationRationaleBlocks
  supplierComparison?: SupplierComparisonBlocks
}

export default function AllocationLevelTwoText({
  suppliers,
  supplierTextColors,
  totalUnits,
  allocationRationale,
  supplierComparison,
}: AllocationLevelTwoTextProps) {
  // Find highest quality supplier
  const highestQualitySupplier = useMemo(
    () =>
      suppliers.reduce((prev, current) =>
        prev.qualityScore > current.qualityScore ? prev : current
      ),
    [suppliers]
  )

  // Calculate cost savings compared to using only the highest quality supplier
  const costSavings = useMemo(() => {
    // Calculate weighted average price per unit
    const weightedAvgPrice = suppliers.reduce(
      (sum, supplier) =>
        sum + supplier.pricePerUnit * (supplier.percentage / 100),
      0
    )

    // Calculate savings compared to using only highest quality supplier
    return (highestQualitySupplier.pricePerUnit - weightedAvgPrice) * totalUnits
  }, [suppliers, highestQualitySupplier, totalUnits])

  // Format cost savings
  const formattedSavings = formatCurrency(costSavings)

  // Determine primary reason from structured data or infer from supplier allocations
  const primaryReason = useMemo(() => {
    if (allocationRationale?.primaryReason) {
      return allocationRationale.primaryReason
    }

    // Count allocation reasons
    const reasonCounts: Record<string, number> = {}
    suppliers.forEach((supplier) => {
      reasonCounts[supplier.allocationReason] =
        (reasonCounts[supplier.allocationReason] || 0) + 1
    })

    // Return most common reason
    return Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0][0]
  }, [suppliers, allocationRationale])

  // Generate detailed explanation based on primary reason
  const generateDetailedExplanation = () => {
    switch (primaryReason) {
      case 'quality':
        return (
          <>
            <span className={supplierTextColors[highestQualitySupplier.id]}>
              {highestQualitySupplier.name}
            </span>{' '}
            offers the highest quality with a failure rate of just{' '}
            {(highestQualitySupplier.failureRate * 100).toFixed(2)}%, but using
            them exclusively would cost significantly more. By balancing with
            more cost-effective options, we save approximately{' '}
            <span className="font-medium text-green-600">
              {formattedSavings}
            </span>{' '}
            while maintaining excellent overall quality.
          </>
        )

      case 'cost':
        return (
          <>
            Using multiple suppliers with different price points saves
            approximately{' '}
            <span className="font-medium text-green-600">
              {formattedSavings}
            </span>{' '}
            compared to using only{' '}
            <span className={supplierTextColors[highestQualitySupplier.id]}>
              {highestQualitySupplier.name}
            </span>
            , while still maintaining acceptable quality standards.
          </>
        )

      case 'diversity':
        return (
          <>
            This diversification strategy protects against supply chain
            disruptions while still achieving{' '}
            <span className="font-medium text-green-600">
              {formattedSavings}
            </span>{' '}
            in savings compared to a single-supplier approach.
          </>
        )

      default:
        return (
          <>
            This balanced approach saves approximately{' '}
            <span className="font-medium text-green-600">
              {formattedSavings}
            </span>{' '}
            compared to using only premium suppliers, while maintaining high
            quality standards.
          </>
        )
    }
  }

  return (
    <div className="mb-4 text-gray-700">{generateDetailedExplanation()}</div>
  )
}
