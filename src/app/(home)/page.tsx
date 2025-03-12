import RecommendationList from '~/components/recommendations/recommendation-list'
import ShoppingList from '~/components/recommendations/shopping-list'
import TotalImpactSummary from '~/components/recommendations/total-impact-summary'
import { CardsProvider } from '~/contexts/cards-context'
import { Tractor } from 'lucide-react'

export default function Home() {
  return (
    <CardsProvider>
      <div className="flex flex-col gap-6">
        {/* Branding Header */}
        <div className="mb-2 flex items-center">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="text-2xl font-bold">TractorBeam</span>
          </div>
          <span className="ml-3 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            Pull your supply chain into perfect alignment
          </span>
        </div>

        {/* Main content area - equal columns with aligned headers */}
        <div className="flex gap-8">
          {/* Left Column - Shopping List */}
          <div className="w-1/2">
            {/* Shopping List Header - matches height of recommendation header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Procurement List</h2>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Items ready for ordering
                </span>
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  Export List
                </button>
              </div>
            </div>

            {/* Shopping List Component */}
            <ShoppingList hideHeader={true} />
          </div>

          {/* Right Column - Recommendations */}
          <div className="w-1/2">
            {/* Recommendation List Component */}
            <RecommendationList />
          </div>
        </div>
      </div>
    </CardsProvider>
  )
}
