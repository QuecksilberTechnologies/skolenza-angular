import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Read-only 5-star rating with numeric value. */
@Component({
  selector: 'app-ld-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1" [attr.aria-label]="value() + ' out of 5 stars'">
      <span class="flex" aria-hidden="true">
        @for (star of stars(); track $index) {
          <i class="pi text-xs text-amber-400" [class]="star"></i>
        }
      </span>
      <span class="text-xs font-semibold text-gray-700 tabular-nums dark:text-zinc-200">
        {{ value() }}
      </span>
      @if (count() !== null) {
        <span class="text-xs text-gray-400 dark:text-zinc-500">({{ count() }})</span>
      }
    </span>
  `,
})
export class LdRating {
  readonly value = input.required<number>();
  readonly count = input<number | null>(null);

  protected readonly stars = computed(() => {
    const v = this.value();
    return Array.from({ length: 5 }, (_, i) => {
      if (v >= i + 1) return 'pi-star-fill';
      if (v >= i + 0.5) return 'pi-star-half-fill';
      return 'pi-star';
    });
  });
}
