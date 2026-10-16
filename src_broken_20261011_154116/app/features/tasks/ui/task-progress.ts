import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-task-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2">
      <div
        class="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700"
        role="progressbar"
        [attr.aria-valuenow]="value()"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="h-full rounded-full transition-all"
          [class]="barClass()"
          [style.width.%]="value()"
        ></div>
      </div>
      <span
        class="w-9 text-right text-xs font-medium text-gray-600 tabular-nums dark:text-zinc-300"
      >
        {{ value() }}%
      </span>
    </div>
  `,
})
export class TaskProgress {
  readonly value = input.required<number>();

  protected readonly barClass = computed(() => {
    const v = this.value();
    if (v >= 100) return 'bg-green-500';
    if (v >= 60) return 'bg-primary-500';
    if (v >= 30) return 'bg-amber-500';
    return 'bg-red-400';
  });
}
