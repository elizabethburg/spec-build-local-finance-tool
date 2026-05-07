import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-[#4F3FF0] text-white hover:bg-[#7B6FF5] active:bg-[#4F3FF0]',
    secondary: 'bg-[#EAE8FD] text-[#4F3FF0] hover:bg-[#d4d0fa]',
    ghost:     'bg-transparent text-[#4B5563] hover:bg-gray-100',
    danger:    'bg-[#F06B6B] text-white hover:bg-red-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-[15px]',
    lg: 'px-7 py-3.5 text-[15px]',
  }

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
