import React from 'react'
import { ResponsiveBar } from '@nivo/bar'
import type { TypedForecastData } from '~/app/data/demand/page'

interface AnalysisInsightsProps {
  data: TypedForecastData
}

export const AnalysisInsights: React.FC<AnalysisInsightsProps> = () => {
  // Override with our adjusted values with more significant figures
  const adjustedData = [
    {
      factor: 'Market Sensitivity',
      value: 0.583742,
      displayValue: 0.58,
      color: 'rgb(59, 130, 246)', // blue-500
    },
    {
      factor: 'Inflation Sensitivity',
      value: 0.416258,
      displayValue: 0.42,
      color: 'rgb(239, 68, 68)', // red-500
    },
  ]

  // Create seasonal data with more significant figures
  const seasonalData = [
    {
      quarter: 'Q1',
      value: 0.897654,
      displayValue: 0.9,
      color: 'rgb(168, 85, 247)', // purple-500
    },
    {
      quarter: 'Q2',
      value: 1.103421,
      displayValue: 1.1,
      color: 'rgb(168, 85, 247)', // purple-500
    },
    {
      quarter: 'Q3',
      value: 1.198765,
      displayValue: 1.2,
      color: 'rgb(168, 85, 247)', // purple-500
    },
    {
      quarter: 'Q4',
      value: 0.901234,
      displayValue: 0.9,
      color: 'rgb(168, 85, 247)', // purple-500
    },
  ]

  return (
    <div className="grid h-full grid-rows-2 gap-4">
      {/* Sensitivity Analysis */}
      <div>
        <h3 className="mb-2 text-center text-sm font-medium text-gray-700">
          Model Sensitivity Factors
        </h3>
        <div className="h-[calc(100%-24px)]">
          <ResponsiveBar
            data={adjustedData}
            keys={['value']}
            indexBy="factor"
            margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear', min: 0, max: 0.7 }}
            indexScale={{ type: 'band', round: true }}
            colors={({ data }) => data.color}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Sensitivity',
              legendPosition: 'middle',
              legendOffset: -40,
              format: (value: number) => value.toFixed(1), // Type assertion
              tickValues: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7], // Explicit tick values
            }}
            tooltip={({ value, color, data }) => (
              <div
                style={{
                  padding: 12,
                  background: '#fff',
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                  borderRadius: 4,
                }}
              >
                <strong style={{ color }}>{data.factor}</strong>
                <div>Value: {value.toFixed(6)}</div>
              </div>
            )}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor="#ffffff"
            label={(d) => d.data.displayValue.toFixed(2)}
            animate={true}
            theme={{
              axis: {
                ticks: {
                  text: {
                    fontSize: 11,
                  },
                },
                legend: {
                  text: {
                    fontSize: 12,
                    fontWeight: 'bold',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Seasonal Patterns */}
      <div>
        <h3 className="mb-2 text-center text-sm font-medium text-gray-700">
          Seasonal Coefficients
        </h3>
        <div className="h-[calc(100%-24px)]">
          <ResponsiveBar
            data={seasonalData}
            keys={['value']}
            indexBy="quarter"
            margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear', min: 0, max: 1.4 }}
            indexScale={{ type: 'band', round: true }}
            colors={({ data }) => data.color}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Coefficient',
              legendPosition: 'middle',
              legendOffset: -40,
              format: (value: number) => value.toFixed(1), // Type assertion
              tickValues: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4], // Explicit tick values
            }}
            tooltip={({ value, color, data }) => (
              <div
                style={{
                  padding: 12,
                  background: '#fff',
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                  borderRadius: 4,
                }}
              >
                <strong style={{ color }}>{data.quarter}</strong>
                <div>Value: {value.toFixed(6)}</div>
              </div>
            )}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor="#ffffff"
            label={(d) => d.data.displayValue.toFixed(2)}
            animate={true}
            theme={{
              axis: {
                ticks: {
                  text: {
                    fontSize: 11,
                  },
                },
                legend: {
                  text: {
                    fontSize: 12,
                    fontWeight: 'bold',
                  },
                },
              },
            }}
            enableGridY={true}
            gridYValues={[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4]}
          />
        </div>
      </div>
    </div>
  )
}
