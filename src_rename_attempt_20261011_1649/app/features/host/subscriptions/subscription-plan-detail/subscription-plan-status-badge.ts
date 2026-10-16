import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PlanSubscriptionStatus } from '../subscriptions.model';

const CONFIG: Record<PlanSubscriptionStatus, { label: string; cls: string }> = {
  Active: {
    label: 'Active',
    cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  Trial: {
    label: 'Trial',
    cls: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
  },
  Expired: {
    label: 'Expired',
    cls: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300',
  },
};

@Component({
  selector: 'app-subscription-plan-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      [class]="config().cls"
    >
      <span class="sr-only">Status:</span>
      {{ config().label }}
    </span>
  `,
})
export class SubscriptionPlanStatusBadge {
  readonly status = input.required<PlanSubscriptionStatus>();
  protected readonly config = computed(() => CONFIG[this.status()]);
}
