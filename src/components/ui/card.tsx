import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
}

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: CardProps) {
  return (
    <div
      className={`shadow-card rounded-lg border border-gray-200 bg-white p-4 ${className}`}
    >
      {(title ?? action) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-text-dark text-xl font-semibold">{title}</h2>
            )}
            {subtitle && (
              <p className="text-text-medium mt-1 text-sm">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
