import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-okr-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-2.5"
      role="progressbar"
      [attr.aria-valuenow]="value()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="'Progress ' + value() + '%'"
    >
      <div
        class="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700/70"
        [class]="trackClass()"
      >
        <div
          class="h-full rounded-full bg-gradient-to-r shadow-sm transition-[width] duration-500 ease-out"
          [class]="barClass()"
          [style.width.%]="value()"
        ></div>
      </div>
      @if (showLabel()) {
        <span
          class="w-9 shrink-0 text-right text-xs font-semibold text-gray-600 tabular-nums dark:text-zinc-300"
        >
          {{ value() }}%
        </span>
      }
    </div>
  `,
})
export class OkrProgress {
  readonly value = input.required<number>();
  readonly showLabel = input(true);
  /** 'sm' (default) for inline rows, 'lg' for the focal summary bar. */
  readonly size = input<'sm' | 'lg'>('sm');

  protected readonly trackClass = computed(() => (this.size() === 'lg' ? 'h-3' : 'h-2'));

  protected readonly barClass = computed(() => {
    const v = this.value();
    if (v >= 100) return 'from-emerald-400 to-emerald-500';
    if (v >= 70) return 'from-green-400 to-green-500';
    if (v >= 40) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  });
}
