import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ld-kpi-card',
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (link(); as l) {
      <a
        [routerLink]="l"
        class="group flex h-full items-center gap-3 rounded-xl border-0 bg-white p-4 shadow transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:gap-4 lg:h-[7.4rem] dark:border-zinc-800 dark:bg-zinc-900"
        [attr.aria-label]="label() + ': ' + value()"
      >
        <ng-container [ngTemplateOutlet]="body" />
      </a>
    } @else {
      <div
        class="flex h-full items-center gap-3 rounded-xl border-0 bg-white p-4 shadow sm:gap-4 lg:h-[7.4rem] dark:border-zinc-800 dark:bg-zinc-900"
      >
        <ng-container [ngTemplateOutlet]="body" />
      </div>
    }

    <ng-template #body>
      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition duration-200 group-hover:scale-105 sm:h-12 sm:w-12 sm:text-2xl"
        [class]="accent()"
      >
        <i [class]="icon()" aria-hidden="true"></i>
      </span>
      <div class="min-w-0">
        <div
          class="text-2xl leading-tight font-medium text-gray-900 tabular-nums sm:text-3xl dark:text-zinc-100"
        >
          {{ value() }}
        </div>
        <div class="truncate text-sm font-medium text-gray-500 sm:text-base dark:text-zinc-400">
          {{ label() }}
        </div>
      </div>
    </ng-template>
  `,
})
export class LdKpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input.required<string>();
  /** Optional router link making the card a navigable shortcut. */
  readonly link = input<string | unknown[] | null>(null);
  /** Tailwind classes for the icon chip, e.g. `bg-primary-100 text-primary-600`. */
  readonly accent = input(
    'bg-primary-50 text-primary-500 dark:bg-primary-900/30 dark:text-primary-200',
  );
}
