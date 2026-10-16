import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CreditCard, LucideAngularModule } from 'lucide-angular';

import { Common } from '@core/services';

@Component({
  selector: 'app-payment-method-card',
  imports: [ButtonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="flex h-full flex-col gap-4 rounded-2xl border border-surface-200 bg-surface-0 p-5 shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Payment method</h3>
          <p class="mt-0.5 text-sm text-surface-500 dark:text-zinc-400">
            Change how you pay for your plan
          </p>
        </div>
        <span
          class="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-surface-500 uppercase dark:bg-zinc-800 dark:text-zinc-400"
        >
          Sample
        </span>
      </div>

      <div
        class="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="flex h-9 w-12 shrink-0 items-center justify-center gap-1 rounded-md bg-white text-[11px] font-bold tracking-wide text-blue-700 italic shadow-sm ring-1 ring-surface-200 dark:ring-zinc-700"
          >
            <lucide-angular [img]="CreditCard" [size]="14" aria-hidden="true" />
            VISA
          </span>
          <div class="min-w-0">
            <p
              class="truncate text-sm font-semibold tracking-wider text-zinc-900 dark:text-zinc-100"
            >
              <span class="sr-only">Card ending in</span>
              **** **** **** 3627
            </p>
            <p class="text-xs text-surface-500 dark:text-zinc-400">Expiry 02/2026</p>
          </div>
        </div>

        <p-button
          label="Change"
          severity="secondary"
          [outlined]="true"
          size="small"
          styleClass="shrink-0"
          ariaLabel="Change payment method"
          (onClick)="onChange()"
        />
      </div>
    </section>
  `,
})
export class PaymentMethodCard {
  readonly #common = inject(Common);
  readonly CreditCard = CreditCard;

  onChange(): void {
    this.#common.showMessage('Payment method management is not available yet', 'info');
  }
}
