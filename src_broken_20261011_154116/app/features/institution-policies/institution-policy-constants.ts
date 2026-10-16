import { InstitutionPolicyLifecycleAction, InstitutionPolicyStatus } from '@shared/interfaces';

/** The Policy Definitions list, and the base every policy route builds on. */
export const POLICY_LIST_ROUTE = '/app/institution-policies';

export const policyCreateRoute = (): unknown[] => [POLICY_LIST_ROUTE, 'new'];

/** Edit opens the list row's `currentVersionId`, which a newer Draft owns over an older Published. */
export const policyEditRoute = (policyId: number, versionId: number): unknown[] => [
  POLICY_LIST_ROUTE,
  policyId,
  'versions',
  versionId,
  'edit',
];

/** Route `data` key the policy form reads its mode from. Edit mode comes from the route config, so
 *  an edit URL whose ids fail to parse is an error, never a silent create. */
export const POLICY_FORM_MODE_KEY = 'policyFormMode';
export type PolicyFormMode = 'create' | 'edit';

/** Policy Definitions: governs a policy's `View`/`Add`/`Update`/`Submit`/`Archive`, its lookups,
 *  and its versions' documents. */
export const DEFINITIONS_MODULE_CODE = 'INSTITUTION_POLICY_DEFINITIONS';

/** Policy Approvals: owns the approval configuration and the `APPROVE`/`REJECT`/`PUBLISH` grants —
 *  see `docs/specs/INSTITUTION_POLICY/INSTITUTION_POLICY_API.md`'s "Availability and authentication". */
export const APPROVALS_MODULE_CODE = 'INSTITUTION_POLICY_APPROVALS';

/** Policy Types: a separate leaf, so screens that only show a policy-type name or filter gate that
 *  lookup on this module's own `View` grant rather than their own. */
export const TYPES_MODULE_CODE = 'INSTITUTION_POLICY_TYPES';

/** Policy Assignments: maps a Published version to staffMembers and lists its candidates. */
export const ASSIGNMENTS_MODULE_CODE = 'INSTITUTION_POLICY_ASSIGNMENTS';

/** The leaf each lifecycle action is granted on. Archive is the odd one out because the Approvals
 *  leaf publishes only `Approve`, `Publish`, `Reject`, `Review` and `View`; `Archive` lives on
 *  Definitions. */
export const LIFECYCLE_MODULE_CODE: Record<InstitutionPolicyLifecycleAction, string> = {
  SUBMIT: DEFINITIONS_MODULE_CODE,
  ARCHIVE: DEFINITIONS_MODULE_CODE,
  APPROVE: APPROVALS_MODULE_CODE,
  REJECT: APPROVALS_MODULE_CODE,
  PUBLISH: APPROVALS_MODULE_CODE,
};

/** Draft and Rejected are the only statuses `PUT /versions/{id}` accepts and the only ones that can
 *  be submitted; Published versions are immutable. */
export const EDITABLE_STATUSES: readonly InstitutionPolicyStatus[] = ['Draft', 'Rejected'];

/** The DTOs type `status` as a plain string, so a typed status list is matched through this. */
export const hasStatus = (statuses: readonly InstitutionPolicyStatus[], status: string): boolean =>
  (statuses as readonly string[]).includes(status);

export type InstitutionPolicyStatusSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const STATUS_SEVERITY: Record<string, InstitutionPolicyStatusSeverity> = {
  Draft: 'secondary',
  'Under Review': 'info',
  Approved: 'info',
  Published: 'success',
  Rejected: 'danger',
  Archived: 'secondary',
} satisfies Record<InstitutionPolicyStatus, InstitutionPolicyStatusSeverity>;

/** The `p-tag` severity for a version status; an unknown status reads as neutral. */
export const statusSeverity = (status: string): InstitutionPolicyStatusSeverity =>
  STATUS_SEVERITY[status] ?? 'secondary';

