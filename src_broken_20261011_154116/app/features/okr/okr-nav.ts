const OKR_ORIGINS = ['my', 'team', 'company', 'dashboard'] as const;

/** Resolves the `?from=` origin into a list/dashboard route; falls back to dashboard. */
export function resolveOkrOrigin(from: string | null | undefined): string {
  return from && (OKR_ORIGINS as readonly string[]).includes(from)
    ? `/app/okr/${from}`
    : '/app/okr/dashboard';
}
