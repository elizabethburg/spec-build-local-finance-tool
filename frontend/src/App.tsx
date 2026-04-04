import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getAuthStatus, OllamaUnavailableError } from './lib/api'
import SetupScreen from './pages/SetupScreen'
import LockScreen from './pages/LockScreen'
import OllamaErrorScreen from './pages/OllamaErrorScreen'
import UploadScreen from './pages/UploadScreen'
import QAScreen from './pages/QAScreen'

// Stub placeholders for now
const Dashboard = () => <div className="p-8">Dashboard (coming soon)</div>
const Transactions = () => <div className="p-8">Transactions (coming soon)</div>
const Settings = () => <div className="p-8">Settings (coming soon)</div>

function AuthGate() {
  const [status, setStatus] = useState<'loading' | 'setup' | 'lock'>('loading')
  const [ollamaDown, setOllamaDown] = useState(false)

  useEffect(() => {
    getAuthStatus()
      .then(({ setup_complete }) => setStatus(setup_complete ? 'lock' : 'setup'))
      .catch(async (err) => {
        if (err instanceof OllamaUnavailableError) {
          setOllamaDown(true)
        } else {
          // Check if backend itself is down or returning 503
          try {
            const res = await fetch('http://localhost:8000/health')
            if (!res.ok) setOllamaDown(true)
            else setStatus('setup') // fallback
          } catch {
            setOllamaDown(true)
          }
        }
      })
  }, [])

  if (ollamaDown) return <OllamaErrorScreen />
  if (status === 'loading') return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (status === 'setup') return <SetupScreen />
  return <LockScreen />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthGate />} />
      <Route path="/upload" element={<UploadScreen />} />
      <Route path="/qa" element={<QAScreen />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
