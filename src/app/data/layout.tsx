'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Navigation items for data pages
  const navItems = [
    { path: '/data/demand', label: 'Demand Forecasting' },
    { path: '/data/suppliers', label: 'Supplier Analysis' },
    { path: '/data/recs', label: 'Recommendations' },
  ]

  return (
    <div className="flex">
      {/* Left sidebar with APP button and navigation */}
      <div className="flex w-48 flex-col space-y-8 p-6">
        {/* APP button on the left for data pages */}
        <Link
          href="/"
          className="flex items-center rounded-md bg-blue-700 px-4 py-3 text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          APP
        </Link>

        {/* Navigation links */}
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                pathname === item.path
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
