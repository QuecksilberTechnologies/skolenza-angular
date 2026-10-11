/**
 * Reads the `exp` claim of a JWT without verifying its signature — the server is still the
 * authority. Used only to refresh proactively instead of waiting for a 401.
 */
export function getJwtExpiry(token: string): number | null {
  const payload = token?.split('.')[1];
  if (!payload || typeof atob === 'undefined') return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const { exp } = JSON.parse(atob(padded));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * A token we cannot parse, or one carrying no `exp`, counts as NOT expired: the request goes out
 * and the 401 path handles it. Better than locking the user out on an unexpected token shape.
 */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const expiry = getJwtExpiry(token);
  if (expiry === null) return false;

  return expiry - skewSeconds * 1000 <= Date.now();
}
