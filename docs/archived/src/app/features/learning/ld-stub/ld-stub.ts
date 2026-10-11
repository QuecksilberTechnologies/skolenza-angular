import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Placeholder page for Phase-2 sub-modules. Title + hint come from route `data`. */
@Component({
  selector: 'app-ld-stub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex min-h-[24rem] flex-col items-center justify-center rounded-xl border border-dashed border-border-light bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900"
    >
      <span
        class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-500 dark:bg-primary-900/30"
      >
        <i [class]="icon" class="text-2xl" aria-hidden="true"></i>
      </span>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-zinc-100">{{ title }}</h2>
      <p class="mt-1 max-w-md text-sm text-gray-500 dark:text-zinc-400">{{ hint }}</p>
      <span
        class="mt-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      >
        Coming soon
      </span>
    </div>
  `,
})
export default class LdStub {
  readonly #route = inject(ActivatedRoute);
  protected readonly title = this.#route.snapshot.data['title'] ?? 'Coming soon';
  protected readonly icon = this.#route.snapshot.data['icon'] ?? 'pi pi-clock';
  protected readonly hint =
    this.#route.snapshot.data['hint'] ?? 'This section is being built and will be available soon.';
}
