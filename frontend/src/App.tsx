import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { SetupPage } from './pages/SetupPage'
import { DashboardPage } from './pages/DashboardPage'
import { AccountsPage } from './pages/AccountsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { UploadPage } from './pages/UploadPage'
import { QAPage } from './pages/QAPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function AuthGate() {
  const auth = useAuth()

  if (auth.setupComplete === null) {
    return <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center text-[#94A3B8]">Loading...</div>
  }

  if (!auth.setupComplete) {
    return <SetupPage onSetup={auth.setup} />
  }

  if (!auth.isAuthenticated) {
    return <LoginPage onUnlock={auth.unlock} />
  }

  return <AppShell />
}

function AppShell() {
  const navigate = useNavigate()

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/accounts', label: 'Accounts' },
    { to: '/transactions', label: 'Transactions' },
    { to: '/qa', label: 'Review' },
    { to: '/settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Nav */}
      <nav className="bg-[#F8F7FF] border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span
            className="text-[#4F3FF0] font-semibold text-lg cursor-pointer"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onClick={() => navigate('/dashboard')}
          >
            Vantage
          </span>

          <div className="flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'text-[#4F3FF0] font-medium bg-[#EAE8FD]'
                      : 'text-[#4B5563] hover:text-[#1A1535] hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-1.5 bg-[#4F3FF0] text-white rounded-lg text-sm font-medium hover:bg-[#7B6FF5] transition-colors"
          >
            + Upload
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/qa" element={<QAPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
