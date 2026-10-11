import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { HOST_BILLING_MODULE, HostBillingAuditEntry, SettledSearchTerm } from '@shared/interfaces';

import { BillingAuditDetail } from './billing-audit-detail/billing-audit-detail';
import { BillingAuditStore } from './billing-audit.store';

@Component({
  selector: 'app-billing-audit',
  imports: [
    DatePipe,
    ButtonModule,
    CardModule,
    TableModule,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
    HeadlessDrawer,
    BillingAuditDetail,
  ],
  providers: [BillingAuditStore],
  templateUrl: './billing-audit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BillingAudit {
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);

  readonly store = inject(BillingAuditStore);

  protected readonly moduleCode = HOST_BILLING_MODULE.audit;
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = 6;

  protected readonly detailEntry = signal<HostBillingAuditEntry | null>(null);
  protected readonly isShowDetail = signal(false);

  constructor() {
    effect(() => this.setPageHeaderInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Billing Audit',
      pageDescription: 'Review every billing state change and who made it',
      pageIcon: 'pi pi-history',
      isBreadcrumbShow: false,
    });
  }

  searchEntries(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  loadEntries(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(entry: HostBillingAuditEntry) {
    this.detailEntry.set(entry);
    this.isShowDetail.set(true);
  }
}
