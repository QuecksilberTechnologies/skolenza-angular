import { IInstitution, InstitutionSubscriptionPlan } from '@shared/interfaces';

import { PlanSubscriptionStatus, resolveStatus } from '../subscriptions.model';

export interface PlanCompany {
  /** `InstitutionSubscriptionPlan.id` — a institution can hold more than one row, so this is the track key. */
  id: number;
  institutionId: number | null;
  companyName: string;
  status: PlanSubscriptionStatus;
  /** `subscriptionEndDate`; null when the subscription has no end. */
  renewsOn: string | null;
}

/**
 * `/Institution/get-all-institutions` takes no plan filter, so the plan → company join has to happen here by
 * `institutionId`, and `planId` re-applies the plan filter locally.
 */
export function toPlanCompanies(
  rows: InstitutionSubscriptionPlan[],
  institutions: IInstitution[],
  planId: number,
  now: number = Date.now(),
): PlanCompany[] {
  // `/Institution` keys institutions by an opaque token while `/Subscription` still reports a number, so the
  // join compares them as strings rather than assuming either controller's type.
  const byId = new Map(institutions.map((institution) => [String(institution.id), institution]));

  return rows
    .filter((row) => row.subscriptionPlanId === planId)
    .map((row) => ({
      id: row.id,
      institutionId: row.institutionId,
      // A subscription can outlive its institution, and the institution call may have failed on its own.
      companyName:
        (row.institutionId !== null ? byId.get(String(row.institutionId))?.companyName : undefined) ??
        'Unknown company',
      status: resolveStatus(row, now),
      renewsOn: row.subscriptionEndDate,
    }));
}
