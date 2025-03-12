'use client'
import { MarketTrendChart } from '~/app/_components/market-trend-chart'

export default function MarketTrendsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-3xl font-bold">Market Trend Analysis</h1>
      <div className="w-full max-w-6xl">
        <MarketTrendChart />
      </div>
    </main>
  )
}
