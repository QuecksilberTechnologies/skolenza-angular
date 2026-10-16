import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { AutoCompleteCompleteEvent } from '@openng/optimus-ui/autocomplete';
import {
  DialogService,
  DynamicDialogConfig,
  DynamicDialogRef,
} from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { catchError, finalize, map, of, Subject, switchMap } from 'rxjs';

import { Common, HostBillingApi } from '@core/services';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormAutocomplete } from '@shared/components/form-inputs/form-autocomplete/form-autocomplete';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import { HostPaymentTransaction } from '@shared/interfaces';

import {
  RefundRequestModel,
  refundRequestSchema,
  RefundTransactionOption,
} from './refund-request-dialog.schema';

/** Payment statuses that still have a balance to refund. */
export const REFUNDABLE_STATUSES: ReadonlySet<string> = new Set(['Succeeded', 'PartiallyRefunded']);

const REASON_MAX_LENGTH = 500;

const formatAmount = (amount: number): string =>
  amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toOption = (row: HostPaymentTransaction): RefundTransactionOption => ({
  id: row.id,
  amount: row.amount,
  currencyCode: row.currencyCode,
  label: `#${row.id} - ${row.institutionName ?? 'Unknown institution'} - ${row.currencyCode} ${formatAmount(row.amount)}`,
});

/** What the opener passes. Every field is absent when the refund starts from the Refunds page. */
export interface RefundRequestDialogData {
  paymentTransactionId?: number;
  /** The payment's captured amount — the upper bound before earlier refunds are subtracted. */
  maxAmount?: number;
  currencyCode?: string;
}

/**
 * Queues a Host-initiated full or partial refund. The API answers `Requested` and the provider
 * worker settles it later, so the success copy never says the money has moved.
 *
 * Closes with `true` once a refund is queued so the opener can reload.
 */
@Component({
  selector: 'app-refund-request-dialog',
  imports: [FormActionBar, FormAutocomplete, FormNumber, FormTextarea, MessageModule],
  templateUrl: './refund-request-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundRequestDialog {
  readonly #hostBillingApi = inject(HostBillingApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #data = (inject(DynamicDialogConfig).data ?? {}) as RefundRequestDialogData;

  /**
   * One key per intended refund. Resubmitting the same transaction, amount and reason after a
   * timeout or an error reuses the key, which the API de-duplicates instead of queueing a second
   * refund; changing any of them is a different refund and gets a fresh key.
   */
  #idempotency: { intent: string; key: string } | null = null;

  /** Opened from a transaction row: the payment is fixed and shown read-only. */
  protected readonly fixedTransaction: RefundTransactionOption | null =
    this.#data.paymentTransactionId === undefined
      ? null
      : {
          id: this.#data.paymentTransactionId,
          amount: this.#data.maxAmount ?? null,
          currencyCode: this.#data.currencyCode ?? '',
          label: `#${this.#data.paymentTransactionId}`,
        };

  protected readonly reasonMaxLength = REASON_MAX_LENGTH;

  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<RefundRequestModel>({
    transaction: this.fixedTransaction,
    amount: null,
    reason: '',
  });

  /** The picked payment, or null while the picker still holds typed text. */
  protected readonly transaction = computed(() => {
    const value = this.model().transaction;
    return typeof value === 'object' ? value : null;
  });

  protected readonly currencyCode = computed(() => this.transaction()?.currencyCode || undefined);

  protected readonly amountHint = computed(() => {
    const transaction = this.transaction();
    if (transaction?.amount == null) {
      return undefined;
    }
    const currency = transaction.currencyCode ? `${transaction.currencyCode} ` : '';
    return `Up to ${currency}${formatAmount(transaction.amount)}, less any earlier refunds`;
  });

  protected readonly reasonHint = computed(
    () => `${this.model().reason.length} / ${REASON_MAX_LENGTH} characters`,
  );

  protected readonly transactionSuggestions = signal<RefundTransactionOption[]>([]);
  readonly #transactionSearch = new Subject<string>();

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, refundRequestSchema);
  });

  constructor() {
    this.#transactionSearch
      .pipe(
        switchMap((query) =>
          this.#hostBillingApi.getTransactions({ Search: query, PageNumber: 1, PageSize: 20 }).pipe(
            map((res) =>
              (res.data?.items ?? [])
                .filter((row) => REFUNDABLE_STATUSES.has(row.status))
                .map(toOption),
            ),
            // A failed lookup just leaves the list empty; it must not end the search stream.
            catchError(() => of([])),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((options) => this.transactionSuggestions.set(options));
  }

  searchTransactions(event: AutoCompleteCompleteEvent): void {
    this.#transactionSearch.next(event.query.trim());
  }

  onSubmit(): void {
    if (this.isSaving()) {
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      const { amount, reason } = this.model();
      const paymentTransactionId = this.transaction()?.id;
      this.isSaving.set(true);

      this.#hostBillingApi
        .requestRefund({
          // The schema has already ruled out null; the fallbacks only narrow the type.
          paymentTransactionId: paymentTransactionId ?? 0,
          amount: amount ?? 0,
          reason: reason.trim(),
          idempotencyKey: this.#idempotencyKeyFor(
            `${paymentTransactionId}|${amount}|${reason.trim()}`,
          ),
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            if (!res.isSucceeded) {
              this.#commonService.showMessage(res.message, 'error');
              return;
            }
            this.#commonService.showMessage(
              'Refund request queued. It stays Requested until the payment gateway confirms it.',
              'success',
            );
            this.#dialogRef.close(true);
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  #idempotencyKeyFor(intent: string): string {
    if (this.#idempotency?.intent !== intent) {
      this.#idempotency = { intent, key: crypto.randomUUID() };
    }
    return this.#idempotency.key;
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}

/**
 * Opens the dialog the way both billing screens need it and calls `onQueued` once a refund is
 * queued. The dialog is closed with the opener, so it never outlives the page.
 */
export function openRefundRequestDialog(
  dialogService: DialogService,
  destroyRef: DestroyRef,
  data: RefundRequestDialogData,
  onQueued: () => void,
): void {
  const ref = dialogService.open(RefundRequestDialog, {
    header: 'Request Refund',
    style: { width: '90vw', maxWidth: '32rem' },
    contentStyle: { overflow: 'hidden' },
    modal: true,
    closable: true,
    data,
  });

  ref?.onClose.pipe(takeUntilDestroyed(destroyRef)).subscribe((queued: boolean | undefined) => {
    if (queued) onQueued();
  });

  destroyRef.onDestroy(() => ref?.close());
}
