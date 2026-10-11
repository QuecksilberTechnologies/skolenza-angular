/** One Published policy version the staffMembers can be mapped to. */
export interface PublishedPolicy {
  policyId: number;
  versionId: number;
  versionNumber: number;
  code: string;
  name: string;
  policyTypeName: string;
  /** `yyyy-MM-dd`; null when the version detail could not be loaded. */
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface PublishedPolicyFilters {
  search: string;
  versionNumber: number | null;
  year: number | null;
}

/** `DynamicDialogConfig.data` for the map dialog. */
export interface StaffMemberPolicyMapDialogData {
  policy: PublishedPolicy;
}

export const hasActiveFilters = (filters: PublishedPolicyFilters): boolean =>
  !!filters.search || filters.versionNumber !== null || filters.year !== null;

const yearOf = (date: string) => Number(date.slice(0, 4));

/** True when the policy's effective window touches any day of `year`. */
export function overlapsYear(policy: PublishedPolicy, year: number): boolean {
  if (!policy.effectiveFrom) return false;
  return (
    yearOf(policy.effectiveFrom) <= year &&
    (!policy.effectiveTo || yearOf(policy.effectiveTo) >= year)
  );
}

export function matchesFilters(policy: PublishedPolicy, filters: PublishedPolicyFilters): boolean {
  const term = filters.search.toLowerCase();
  return (
    (!term ||
      policy.name.toLowerCase().includes(term) ||
      policy.code.toLowerCase().includes(term) ||
      policy.policyTypeName.toLowerCase().includes(term)) &&
    (filters.versionNumber === null || policy.versionNumber === filters.versionNumber) &&
    (filters.year === null || overlapsYear(policy, filters.year))
  );
}

/** Every year from the earliest start to the latest end, an open end counting as `currentYear`. */
export function policyYears(policies: PublishedPolicy[], currentYear: number): number[] {
  const dated = policies.filter((policy) => policy.effectiveFrom);
  if (!dated.length) return [];

  const first = Math.min(...dated.map((policy) => yearOf(policy.effectiveFrom!)));
  const last = Math.max(
    ...dated.map((policy) =>
      policy.effectiveTo
        ? yearOf(policy.effectiveTo)
        : Math.max(currentYear, yearOf(policy.effectiveFrom!)),
    ),
  );
  return Array.from({ length: last - first + 1 }, (_, i) => last - i);
}
