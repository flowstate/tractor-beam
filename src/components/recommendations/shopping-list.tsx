'use client'
import { useCards } from '~/contexts/cards-context'
import Card from '../ui/card'
import { ShoppingCart, TrendingUp, Truck, CheckCircle, X } from 'lucide-react'
import { formatCurrency } from '~/lib/utils/formatting'
import { COMPONENTS } from '~/lib/constants'
import { useMemo } from 'react'
import type { QuarterlyDisplayCard } from '~/lib/recommendation/recommendation.types'

// Define a type for our supplier-specific order item
interface SupplierOrderItem {
  card: QuarterlyDisplayCard
  supplier: string
  units: number
  percentage: number
  componentName: string
  costImpact: number // Proportional cost impact for this supplier's allocation
}

// Add this to your existing component
interface ShoppingListProps {
  hideHeader?: boolean
}

export default function ShoppingList({
  hideHeader = false,
}: ShoppingListProps) {
  const { shoppingList, removeFromShoppingList } = useCards()

  // Transform cards into supplier-specific order items
  const supplierOrderItems = useMemo(() => {
    const items: SupplierOrderItem[] = []

    shoppingList.forEach((card) => {
      // Get supplier allocations from the card
      const supplierAllocations =
        card.strategy.topLevelSuggestionPieces?.supplierAllocations || []

      // If no allocations, create a single "Unknown" supplier item
      if (supplierAllocations.length === 0) {
        items.push({
          card,
          supplier: 'Unknown',
          units: card.recommendedUnits,
          percentage: 100,
          componentName: COMPONENTS[card.componentId]?.name || card.componentId,
          costImpact: card.costDelta,
        })
        return
      }

      // Create an item for each supplier allocation
      supplierAllocations.forEach((allocation) => {
        // Calculate units for this supplier based on percentage
        const units = Math.round(
          card.recommendedUnits * (allocation.percentage / 100)
        )

        // Calculate proportional cost impact
        const costImpact = card.costDelta * (allocation.percentage / 100)

        items.push({
          card,
          supplier: allocation.supplierId,
          units,
          percentage: allocation.percentage,
          componentName: COMPONENTS[card.componentId]?.name || card.componentId,
          costImpact,
        })
      })
    })

    return items
  }, [shoppingList])

  // Group order items by supplier and location
  const groupedOrders = useMemo(() => {
    const groups: Record<
      string,
      {
        supplier: string
        location: string
        locationId: string
        items: SupplierOrderItem[]
        totalSavings: number
      }
    > = {}

    supplierOrderItems.forEach((item) => {
      // Create a key for this supplier/location combination
      const key = `${item.supplier}-${item.card.locationId}`

      if (!groups[key]) {
        groups[key] = {
          supplier: item.supplier,
          location:
            item.card.locationId.charAt(0).toUpperCase() +
            item.card.locationId.slice(1),
          locationId: item.card.locationId,
          items: [],
          totalSavings: 0,
        }
      }

      groups[key].items.push(item)
      groups[key].totalSavings += Math.abs(item.costImpact)
    })

    // Convert to array and sort by supplier name
    return Object.values(groups).sort((a, b) =>
      a.supplier.localeCompare(b.supplier)
    )
  }, [supplierOrderItems])

  // If the list is empty, show a CTA directly on the background
  if (shoppingList.length === 0) {
    return (
      <div className="border-b border-gray-200 pb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center text-blue-500">
          <Truck className="h-10 w-10" />
        </div>

        <h3 className="mt-3 text-lg font-medium text-gray-900">
          Your procurement list is empty
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Ready to optimize your supply chain? Start by accepting
          recommendations to build your strategic procurement plan.
        </p>

        <p className="mt-3 text-sm text-gray-600">
          Click <span className="font-semibold text-blue-600">Accept</span> on
          any recommendation to add it to your shopping list and track potential
          savings.
        </p>
      </div>
    )
  }

  // Calculate total savings
  const totalSavings = groupedOrders.reduce(
    (total, group) => total + group.totalSavings,
    0
  )

  // If there are items, show the list with a card wrapper
  return (
    <Card className="bg-white p-4">
      {/* Header - only show if hideHeader is false */}
      {!hideHeader && (
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Procurement List
            </h2>
            <p className="text-sm text-gray-500">
              {supplierOrderItems.length} item
              {supplierOrderItems.length !== 1 ? 's' : ''} across{' '}
              {groupedOrders.length} supplier order
              {groupedOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600">
            <TrendingUp className="mr-1 h-4 w-4" />
            {formatCurrency(totalSavings)} optimized
          </div>
        </div>
      )}

      {/* Grouped list items */}
      <div className="space-y-5">
        {groupedOrders.map((group) => (
          <div
            key={`${group.supplier}-${group.locationId}`}
            className="overflow-hidden rounded-lg border border-gray-200"
          >
            {/* Group header with action buttons */}
            <div className="border-b border-gray-200 bg-gray-100 px-4 py-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  Order from{' '}
                  <span className="font-semibold">{group.supplier}</span> for{' '}
                  {group.location}
                </h3>
                <div className="flex gap-2">
                  <button
                    className="flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    title="Mark all items as ordered"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Mark All Ordered
                  </button>
                  <button
                    className="flex items-center rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    title="Remove all items"
                    onClick={() => {
                      // Remove all cards in this group
                      const uniqueCards = new Set(
                        group.items.map((item) => item.card)
                      )
                      uniqueCards.forEach((card) =>
                        removeFromShoppingList(card)
                      )
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Remove All
                  </button>
                </div>
              </div>
            </div>

            {/* Group items - without individual action buttons */}
            <div className="divide-y divide-gray-200">
              {group.items.map((item, index) => (
                <div
                  key={`${item.card.locationId}-${item.card.componentId}-${item.card.quarter}-${item.card.year}-${item.supplier}-${index}`}
                  className="flex items-center justify-between bg-white p-3 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium text-gray-900">
                        {item.componentName}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {item.units} units ({item.percentage}%)
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-green-600">
                      {formatCurrency(Math.abs(item.costImpact))}{' '}
                      {item.costImpact < 0 ? 'savings' : 'cost'} in Q
                      {item.card.quarter}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-center">
        <p className="text-sm font-medium text-blue-700">
          Ready to place orders? Export this list or send to procurement.
        </p>
        <button className="mt-2 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Export Procurement List
        </button>
      </div>
    </Card>
  )
}
