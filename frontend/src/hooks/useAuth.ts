import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { getToken, setToken, clearToken } from '../lib/auth'

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(getToken)
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null)

  useEffect(() => {
    api.authStatus().then(s => setSetupComplete(s.setup_complete)).catch(() => {})
  }, [])

  async function setup(name: string, pin: string) {
    const res = await api.setup(name, pin)
    setToken(res.session_token)
    setTokenState(res.session_token)
    return res
  }

  async function unlock(pin: string) {
    const res = await api.unlock(pin)
    setToken(res.session_token)
    setTokenState(res.session_token)
  }

  function logout() {
    clearToken()
    setTokenState(null)
  }

  return { token, setupComplete, setup, unlock, logout, isAuthenticated: !!token }
}
