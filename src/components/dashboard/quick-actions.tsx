'use client'

import Link from 'next/link'
import Card from '~/components/ui/card'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'

interface QuickAction {
  href: string
  label: string
  count?: number
  status?: 'optimal' | 'warning' | 'critical'
  location?: 'west' | 'south' | 'heartland'
}

export default function QuickActions() {
  // Mock data - would come from API in real implementation
  const actions: QuickAction[] = [
    {
      href: '/inventory?location=west&status=critical',
      label: 'Critical components in West',
      count: 2,
      status: 'critical',
      location: 'west',
    },
    {
      href: '/inventory?location=south&status=critical',
      label: 'Critical components in South',
      count: 1,
      status: 'critical',
      location: 'south',
    },
    {
      href: '/inventory?location=heartland&status=critical',
      label: 'Critical components in Heartland',
      count: 1,
      status: 'critical',
      location: 'heartland',
    },
    {
      href: '/inventory?status=warning',
      label: 'Components needing adjustment',
      count: 8,
      status: 'warning',
    },
    {
      href: '/forecasts',
      label: 'View demand forecasts',
    },
  ]

  const locationColors = {
    west: 'bg-location-west bg-opacity-10 text-location-west hover:bg-opacity-20',
    south:
      'bg-location-south bg-opacity-10 text-location-south hover:bg-opacity-20',
    heartland:
      'bg-location-heartland bg-opacity-10 text-location-heartland hover:bg-opacity-20',
  }

  const statusColors = {
    optimal:
      'bg-status-optimal bg-opacity-10 text-status-optimal hover:bg-opacity-20',
    warning:
      'bg-status-warning bg-opacity-10 text-status-warning hover:bg-opacity-20',
    critical:
      'bg-status-critical bg-opacity-10 text-status-critical hover:bg-opacity-20',
  }

  const statusDotColors = {
    optimal: 'bg-status-optimal',
    warning: 'bg-status-warning',
    critical: 'bg-status-critical',
  }

  // Count critical items
  const criticalCount = actions
    .filter((a) => a.status === 'critical')
    .reduce((sum, action) => sum + (action.count ?? 0), 0)

  return (
    <Card
      title="Priority Actions"
      subtitle={`${criticalCount} components require immediate attention`}
      className="border-l-status-critical h-full border-l-4"
    >
      {criticalCount > 0 && (
        <div className="bg-status-critical text-status-critical mb-3 flex items-center rounded-md bg-opacity-10 p-2">
          <ExclamationTriangleIcon className="mr-2 h-5 w-5" />
          <span className="text-sm font-medium">
            Critical items need attention
          </span>
        </div>
      )}

      <div className="space-y-2">
        {actions.map((action, index) => {
          // Determine background color based on location or status
          let bgColorClass = 'bg-gray-100 text-text-medium hover:bg-gray-200'

          if (action.location) {
            bgColorClass = locationColors[action.location]
          } else if (action.status) {
            bgColorClass = statusColors[action.status]
          }

          return (
            <Link
              key={index}
              href={action.href}
              className={`flex items-center justify-between rounded-md p-3 text-sm font-medium transition-colors ${bgColorClass}`}
            >
              <div className="flex items-center">
                {action.status && (
                  <div
                    className={`mr-2 h-3 w-3 rounded-full ${statusDotColors[action.status]}`}
                  ></div>
                )}
                <span>{action.label}</span>
              </div>
              {action.count !== undefined && (
                <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs font-bold">
                  {action.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
