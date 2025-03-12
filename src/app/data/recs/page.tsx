'use client'

import React from 'react'
import { VizCardsProvider, useCards } from '~/contexts/viz-card-context'
import RecommendationCard from '~/components/recommendations/recommendation-card'
import { FadeIn, SlideIn } from '~/components/animations/scroll-animations'
import PipelineOverviewPair from '~/components/data/recs/overview/pipeline-overview-pair'
import CurrentStrategyPair from '~/components/data/recs/current/current-strategy-pair'
import RecommendedStrategyPair from '~/components/data/recs/recommended/recommended-strategy-pair'
import DiscrepancyExplanationPair from '~/components/data/recs/discrepancy/discrepancy-explanation-pair'

// Component that uses the context
function RecommendationViz() {
  const {
    cards,
    isLoading,
    error,
    totalImpact,
    modelName,
    locationId,
    overallImpact,
    heartlandImpact,
  } = useCards()

  // Get ENGINE-B cards specifically for our initial example
  const engineBCards = cards
    .filter((card) => card.componentId === 'ENGINE-B')
    .sort((a, b) => a.quarter - b.quarter)

  if (isLoading) {
    return <div className="p-8">Loading recommendation data...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  }

  if (!cards.length) {
    return <div className="p-8">No recommendation data found</div>
  }

  return (
    <div>
      {/* Introduction section with title */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-3xl font-bold">
          From Forecasts to Business Impact: The Recommendation Pipeline
        </h1>
        <p className="mx-auto max-w-2xl text-gray-600">
          Scroll down to explore how our system transforms raw data into
          actionable recommendations
        </p>
      </div>

      {/* First section starts higher in the screen - keep this spacing */}
      <div className="h-[20vh]"></div>

      {/* Section 1: Pipeline Overview */}
      <section className="mb-[60vh] pt-16">
        <FadeIn threshold={0.4}>
          <h2 className="mb-8 text-center text-2xl font-bold">
            Pipeline Overview
          </h2>
          <PipelineOverviewPair
            overallImpact={overallImpact}
            heartlandImpact={heartlandImpact}
            totalImpact={totalImpact}
            locationId={locationId}
            modelName={modelName}
          />
        </FadeIn>
      </section>

      {/* Section 2: Current Strategy */}
      <section className="mb-[60vh] pt-16">
        <FadeIn threshold={0.4}>
          <h2 className="mb-8 text-center text-2xl font-bold">
            First, calculate costs with the current strategy
          </h2>
          <CurrentStrategyPair />
        </FadeIn>
      </section>

      {/* Section 3: Recommended Strategy */}
      <section className="mb-[60vh] pt-16">
        <FadeIn threshold={0.4}>
          <h2 className="mb-8 text-center text-2xl font-bold">
            Then, calculate costs with the recommended strategy
          </h2>
          <RecommendedStrategyPair />
        </FadeIn>
      </section>

      {/* Section 4: Impact Analysis - increase spacing */}
      <section className="mb-96 pt-16">
        <FadeIn threshold={0.4}>
          <h2 className="mb-8 text-center text-2xl font-bold">
            Finally, calculate the business impact of optimizing
          </h2>
          <DiscrepancyExplanationPair />
        </FadeIn>
      </section>

      {/* Example Recommendations Section - keep this spacing */}
      <section className="mb-16 pt-16">
        <FadeIn threshold={0.4}>
          <h2 className="mb-12 text-center text-2xl font-bold">
            My Design Process for Recommendations
          </h2>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Left side: Explanatory text */}
            <FadeIn direction="right" threshold={0.4}>
              <div className="space-y-8">
                <p className="text-gray-700">
                  For this project, I created a user profile of an overworked
                  supply chain manager who needs to make complex decisions
                  quickly while justifying them to stakeholders. I designed the
                  recommendations with this persona in mind.
                </p>

                <p className="text-gray-700">
                  I structured the information to answer the questions I
                  anticipated this user would ask:
                </p>

                <ul className="mt-4 space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2 font-bold text-purple-500">→</span>
                    <span>
                      <strong>What's the recommendation?</strong> I made sure
                      each card leads with a clear action and financial impact
                      to provide immediate value.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 font-bold text-purple-500">→</span>
                    <span>
                      <strong>Why this quantity?</strong> I included detailed
                      reasoning based on demand forecasts and inventory levels,
                      accessible through the quantity link.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 font-bold text-purple-500">→</span>
                    <span>
                      <strong>Why these suppliers?</strong> I provided supplier
                      selection rationale through the "allocation" link, showing
                      how I optimized for quality, cost, and risk.
                    </span>
                  </li>
                </ul>

                <div className="mt-6 rounded-lg bg-purple-50 p-5">
                  <h3 className="mb-3 text-lg font-semibold text-purple-800">
                    Progressive Disclosure in My Design
                  </h3>

                  <p className="text-purple-700">
                    I implemented a progressive disclosure pattern where
                    essential information appears first, with options to explore
                    deeper when needed. This approach allows users to quickly
                    grasp recommendations while having access to complete
                    analysis for stakeholder presentations.
                  </p>

                  <p className="mt-3 text-purple-700">
                    The highlighted text in the recommendation serves as an
                    affordance, indicating to users that they can click for more
                    detailed information. I chose this pattern after observing
                    how supply chain professionals need to toggle between
                    high-level and detailed views.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Right side: Recommendation Cards */}
            <div className="space-y-6">
              {engineBCards.map((card) => (
                <SlideIn
                  key={`${card.componentId}-${card.quarter}`}
                  from="left"
                  threshold={0.4}
                >
                  <RecommendationCard
                    card={card}
                    isExpanded={true}
                    disableActions={true}
                  />
                </SlideIn>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  )
}

// Wrap the component with the provider
export default function RecommendationVizPage() {
  return (
    <VizCardsProvider>
      <div className="px-8 pb-24 pt-8">
        <RecommendationViz />
      </div>
    </VizCardsProvider>
  )
}
