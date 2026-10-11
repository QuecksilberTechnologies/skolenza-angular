import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Canonical card chrome for the host dashboard — heading block plus projected body.
 * Every widget card shares it so titles, rules and spacing cannot drift apart.
 *
 * The body is a *fixed* height, not a floor: the skeleton, the empty state and the loaded
 * content all occupy the same box, so nothing on the page moves when data lands. Widgets fill
 * it with `flex-1 min-h-0` and scroll internally rather than declaring heights of their own.
 *
 * The input is `cardTitle`, not `title`: a static `title="…"` attribute would also
 * land on the DOM element and raise a native browser tooltip over the card.
 */
@Component({
  selector: 'app-host-card-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <div
      class="flex h-full flex-col rounded-xl bg-white p-4 shadow dark:bg-zinc-900 dark:shadow-none"
    >
      <header class="mb-4 flex flex-col gap-0.5 border-b border-gray-100 pb-3 dark:border-zinc-800">
        <h2 class="text-lg leading-tight font-semibold text-gray-900 dark:text-zinc-100">
          {{ cardTitle() }}
        </h2>
        @if (subtitle()) {
          <p class="text-sm leading-snug text-gray-500 dark:text-zinc-400">{{ subtitle() }}</p>
        }
      </header>

      <div class="flex min-h-0 flex-col" [class]="bodyClass()">
        <ng-content />
      </div>
    </div>
  `,
})
export class HostCardShell {
  readonly cardTitle = input.required<string>();
  readonly subtitle = input('');
  /** Fixed body height. One constant for every widget so grid rows cannot jump. */
  readonly bodyClass = input('h-[21rem]');
}
