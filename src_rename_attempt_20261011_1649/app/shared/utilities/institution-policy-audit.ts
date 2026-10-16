import { InstitutionPolicyAuditEntry } from '@shared/interfaces';

/** Prefer the server-resolved institution staffMember name while retaining compatibility with older API
 * deployments and audit rows whose historical actor can no longer be resolved. */
export function institutionPolicyAuditActorName(
  entry: Pick<InstitutionPolicyAuditEntry, 'changedById' | 'changedByName'>,
): string {
  return entry.changedByName?.trim() || `StaffMember ${entry.changedById}`;
}

/** The version a policy's detail endpoint reports as current. */
export interface InstitutionPolicyCurrentVersion {
  id: number;
  number: number;
}

/** What the Version cell of a policy audit row shows; `isRawId` marks the id fallback. */
export interface InstitutionPolicyAuditVersion {
  label: string;
  isRawId: boolean;
}

/** Prefer the server-resolved `versionNumber`. Older API deployments omit it, and there is no
 * version-list endpoint, so only the policy's current version can be mapped to its number there;
 * any other version stays as its id. `null` for rows that are not version specific. */
export function institutionPolicyAuditVersion(
  entry: Pick<InstitutionPolicyAuditEntry, 'policyVersionId' | 'versionNumber'>,
  current: InstitutionPolicyCurrentVersion | null,
): InstitutionPolicyAuditVersion | null {
  const versionNumber =
    entry.versionNumber ??
    (current !== null && entry.policyVersionId === current.id ? current.number : null);
  if (versionNumber !== null) return { label: `v${versionNumber}`, isRawId: false };
  if (entry.policyVersionId !== null)
    return { label: `ID ${entry.policyVersionId}`, isRawId: true };
  return null;
}
