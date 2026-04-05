import { Link, useLocation } from 'react-router-dom'

interface TopNavProps {
  onUploadClick: () => void
}

export default function TopNav({ onUploadClick }: TopNavProps) {
  const location = useLocation()

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'text-gray-900'
        : 'text-gray-500 hover:text-gray-800'
    }`

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
        <Link to="/transactions" className={linkClass('/transactions')}>Transactions</Link>
        <span className="text-sm font-medium text-gray-300 cursor-default select-none" role="menuitem" aria-disabled="true">Analytics</span>
        <span className="text-sm font-medium text-gray-300 cursor-default select-none" role="menuitem" aria-disabled="true">Learnings</span>
        <Link to="/settings" className={linkClass('/settings')}>Settings</Link>
      </div>
      <button
        onClick={onUploadClick}
        className="text-sm font-medium text-dusk border border-dusk/30 rounded-lg px-3 py-1.5 hover:bg-dusk/5 transition-colors"
      >
        + Upload
      </button>
    </nav>
  )
}
