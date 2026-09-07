const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const TOKEN_KEY = "cardiopredict_access_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveAuthToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Could not reach the CardioPredict API. Make sure the backend is running.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearAuthToken();
    const detail = body?.detail;
    const message = Array.isArray(detail) ? detail[0]?.msg : detail;
    throw new Error(typeof message === "string" ? message : "The request could not be completed.");
  }

  return body as T;
}
