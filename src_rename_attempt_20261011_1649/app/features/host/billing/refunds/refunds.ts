import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableFilterSelect } from '@shared/components/table/table-filter-select/table-filter-select';
import { HOST_BILLING_MODULE, TagSeverity } from '@shared/interfaces';

import { openRefundRequestDialog } from '../refund-request-dialog/refund-request-dialog';
import { RefundsStore } from './refunds.store';

interface RefundStatusUi {
  label: string;
  severity: TagSeverity;
}

/**
 * `BillingRefund.Status` values. `Requested` is only queued — the gateway has not moved any money —
 * so it must never read as refunded. Only `Succeeded` does.
 */
const REFUND_STATUS_UI: Readonly<Record<string, RefundStatusUi>> = {
  Requested: { label: 'Requested', severity: 'warn' },
  Processing: { label: 'Processing', severity: 'info' },
  Succeeded: { label: 'Refunded', severity: 'success' },
  Failed: { label: 'Failed', severity: 'danger' },
};

@Component({
  selector: 'app-billing-refunds',
  imports: [
    CurrencyPipe,
    DatePipe,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableEmptyMessage,
    TableFilterSelect,
    TableInlineFilters,
    TableLoader,
  ],
  providers: [RefundsStore],
  templateUrl: './refunds.html',
  styleUrl: '../billing-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Refunds {
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  readonly store = inject(RefundsStore);

  protected readonly moduleCode = HOST_BILLING_MODULE.refunds;
  protected readonly columnCount = 7;

  /** No "Any" row — the select's clear button already means "no status filter". */
  protected readonly statusOptions = Object.entries(REFUND_STATUS_UI).map(([value, ui]) => ({
    label: ui.label,
    value,
  }));

  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerform(this.moduleCode, 'Add'),
  );

  protected readonly statusUi = (status: string): RefundStatusUi =>
    REFUND_STATUS_UI[status] ?? { label: status, severity: 'secondary' };

  constructor() {
    effect(() => this.setPageHeaderInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Refunds',
      pageDescription: 'Track refunds requested against institution payments',
      pageIcon: 'pi pi-replay',
      isBreadcrumbShow: false,
    });
  }

  onStatusChange(status: string | null) {
    this.store.setStatus(status ?? null);
  }

  loadRefunds(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  requestRefund() {
    openRefundRequestDialog(this.#dialogService, this.#destroyRef, {}, () =>
      this.store.reloadRefunds(),
    );
  }
}
