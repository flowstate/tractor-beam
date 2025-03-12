'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'

interface DataAppButtonProps {
  position: 'left' | 'right'
}

export function DataAppButton({ position }: DataAppButtonProps) {
  const pathname = usePathname()
  const isDataPage = pathname.startsWith('/data')

  // Determine button properties based on current page and desired position
  const buttonProps = isDataPage
    ? {
        href: '/',
        className: 'bg-blue-700',
        text: 'APP',
        icon: (
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
        ),
      }
    : {
        href: '/data/recs',
        className: 'bg-red-700',
        text: 'DATA',
        icon: (
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
        ),
      }

  return (
    <motion.div
      initial={{ x: position === 'right' ? 20 : -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        href={buttonProps.href}
        className={`flex items-center rounded-md px-4 py-3 text-white ${buttonProps.className}`}
      >
        {isDataPage && buttonProps.icon}
        {buttonProps.text}
        {!isDataPage && buttonProps.icon}
      </Link>
    </motion.div>
  )
}
