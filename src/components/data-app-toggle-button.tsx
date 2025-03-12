'use client'

import Link from 'next/link'

import { usePathname } from 'next/navigation'

export function DataAppToggleButton() {
  const pathname = usePathname()
  const isDataPage = pathname.startsWith('/data')

  return isDataPage ? (
    <Link
      href="/"
      className="flex items-center justify-center rounded-md bg-blue-700 px-4 py-3 text-white"
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
  ) : (
    <Link
      href="/data"
      className="flex items-center justify-center rounded-md bg-red-700 px-4 py-3 text-white"
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
  )
}
