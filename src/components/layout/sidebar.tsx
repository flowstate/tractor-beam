'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  CubeIcon,
  ChartBarIcon,
  BugAntIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const navItems = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Inventory', href: '/inventory', icon: CubeIcon },
  { name: 'Demand', href: '/forecasts', icon: ChartBarIcon },
  {
    name: 'Debug',
    href: '/debug',
    icon: BugAntIcon,
    subItems: [
      { name: 'Recommendations', href: '/debug', icon: CubeIcon },
      {
        name: 'Demand Outlook',
        href: '/debug/outlook',
        icon: PresentationChartLineIcon,
      },
      {
        name: 'Location Demand',
        href: '/debug/location-demand',
        icon: CubeIcon,
      },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    Debug: true, // Start with Debug expanded
  })

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  return (
    <div className="fixed inset-y-0 left-0 w-48 border-r border-gray-200 bg-blue-50 shadow-sm">
      <div className="flex h-16 items-center justify-center border-b border-gray-200">
        <Link href="/" className="text-xl font-bold text-primary">
          SCO
        </Link>
      </div>
      <nav className="mt-6 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              item.subItems?.some((subItem) => pathname === subItem.href)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isExpanded = expandedItems[item.name]

            return (
              <li key={item.name}>
                <div className="flex flex-col">
                  <div
                    className={`flex cursor-pointer items-center rounded-md px-2 py-2 text-sm font-medium ${
                      isActive
                        ? 'bg-primary text-text-light'
                        : 'text-text-medium hover:bg-white hover:text-primary'
                    }`}
                    onClick={() =>
                      hasSubItems ? toggleExpand(item.name) : null
                    }
                  >
                    <Link
                      href={item.href}
                      className="flex flex-grow items-center"
                      onClick={(e) => hasSubItems && e.preventDefault()}
                    >
                      <item.icon className="mr-2 h-5 w-5" aria-hidden="true" />
                      {item.name}
                    </Link>
                    {hasSubItems && (
                      <span className="ml-2">{isExpanded ? '▼' : '▶'}</span>
                    )}
                  </div>

                  {/* Sub-items */}
                  {hasSubItems && isExpanded && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.href
                        return (
                          <li key={subItem.name}>
                            <Link
                              href={subItem.href}
                              className={`flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                                isSubActive
                                  ? 'bg-primary text-text-light'
                                  : 'text-text-medium hover:bg-white hover:text-primary'
                              }`}
                            >
                              <subItem.icon
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              {subItem.name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
