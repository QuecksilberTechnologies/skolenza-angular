import { GetInstitutionDeleteDependenciesRes, InstitutionDeleteDependency } from '@shared/interfaces';

/** Turns `staffMemberCount` or `staffMembers` into `staffMember`, so the sentence reads naturally. */
const humanise = (key: string): string =>
  key
    .replace(/Count$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

const plural = (label: string, count: number): string =>
  count === 1 ? label.replace(/s$/, '') : label.endsWith('s') ? label : `${label}s`;

const part = (label: string, count: number): string => `${count} ${plural(label, count)}`;

/**
 * A short "this deletes: 12 staffMembers, 3 roles" summary from whatever
 * `GET /Institution/{id}/delete-dependencies` sent back.
 *
 * Swagger publishes no response schema for that route, which is the reason the coverage report
 * left it unwired, so this reads both shapes it plausibly takes - a list of labelled counts, or a
 * flat object of counts - and returns `null` for anything else. `null` means the caller keeps its
 * generic warning: an unrecognised payload must not turn into a misleading number, and must not
 * block a delete that worked before.
 */
export function summariseInstitutionDeleteImpact(
  data: GetInstitutionDeleteDependenciesRes['data'],
): string | null {
  if (!data) return null;

  const parts: string[] = [];

  if (Array.isArray(data)) {
    for (const row of data as InstitutionDeleteDependency[]) {
      const label = row?.label ?? row?.name ?? row?.entity;
      const count = row?.count;
      if (typeof label === 'string' && label.trim() && typeof count === 'number' && count > 0) {
        parts.push(part(humanise(label), count));
      }
    }
  } else if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number' && value > 0) {
        parts.push(part(humanise(key), value));
      }
    }
  }

  return parts.length > 0 ? parts.join(', ') : null;
}
