import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TableModule } from '@openng/optimus-ui/table';
import { Download, FileText, LucideAngularModule } from 'lucide-angular';

import { Common } from '@core/services';

interface Invoice {
  invoice: string;
  date: string;
  status: 'Paid' | 'Unpaid';
  amount: string;
  plan: string;
}

@Component({
  selector: 'app-invoices-table',
  imports: [ButtonModule, TableModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-2xl border border-surface-200 bg-surface-0 p-5 shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Invoices</h3>
            <span
              class="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-surface-500 uppercase dark:bg-zinc-800 dark:text-zinc-400"
            >
              Sample
            </span>
          </div>
          <p class="mt-0.5 text-sm text-surface-500 dark:text-zinc-400">
            Access all your previous invoices.
          </p>
        </div>
        <p-button
          label="Download All"
          icon="pi pi-download"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="downloadAll()"
        />
      </div>

      <div class="overflow-x-auto">
        <p-table
          [value]="invoices"
          [paginator]="true"
          [rows]="8"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="{first}-{last} of {totalRecords}"
          styleClass="min-w-[640px]"
        >
          <ng-template #header>
            <tr class="!bg-surface-50 dark:!bg-zinc-800/60">
              <th scope="col" class="!text-sm !font-semibold">Invoice</th>
              <th scope="col" class="!text-sm !font-semibold">Date</th>
              <th scope="col" class="!text-sm !font-semibold">Status</th>
              <th scope="col" class="!text-sm !font-semibold">Amount</th>
              <th scope="col" class="!text-sm !font-semibold">Plan</th>
              <th scope="col" class="!text-sm"><span class="sr-only">Download</span></th>
            </tr>
          </ng-template>
          <ng-template #body let-inv>
            <tr class="transition-colors hover:bg-surface-50 dark:hover:bg-zinc-800/40">
              <td>
                <span class="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                  <lucide-angular
                    [img]="FileText"
                    [size]="16"
                    class="text-red-500 dark:text-red-400"
                    aria-hidden="true"
                  />
                  {{ inv.invoice }}
                </span>
              </td>
              <td class="text-surface-600 dark:text-zinc-300">{{ inv.date }}</td>
              <td>
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  [class]="
                    inv.status === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  "
                >
                  {{ inv.status }}
                </span>
              </td>
              <td class="text-surface-700 dark:text-zinc-200">{{ inv.amount }}</td>
              <td class="text-surface-600 dark:text-zinc-300">{{ inv.plan }}</td>
              <td class="text-right">
                <p-button
                  label="Download"
                  severity="secondary"
                  [text]="true"
                  styleClass="!min-h-[44px] sm:!min-h-0"
                  [ariaLabel]="'Download ' + inv.invoice"
                  (onClick)="download(inv)"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </section>
  `,
})
export class InvoicesTable {
  readonly #common = inject(Common);
  readonly FileText = FileText;
  readonly Download = Download;

  // Newest first.
  protected readonly invoices: Invoice[] = [
    {
      invoice: 'Invoice #016 – Apr 2026',
      date: 'Apr 1, 2026',
      status: 'Paid',
      amount: '₹9,999.00',
      plan: 'Pro Custom',
    },
    {
      invoice: 'Invoice #015 – Mar 2026',
      date: 'Mar 1, 2026',
      status: 'Unpaid',
      amount: '₹9,999.00',
      plan: 'Pro Custom',
    },
    {
      invoice: 'Invoice #014 – Feb 2026',
      date: 'Feb 1, 2026',
      status: 'Paid',
      amount: '₹3,999.00',
      plan: 'Pro Team',
    },
    {
      invoice: 'Invoice #013 – Jan 2026',
      date: 'Jan 1, 2026',
      status: 'Paid',
      amount: '₹3,999.00',
      plan: 'Pro Team',
    },
    {
      invoice: 'Invoice #012 – Dec 2025',
      date: 'Dec 1, 2025',
      status: 'Paid',
      amount: '₹0.00',
      plan: 'Free Plan',
    },
    {
      invoice: 'Invoice #011 – Nov 2025',
      date: 'Nov 1, 2025',
      status: 'Paid',
      amount: '₹0.00',
      plan: 'Free Plan',
    },
    {
      invoice: 'Invoice #010 – Oct 2025',
      date: 'Oct 1, 2025',
      status: 'Paid',
      amount: '₹0.00',
      plan: 'Free Plan',
    },
    {
      invoice: 'Invoice #009 – Sep 2025',
      date: 'Sep 1, 2025',
      status: 'Paid',
      amount: '₹0.00',
      plan: 'Free Plan',
    },
    {
      invoice: 'Invoice #008 – Aug 2025',
      date: 'Aug 1, 2025',
      status: 'Paid',
      amount: '₹0.00',
      plan: 'Free Plan',
    },
    {
      invoice: 'Invoice #007 – Jul 2025',
      date: 'Jul 1, 2025',
      status: 'Unpaid',
      amount: '₹2,199.00',
      plan: 'Pro-Basic',
    },
    {
      invoice: 'Invoice #006 – Jun 2025',
      date: 'Jun 1, 2025',
      status: 'Paid',
      amount: '₹2,199.00',
      plan: 'Pro-Basic',
    },
    {
      invoice: 'Invoice #005 – May 2025',
      date: 'May 1, 2025',
      status: 'Paid',
      amount: '₹2,199.00',
      plan: 'Pro-Basic',
    },
    {
      invoice: 'Invoice #004 – Apr 2025',
      date: 'Apr 1, 2025',
      status: 'Paid',
      amount: '₹3,999.00',
      plan: 'Pro Team',
    },
    {
      invoice: 'Invoice #003 – Mar 2025',
      date: 'Mar 1, 2025',
      status: 'Paid',
      amount: '₹3,999.00',
      plan: 'Pro Team',
    },
    {
      invoice: 'Invoice #002 – Feb 2025',
      date: 'Feb 1, 2025',
      status: 'Paid',
      amount: '₹3,999.00',
      plan: 'Pro Team',
    },
    {
      invoice: 'Invoice #001 – Jan 2025',
      date: 'Jan 1, 2025',
      status: 'Paid',
      amount: '₹3,999.00',
      plan: 'Pro Team',
    },
  ];

  download(inv: Invoice): void {
    this.#common.showMessage(`Downloading ${inv.invoice} is not available yet`, 'info');
  }

  downloadAll(): void {
    this.#common.showMessage('Invoice download is not available yet', 'info');
  }
}
