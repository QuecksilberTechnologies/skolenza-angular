import { describe, expect, it } from 'vitest';

import { getJwtExpiry, isJwtExpired } from './jwt';

function makeToken(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${body}.signature`;
}

describe('getJwtExpiry', () => {
  it('reads exp as milliseconds', () => {
    expect(getJwtExpiry(makeToken({ exp: 1_700_000_000 }))).toBe(1_700_000_000_000);
  });

  it('returns null for a token without exp', () => {
    expect(getJwtExpiry(makeToken({ sub: 'abc' }))).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(getJwtExpiry('not-a-jwt')).toBeNull();
    expect(getJwtExpiry('header.%%%.signature')).toBeNull();
    expect(getJwtExpiry('')).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('is true for a past exp', () => {
    expect(isJwtExpired(makeToken({ exp: Math.floor(Date.now() / 1000) - 60 }))).toBe(true);
  });

  it('is false for a comfortably future exp', () => {
    expect(isJwtExpired(makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 }))).toBe(false);
  });

  it('treats a token inside the skew window as expired', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 10 });
    expect(isJwtExpired(token, 30)).toBe(true);
    expect(isJwtExpired(token, 0)).toBe(false);
  });

  it('treats an unreadable token as not expired so the server decides', () => {
    expect(isJwtExpired('not-a-jwt')).toBe(false);
    expect(isJwtExpired(makeToken({ sub: 'abc' }))).toBe(false);
  });
});
