import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from '@openng/optimus-ui/card';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import {
  institutionPolicyAuditActorName,
  institutionPolicyAuditVersion,
} from '@shared/utilities/institution-policy-audit';

import { auditChanges, humanize } from './audit-changes';
import { AuditLogsStore } from './audit-logs.store';

const MODULE_CODE = 'INSTITUTION_AUDIT_LOGS';

/**
 * `INSTITUTION_AUDIT_LOGS`. The API has no institution-wide audit feed, only `GET InstitutionPolicy/{id}/audit`,
 * so this screen is the policy audit trail behind a policy picker. Add further sources as the
 * backend ships them.
 */
@Component({
  selector: 'app-audit-logs',
  imports: [
    DatePipe,
    FormsModule,
    CardModule,
    SelectModule,
    TableModule,
    TagModule,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
  ],
  providers: [AuditLogsStore],
  templateUrl: './audit-logs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AuditLogs {
  protected readonly store = inject(AuditLogsStore);

  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);

  constructor() {
    effect(() =>
      this.#commonService.setPageHeaderInfo({
        pageTitle: this.#featurePageStore.displayNameOf(MODULE_CODE) ?? 'Audit Logs',
        pageDescription: 'Every change made to your policies, and who made it',
        pageIcon: 'pi pi-history',
        isBreadcrumbShow: false,
      }),
    );
    this.#commonService.resetBreadcrumbItems();
  }

  protected readonly policyOptions = computed(() =>
    this.store.policies().map((policy) => ({
      id: policy.id,
      label: `${policy.code} - ${policy.name}`,
    })),
  );

  readonly #activeVersion = computed(() => {
    const policy = this.store.policies().find((p) => p.id === this.store.activePolicyId());
    return policy ? { id: policy.currentVersionId, number: policy.versionNumber } : null;
  });

  protected readonly rows = computed(() => {
    const active = this.#activeVersion();
    return this.store.audit().map((entry) => ({
      ...entry,
      entityLabel: humanize(entry.entityName),
      version: institutionPolicyAuditVersion(entry, active),
      changes: auditChanges(entry.beforeData, entry.afterData),
    }));
  });

  protected readonly auditActorName = institutionPolicyAuditActorName;
}

