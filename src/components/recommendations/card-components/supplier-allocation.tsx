'use client'
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { type SupplierId } from '~/lib/types/types'
import AllocationLevelOneText from './allocation/allocation-level-one-text'
import AllocationLevelTwoText from './allocation/allocation-level-two-text'
import SupplierComparison from './allocation/supplier-comparison'

// Define the props for our component
interface SupplierAllocationProps {
  onClose: () => void
  // Optional props to override defaults
  totalUnits?: number
}

// Supplier data constants
const suppliers = [
  {
    id: 'Bolt',
    name: 'Bolt',
    percentage: 36,
    pricePerUnit: 1900,
    qualityScore: 97.5,
    failureRate: 0.1036,
    allocationReason: 'quality',
  },
  {
    id: 'Crank',
    name: 'Crank',
    percentage: 35,
    pricePerUnit: 2000,
    qualityScore: 98.3,
    failureRate: 0.0169,
    allocationReason: 'quality',
  },
  {
    id: 'Elite',
    name: 'Elite',
    percentage: 29,
    pricePerUnit: 2300,
    qualityScore: 99.7,
    failureRate: 0.0052,
    allocationReason: 'quality',
  },
]

// Supplier colors for visualization
const supplierColors: Record<SupplierId, string> = {
  Bolt: 'bg-blue-500',
  Crank: 'bg-green-500',
  Elite: 'bg-purple-500',
  Atlas: 'bg-yellow-500',
  Dynamo: 'bg-red-500',
}

// Supplier text colors
const supplierTextColors: Record<SupplierId, string> = {
  Bolt: 'text-blue-600',
  Crank: 'text-green-600',
  Elite: 'text-purple-600',
  Atlas: 'text-yellow-600',
  Dynamo: 'text-red-600',
}

export default function SupplierAllocation({
  onClose,
  totalUnits = 15827,
}: SupplierAllocationProps) {
  // State for detailed view
  const [detailedOpen, setDetailedOpen] = useState(false)

  // Toggle detailed view
  const toggleDetailed = () => {
    setDetailedOpen(!detailedOpen)
  }

  // Calculate units per supplier
  const supplierUnits = suppliers.map((supplier) => ({
    ...supplier,
    units: Math.round(totalUnits * (supplier.percentage / 100)),
  }))

  // Determine primary reason from supplier allocations
  const primaryReason = useMemo(() => {
    // Count allocation reasons
    const reasonCounts: Record<string, number> = {}
    suppliers.forEach((supplier) => {
      reasonCounts[supplier.allocationReason] =
        (reasonCounts[supplier.allocationReason] || 0) + 1
    })

    // Return most common reason
    return Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0][0] as
      | 'quality'
      | 'cost'
      | 'diversity'
      | 'balance'
  }, [suppliers])

  return (
    <div>
      {/* Level 1: Header with title and close button */}
      <div className="relative mb-3">
        <h3 className="pr-6 text-lg font-medium">
          Why this allocation strategy?
        </h3>
        <button
          onClick={onClose}
          className="absolute right-0 top-0 p-1 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Level 1: Concise explanation and distribution panel side by side */}
      <div className="mb-4 flex flex-col md:flex-row md:items-start md:gap-4">
        <div className="flex-1">
          <AllocationLevelOneText
            suppliers={suppliers}
            supplierTextColors={supplierTextColors}
          />
        </div>

        <div className="mt-2 md:mt-0 md:w-2/5">
          <div className="mb-2 text-center text-sm font-medium text-gray-700">
            Distributing {totalUnits.toLocaleString()} units across suppliers
          </div>
          <div className="flex justify-between text-sm">
            {supplierUnits.map((supplier) => (
              <div key={supplier.id} className="text-center">
                <div
                  className={`font-medium ${supplierTextColors[supplier.id as SupplierId]}`}
                >
                  {supplier.name}
                </div>
                <div>{supplier.units.toLocaleString()} units</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle button for detailed analysis - positioned between Level 1 and Level 2 */}
      {!detailedOpen ? (
        <button
          onClick={toggleDetailed}
          className="flex w-full items-center justify-center border-t border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <ChevronDown className="mr-1 h-4 w-4" />
          See detailed analysis
        </button>
      ) : (
        <div className="border-t border-gray-200 pt-4">
          {/* Level 2: Header with title and close button */}
          <div className="relative mb-4">
            <h3 className="pr-6 text-lg font-medium">
              How we compared suppliers
            </h3>
            <button
              onClick={toggleDetailed}
              className="absolute right-0 top-0 p-1 text-gray-500 hover:text-gray-700"
              aria-label="Close detailed view"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Level 2: Detailed content */}
          <div className="space-y-6">
            {/* Supplier Comparison */}
            <SupplierComparison
              suppliers={suppliers}
              supplierTextColors={supplierTextColors}
              primaryReason={primaryReason}
            />

            {/* Level 2 Text */}
            <AllocationLevelTwoText
              suppliers={suppliers}
              supplierTextColors={supplierTextColors}
              totalUnits={totalUnits}
            />

            {/* Cost Impact - Redesigned as horizontal pair with narrative */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex flex-col md:flex-row md:items-start md:gap-8">
                <div className="flex-1">
                  <p className="text-gray-700">
                    We considered a simpler single-supplier approach using only{' '}
                    <span className={supplierTextColors.Elite}>Elite</span>, but
                    this would have been both riskier and more expensive.
                  </p>
                </div>

                <div className="mt-3 md:mt-0 md:w-2/5">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Multi-supplier cost:</span>
                      <span className="font-medium text-gray-900">
                        $32,461,200
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Single-supplier cost:</span>
                      <span className="font-medium text-gray-900">
                        $36,402,100
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-1">
                      <span>Savings:</span>
                      <span className="font-medium text-green-600">
                        $3,940,900
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
