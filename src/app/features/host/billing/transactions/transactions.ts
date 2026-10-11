import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableFilterSelect } from '@shared/components/table/table-filter-select/table-filter-select';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  HOST_BILLING_MODULE,
  HostPaymentTransaction,
  SettledSearchTerm,
  TagSeverity,
} from '@shared/interfaces';

import {
  openRefundRequestDialog,
  REFUNDABLE_STATUSES,
} from '../refund-request-dialog/refund-request-dialog';
import { TransactionDetail } from './transaction-detail/transaction-detail';
import { TransactionsStore } from './transactions.store';

const STATUS_SEVERITY: Readonly<Record<string, TagSeverity>> = {
  Succeeded: 'success',
  PartiallyRefunded: 'info',
  Refunded: 'info',
  Pending: 'warn',
  Failed: 'danger',
};

@Component({
  selector: 'app-billing-transactions',
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
    TableSearchInput,
    HeadlessDrawer,
    TransactionDetail,
  ],
  providers: [TransactionsStore],
  templateUrl: './transactions.html',
  styleUrl: '../billing-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Transactions {
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  readonly store = inject(TransactionsStore);

  protected readonly moduleCode = HOST_BILLING_MODULE.transactions;

  /** No "Any" row — the select's clear button already means "no status filter". */
  protected readonly statusOptions = Object.keys(STATUS_SEVERITY).map((status) => ({
    label: status === 'PartiallyRefunded' ? 'Partially Refunded' : status,
    value: status,
  }));

  /** Refunds are a sibling leaf with its own grant, so the check names that leaf, not this one. */
  protected readonly canRequestRefund = computed(() =>
    this.#featurePageStore.canPerform(HOST_BILLING_MODULE.refunds, 'Add'),
  );
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canRequestRefund() ? 8 : 7));

  protected readonly hasActiveFilters = computed(
    () => !!this.store.search() || this.store.status() !== null,
  );

  protected readonly detailRow = signal<HostPaymentTransaction | null>(null);
  protected readonly isShowDetail = signal(false);

  protected readonly statusSeverity = (status: string | null | undefined): TagSeverity =>
    (status && STATUS_SEVERITY[status]) || 'secondary';

  protected readonly isRefundable = (row: HostPaymentTransaction | null | undefined): boolean =>
    !!row && REFUNDABLE_STATUSES.has(row.status);

  constructor() {
    effect(() => this.setPageHeaderInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Payment Transactions',
      pageDescription: 'Review payments received from institutions through the payment gateway',
      pageIcon: 'pi pi-receipt',
      isBreadcrumbShow: false,
    });
  }

  searchTransactions(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onStatusChange(status: string | null) {
    this.store.setStatus(status ?? null);
  }

  loadTransactions(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(row: HostPaymentTransaction) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  requestRefund(row: HostPaymentTransaction) {
    openRefundRequestDialog(
      this.#dialogService,
      this.#destroyRef,
      { paymentTransactionId: row.id, maxAmount: row.amount, currencyCode: row.currencyCode },
      () => this.store.reloadTransactions(),
    );
  }

  onDetailRefund() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    this.isShowDetail.set(false);
    this.requestRefund(row);
  }
}
