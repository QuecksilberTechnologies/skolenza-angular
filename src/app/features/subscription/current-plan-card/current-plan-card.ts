import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { Check, LucideAngularModule } from 'lucide-angular';

import { SubscriptionPlan, InstitutionSubscriptionPlan } from '@shared/interfaces';
import { CurrencySymbolPipe } from '@shared/pipes';

@Component({
  selector: 'app-current-plan-card',
  imports: [ButtonModule, CurrencyPipe, CurrencySymbolPipe, DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = plan();
    @let usage = seatUsage();
    <section
      class="flex h-full flex-col gap-4 rounded-2xl border border-surface-200 bg-surface-0 p-5 shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      @if (hasActivePlan()) {
        <!-- Active plan summary -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {{ planName() }}
              </h3>
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                [class]="statusClass()"
              >
                {{ statusLabel() }}
              </span>
            </div>
            <p class="mt-0.5 text-sm text-surface-500 dark:text-zinc-400">
              Your current subscription
            </p>
          </div>

          @if (p) {
            <div class="flex shrink-0 items-baseline gap-1 text-right" aria-hidden="true">
              <span class="text-2xl leading-none font-bold text-zinc-900 dark:text-zinc-100">
                {{
                  p.price | currency: (p.currencyKey || 'INR' | currencySymbol) : 'symbol' : '1.0-0'
                }}
              </span>
              <span class="text-sm text-surface-500 dark:text-zinc-400">
                / {{ p.period === '/ year' ? 'year' : 'month' }}
              </span>
            </div>
            <span class="sr-only">
              Price {{ p.price | number: '1.0-0' }} {{ p.currencyKey || 'INR' }}
              {{ p.period === '/ year' ? 'per year' : 'per month' }}
            </span>
          }
        </div>

        <!-- Seat usage -->
        @if (usage.max > 0) {
          <div class="mt-auto">
            <div class="mb-1.5 flex items-center justify-between text-sm">
              <span class="text-surface-600 dark:text-zinc-300">Seats used</span>
              <span class="font-semibold text-zinc-900 dark:text-zinc-100">
                {{ usage.used }} / {{ usage.max }}
              </span>
            </div>
            <div
              class="h-2.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-zinc-800"
              role="progressbar"
              [attr.aria-valuenow]="usage.percent"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-label]="'Seats used: ' + usage.percent + ' percent'"
            >
              <div
                class="h-full rounded-full transition-all"
                [class]="barClass()"
                [style.width.%]="usage.percent"
              ></div>
            </div>
          </div>
        }

        <div class="flex justify-end">
          <p-button
            label="Upgrade"
            icon="pi pi-arrow-up-right"
            iconPos="right"
            severity="primary"
            (onClick)="choosePlan.emit()"
          />
        </div>
      } @else {
        <!-- No active plan -->
        <div class="flex h-full flex-col gap-3">
          <div>
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No active plan</h3>
            <p class="mt-0.5 text-sm text-surface-500 dark:text-zinc-400">
              Pick a plan to unlock full access to your HRMS.
            </p>
          </div>
          <ul class="flex flex-wrap gap-2" aria-label="Plan benefits">
            @for (chip of benefits; track chip) {
              <li
                class="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
              >
                <lucide-angular [img]="Check" [size]="13" aria-hidden="true" />
                {{ chip }}
              </li>
            }
          </ul>
          <div class="mt-auto flex justify-end">
            <p-button
              label="View plans"
              icon="pi pi-arrow-right"
              iconPos="right"
              severity="primary"
              (onClick)="choosePlan.emit()"
            />
          </div>
        </div>
      }
    </section>
  `,
})
export class CurrentPlanCard {
  readonly plan = input<SubscriptionPlan | null>(null);
  readonly institution = input<InstitutionSubscriptionPlan | null>(null);
  readonly seatUsage = input<{ used: number; max: number; percent: number }>({
    used: 0,
    max: 0,
    percent: 0,
  });
  readonly choosePlan = output<void>();

  readonly Check = Check;

  protected readonly benefits = ['All modules', 'Unlimited reports', 'Priority support'];

  // Active when a plan matched the list, or the institution record itself is active.
  protected hasActivePlan = computed(() => !!this.plan() || !!this.institution()?.isActive);

  // The institution record carries no plan name — it comes from the plan matched on `subscriptionPlanId`.
  protected planName = computed(() => this.plan()?.planName || '—');

  protected statusLabel = computed(() => {
    if (this.plan()?.isFree) return 'Free';
    return this.institution()?.isActive ? 'Active' : 'Inactive';
  });

  protected statusClass = computed(() =>
    this.institution()?.isActive
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-surface-100 text-surface-600 ring-1 ring-surface-200 dark:bg-zinc-800 dark:text-zinc-300',
  );

  protected barClass = computed(() => {
    const p = this.seatUsage().percent;
    if (p >= 90) return 'bg-red-500 dark:bg-red-400';
    if (p >= 70) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-primary-500 dark:bg-primary-400';
  });
}
