import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Star rating — read-only display or interactive input (1–5). */
@Component({
  selector: 'app-pms-rating-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-0.5"
      [attr.role]="readonly() ? 'img' : 'radiogroup'"
      [attr.aria-label]="readonly() ? value() + ' out of 5' : label()"
    >
      @for (star of stars; track star) {
        @if (readonly()) {
          <i
            class="pi text-base"
            [class.pi-star-fill]="star <= value()"
            [class.pi-star]="star > value()"
            [class.text-amber-400]="star <= value()"
            [class.text-gray-300]="star > value()"
            aria-hidden="true"
          ></i>
        } @else {
          <button
            type="button"
            class="cursor-pointer border-0 bg-transparent p-0.5 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            role="radio"
            [attr.aria-checked]="star === value()"
            [attr.aria-label]="star + ' star'"
            (click)="rate.emit(star)"
          >
            <i
              class="pi text-lg"
              [class.pi-star-fill]="star <= value()"
              [class.pi-star]="star > value()"
              [class.text-amber-400]="star <= value()"
              [class.text-gray-300]="star > value()"
              aria-hidden="true"
            ></i>
          </button>
        }
      }
      @if (showValue()) {
        <span class="ml-1 text-xs font-medium text-gray-600 tabular-nums dark:text-zinc-300">
          {{ value() || '—' }}
        </span>
      }
    </div>
  `,
})
export class PmsRatingStars {
  readonly value = input.required<number>();
  readonly readonly = input(true);
  readonly showValue = input(false);
  readonly label = input('Rating');

  readonly rate = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  /** Touch computed so template stays change-detection friendly. */
  protected readonly safeValue = computed(() => Math.round(this.value()));
}
