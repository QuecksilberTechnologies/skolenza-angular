import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TagModule } from '@openng/optimus-ui/tag';

import { HostPaymentTransaction, TagSeverity } from '@shared/interfaces';

interface DetailItem {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : `${value}`;

const dateTimeText = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString() : '—';

/** Read-only payment summary for the row detail sheet — every DTO field the grid leaves out. */
@Component({
  selector: 'app-transaction-detail',
  imports: [ButtonModule, TagModule],
  templateUrl: './transaction-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDetail {
  readonly transaction = input<HostPaymentTransaction | undefined>();
  readonly statusSeverity = input<TagSeverity>('secondary');
  readonly canRefund = input(false);
  readonly closePopup = output();
  readonly refund = output();

  protected readonly sections = computed<DetailSection[]>(() => {
    const transaction = this.transaction();
    if (!transaction) {
      return [];
    }

    return [
      {
        title: 'Payment',
        items: [
          { label: 'Transaction ID', value: text(transaction.id) },
          {
            label: 'Amount',
            value: `${transaction.currencyCode} ${transaction.amount.toFixed(2)}`,
          },
          { label: 'Payment Method', value: text(transaction.paymentMethod) },
          { label: 'Paid At', value: dateTimeText(transaction.paidAt) },
          { label: 'Recorded At', value: dateTimeText(transaction.addedDateTime) },
        ],
      },
      {
        title: 'Institution',
        items: [
          { label: 'Institution', value: text(transaction.institutionName) },
          { label: 'Institution ID', value: text(transaction.institutionId) },
        ],
      },
      {
        title: 'Gateway',
        items: [
          { label: 'Billing Order ID', value: text(transaction.billingOrderId) },
          { label: 'Gateway Payment ID', value: text(transaction.gatewayPaymentId) },
          { label: 'Bank Reference', value: text(transaction.bankReference) },
        ],
      },
      {
        title: 'Failure',
        items: [
          { label: 'Failure Code', value: text(transaction.failureCode) },
          { label: 'Failure Message', value: text(transaction.failureMessage) },
        ],
      },
    ];
  });

  onCancel() {
    this.closePopup.emit();
  }

  onRefund() {
    this.refund.emit();
  }
}
