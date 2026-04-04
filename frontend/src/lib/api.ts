const BASE = "http://localhost:8000";

export async function getAuthStatus(): Promise<{ setup_complete: boolean }> {
  const res = await fetch(`${BASE}/auth/status`);
  return res.json();
}

export async function setupAuth(name: string, pin: string, confirm_pin: string) {
  const res = await fetch(`${BASE}/auth/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, pin, confirm_pin }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json(); // { recovery_phrase, session_token }
}

export async function unlockAuth(pin: string) {
  const res = await fetch(`${BASE}/auth/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json(); // { session_token }
}

export async function getAppStatus(): Promise<{ has_transactions: boolean }> {
  const res = await fetch(`${BASE}/status`);
  return res.json();
}

let _sessionToken: string | null = null;
export function setSessionToken(token: string) { _sessionToken = token; }
export function getSessionToken() { return _sessionToken; }
export function clearSession() { _sessionToken = null; }
