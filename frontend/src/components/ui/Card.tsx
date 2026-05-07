import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const pad = { sm: 'p-4', md: 'p-6', lg: 'p-8' }[padding]
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${pad} ${className}`}>
      {children}
    </div>
  )
}
