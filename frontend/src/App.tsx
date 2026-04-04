import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getAuthStatus } from './lib/api'
import SetupScreen from './pages/SetupScreen'
import LockScreen from './pages/LockScreen'

// Stub placeholders for now
const UploadScreen = () => <div className="p-8">Upload Screen (coming soon)</div>
const Dashboard = () => <div className="p-8">Dashboard (coming soon)</div>
const Transactions = () => <div className="p-8">Transactions (coming soon)</div>
const Settings = () => <div className="p-8">Settings (coming soon)</div>

function AuthGate() {
  const [status, setStatus] = useState<'loading' | 'setup' | 'lock'>('loading')

  useEffect(() => {
    getAuthStatus().then(({ setup_complete }) => {
      setStatus(setup_complete ? 'lock' : 'setup')
    })
  }, [])

  if (status === 'loading') return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (status === 'setup') return <SetupScreen />
  return <LockScreen />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthGate />} />
      <Route path="/upload" element={<UploadScreen />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
