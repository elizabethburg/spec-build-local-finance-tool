import { CATEGORY_COLORS } from '../../design/tokens'

interface BadgeProps {
  label: string
  color?: string
}

export function Badge({ label, color }: BadgeProps) {
  const bg = color || CATEGORY_COLORS[label] || '#CBD5E1'

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg + '22', color: bg, border: `1px solid ${bg}44` }}
    >
      {label}
    </span>
  )
}

export function AccountTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    CHECKING:    '#4F3FF0',
    SAVINGS:     '#2ECC8F',
    CREDIT_CARD: '#F06B6B',
    INVESTMENT:  '#9B6DFF',
    LOAN:        '#F5A623',
  }
  const labels: Record<string, string> = {
    CHECKING: 'Checking', SAVINGS: 'Savings', CREDIT_CARD: 'Credit Card',
    INVESTMENT: 'Investment', LOAN: 'Loan',
  }
  return <Badge label={labels[type] || type} color={colors[type] || '#94A3B8'} />
}
