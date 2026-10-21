import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

/** Pill that pairs a state colour with an icon and text, so colour is never the only signal. */
@Component({
  selector: 'app-status-badge',
  template: `
    @if (icon()) {
      <i aria-hidden="true" class="pi text-sm" [class]="icon()"></i>
    }
    {{ label() }}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium',
    '[class]': 'toneClass()',
  },
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
  /** PrimeIcons name without the `pi` prefix, e.g. `pi-check-circle`. */
  readonly icon = input<string>();
  protected readonly toneClass = computed(() => TONE_CLASS[this.tone()]);
}
