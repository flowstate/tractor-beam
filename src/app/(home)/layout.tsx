import React from 'react'
import Link from 'next/link'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1">
      {/* Content column */}
      <div className="flex-1 p-6">{children}</div>

      {/* Data button column - fixed on the right for main app */}
      <div className="flex w-32 flex-shrink-0 items-start justify-end p-6">
        <Link
          href="/data/recs"
          className="flex items-center rounded-md bg-red-700 px-4 py-3 text-white"
        >
          DATA
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="ml-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  )
}
