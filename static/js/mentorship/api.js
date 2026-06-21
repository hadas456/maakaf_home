export const API_BASE = window.MENTORSHIP_API_BASE;

const SESSION_KEY = 'mentorship.session';

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function authedFetch(path, options = {}) {
  const session = getSession();
  const result = await apiFetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${session?.idToken}`, ...options.headers },
  });
  if (result.status === 401) {
    clearSession();
    window.location.href = '/he/mentorship/login/';
  }
  return result;
}

export async function apiFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, data: { error: { code: 'NETWORK_ERROR' } } };
  }

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}
