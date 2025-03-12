'use client'
import { useMemo } from 'react'
import { type SupplierId } from '~/lib/types/types'
import type { AllocationRationaleBlocks } from '~/lib/recommendation/recommendation.types'

// Define the props for our component
interface AllocationLevelOneTextProps {
  suppliers: Array<{
    id: SupplierId
    name: string
    percentage: number
    allocationReason: string
  }>
  supplierTextColors: Record<SupplierId, string>
  // Optional structured data from our interfaces
  allocationRationale?: AllocationRationaleBlocks
}

export default function AllocationLevelOneText({
  suppliers,
  supplierTextColors,
  allocationRationale,
}: AllocationLevelOneTextProps) {
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

  // Format supplier list with colors
  const supplierList = suppliers.map((supplier, index) => (
    <span key={supplier.id}>
      {index > 0 && index === suppliers.length - 1
        ? ' and '
        : index > 0
          ? ', '
          : ''}
      <span className={supplierTextColors[supplier.id]}>
        {supplier.name} ({supplier.percentage}%)
      </span>
    </span>
  ))

  // Generate concise explanation based on primary reason
  const getReasonText = () => {
    switch (primaryReason) {
      case 'quality':
        return 'This strategy prioritizes quality while maintaining cost efficiency.'
      case 'cost':
        return 'This strategy optimizes cost savings while maintaining acceptable quality.'
      case 'diversity':
        return 'This strategy reduces supply chain risk through diversification.'
      case 'balance':
      default:
        return 'This strategy balances quality and cost for optimal value.'
    }
  }

  return (
    <div className="mb-4">
      <p className="text-gray-700">
        We&apos;re allocating the purchase across{' '}
        <span className="font-medium">{suppliers.length} suppliers</span>:{' '}
        {supplierList}. {getReasonText()}
      </p>
    </div>
  )
}
