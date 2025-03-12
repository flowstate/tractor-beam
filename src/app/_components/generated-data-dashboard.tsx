'use client'

import React from 'react'
import { MarketTrendChart } from './market-trend-chart'
import { LocationDataDashboard } from './location-data-dashboard'

export const GeneratedDataDashboard: React.FC = () => {
  return (
    <div className="w-full pb-20">
      {/* Global Market Trend Chart */}
      <div className="mx-auto mt-12 w-full max-w-6xl rounded-lg bg-white/10 p-6 shadow-lg">
        <MarketTrendChart />
      </div>

      {/* Location-specific Dashboard */}
      <div className="mx-auto mt-12 w-full max-w-6xl rounded-lg bg-white/10 p-6 shadow-lg">
        <LocationDataDashboard />
      </div>
    </div>
  )
}
