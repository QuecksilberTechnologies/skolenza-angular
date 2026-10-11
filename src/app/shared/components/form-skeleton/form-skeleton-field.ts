import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

/**
 * Placeholder for a single form field — label bar, control bar, hint slot.
 *
 * The box is the host, so the element is itself the grid item and callers can drop it
 * straight into the grid the real fields use, `md:col-span-2` and all.
 */
@Component({
  selector: 'app-skeleton-field',
  imports: [SkeletonModule],
  template: `
    <!-- The bar is thinner than the text it stands in for, so the line box carries the height. -->
    <div class="flex h-[1.5rem] items-center">
      <p-skeleton [width]="labelWidth()" height="0.8rem" class="rounded-md!" />
    </div>
    <p-skeleton [height]="controlHeight()" class="rounded-md!" />
    @if (slot() || hint()) {
      <div class="flex items-center" [class.min-h-5]="slot()" [class.h-4]="!slot()">
        @if (hint()) {
          <p-skeleton width="11rem" height="0.7rem" class="rounded-md!" />
        }
      </div>
    }
  `,
  host: { class: 'space-y-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonField {
  /** Matches the real control so the bar lands at the same height. */
  readonly control = input<'input' | 'select' | 'textarea'>('input');
  /** The `rows` the real textarea carries. Ignored by the other controls. */
  readonly textareaRows = input(2);
  /** Draws the bar standing in for the field's helper text. */
  readonly hint = input(false, { transform: booleanAttribute });
  /**
   * Reserves the `min-h-5` error slot the drawer forms keep under every field. Without it the
   * hint sits on a plain `1rem` line, which is what the dialog forms render.
   */
  readonly slot = input(false, { transform: booleanAttribute });
  readonly labelWidth = input('6rem');

  /**
   * A `1rem`/`1.5` line box plus the theme's `0.5rem` padding and `1px` borders — 2.65rem for a
   * single-line control, one more line box per textarea row.
   */
  protected readonly controlHeight = computed(() =>
    this.control() === 'textarea' ? `${this.textareaRows() * 1.5 + 1.15}rem` : '2.65rem',
  );
}
