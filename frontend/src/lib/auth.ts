const TOKEN_KEY = "debate_chamber_token";
const USER_KEY = "debate_chamber_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getUsername(): string | null {
  return localStorage.getItem(USER_KEY);
}
export function setAuth(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function asText(r: Response): Promise<string> {
  try {
    const j = await r.json();
    return j.detail ?? j.message ?? r.statusText;
  } catch {
    return r.statusText;
  }
}

export async function login(username: string, password: string): Promise<string> {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(await asText(r));
  const d = await r.json();
  setAuth(d.token, d.username);
  return d.username;
}

export async function registerUser(username: string, password: string): Promise<string> {
  const r = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(await asText(r));
  const d = await r.json();
  setAuth(d.token, d.username);
  return d.username;
}

/** Verify token with backend; returns username or null. */
export async function verifyAuth(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const r = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      clearAuth();
      return null;
    }
    const d = await r.json();
    return d.username;
  } catch {
    return null;
  }
}

/** Build headers with Authorization for fetch. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}
