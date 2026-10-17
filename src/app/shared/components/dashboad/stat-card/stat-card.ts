import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

const CARD_CLASSES =
  'flex h-full items-center gap-3 rounded-card bg-white p-5 shadow-sm sm:gap-4 dark:border dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none';

/** One KPI on a dashboard's top row: tinted icon, big number, label. A `link` makes it a link. */
@Component({
  selector: 'app-stat-card',
  imports: [NgTemplateOutlet, RouterLink],
  template: `
    @if (loading()) {
      <!-- same box and line heights as a loaded card, so nothing moves when data lands -->
      <div [class]="cardClasses" aria-hidden="true">
        <span
          class="size-10 shrink-0 animate-pulse rounded-md bg-zinc-100 motion-reduce:animate-none sm:size-12 dark:bg-zinc-800"
        ></span>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="text-2xl leading-tight sm:text-3xl">
            <span
              class="inline-block w-10 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
            >
              &nbsp;
            </span>
          </span>
          <span class="text-sm sm:text-base">
            <span
              class="inline-block w-24 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
            >
              &nbsp;
            </span>
          </span>
        </div>
      </div>
    } @else if (link(); as route) {
      <a
        class="group no-underline transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:hover:bg-zinc-700"
        [class]="cardClasses"
        [routerLink]="route"
        [attr.aria-label]="linkLabel()"
      >
        <ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{ $implicit: true }" />
      </a>
    } @else {
      <div [class]="cardClasses">
        <ng-container [ngTemplateOutlet]="body" />
      </div>
    }

    <ng-template #body let-linked>
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-50 sm:size-12 dark:bg-primary-900/30"
        aria-hidden="true"
      >
        <i
          class="text-xl! text-primary-700 sm:text-2xl! dark:text-primary-200"
          [class]="icon()"
        ></i>
      </span>
      <span class="flex min-w-0 flex-col">
        <span class="text-2xl leading-tight font-semibold sm:text-3xl" [class]="valueClass()">
          {{ value() }}
        </span>
        @if (linked) {
          <!-- brand-coloured label + arrow: the cue that this tile, unlike its neighbours, opens a page -->
          <span
            class="flex min-w-0 items-center gap-1 text-sm font-medium text-primary-700 sm:text-base dark:text-primary-200"
          >
            <span class="truncate group-hover:underline">{{ label() }}</span>
            <i
              class="pi pi-arrow-right shrink-0 text-xs transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            ></i>
          </span>
        } @else {
          <span class="truncate text-sm font-medium text-zinc-500 sm:text-base dark:text-zinc-400">
            {{ label() }}
          </span>
        }
      </span>
    </ng-template>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  /** PrimeIcons class; unused while `loading`. */
  readonly icon = input('');
  readonly value = input<string | number | null>(null);
  readonly label = input<string | null>(null);
  readonly link = input<string | null | undefined>(null);
  readonly loading = input(false);
  /** `danger` turns the number red, for the one figure on a row that needs action. */
  readonly tone = input<'default' | 'danger'>('default');

  protected readonly cardClasses = CARD_CLASSES;
  /** "8 Team Members": what the link announces, instead of reading out its parts one by one. */
  protected readonly linkLabel = computed(() =>
    `${this.value() ?? ''} ${this.label() ?? ''}`.trim(),
  );
  protected readonly valueClass = computed(() =>
    this.tone() === 'danger' ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-50',
  );
}
