import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Renders a compact list of tag chips, truncating past `max`. */
@Component({
  selector: 'app-tag-list',
  template: `
    @for (tag of visible(); track tag) {
      <span
        class="inline-flex items-center rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300"
      >
        {{ tag }}
      </span>
    }
    @if (overflow() > 0) {
      <span class="inline-flex items-center text-xs font-medium text-surface-400">
        +{{ overflow() }}
      </span>
    }
  `,
  host: { class: 'flex flex-wrap items-center gap-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagList {
  readonly tags = input<string[]>([]);
  readonly max = input(3);

  readonly visible = computed(() => this.tags().slice(0, this.max()));
  readonly overflow = computed(() => Math.max(0, this.tags().length - this.max()));
}
