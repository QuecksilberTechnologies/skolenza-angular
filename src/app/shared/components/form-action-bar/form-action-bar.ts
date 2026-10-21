import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

/** Optimus gives `.p-dialog-content` `1.25rem` of side and bottom padding (`overlay.modal.padding`). */
const DIALOG_BAR = 'flex w-full flex-wrap items-center justify-end gap-2 px-5 py-3';
const PAGE_BAR =
  'mx-auto flex w-full max-w-5xl flex-wrap items-center justify-end gap-2 px-3 py-4 sm:px-4';

/**
 * Sticky Cancel / submit bar for the full-page forms.
 *
 * The bar itself is the host, so it spans the scroll container rather than the form's
 * `max-w-*` column — content passing beneath it reads as scrolling under a bar instead
 * of being clipped. Place it as a direct child of a full-width `<form>` and constrain
 * the sections above it instead.
 *
 * Inside a dynamic dialog pass {@link dialog}: the page column and its extra padding
 * make no sense at modal width, and the bar has to bleed over the dialog content's own
 * padding to sit flush on the dialog's rounded bottom edge instead of floating above a
 * strip of dead space.
 *
 * Projected content sits at the start of the bar, ahead of the error message; give it
 * `me-auto` to push the buttons right.
 *
 * The submit button stays in the light DOM of the surrounding `<form>`, so
 * `type="submit"` still triggers the form's `(submit)`.
 */
@Component({
  selector: 'app-form-action-bar',
  imports: [ButtonModule],
  template: `
    <div [class]="barClass()">
      <ng-content />
      @if (errorMessage()) {
        <p class="me-auto text-sm text-red-600 dark:text-red-400" role="alert">
          {{ errorMessage() }}
        </p>
      }
      <p-button label="Cancel" variant="text" severity="secondary" (onClick)="cancelled.emit()" />
      <p-button
        type="submit"
        [icon]="submitIcon()"
        [label]="saving() ? savingLabel() : submitLabel()"
        [loading]="saving()"
        [disabled]="disabled()"
      />
    </div>
  `,
  host: {
    class:
      'z-10 mt-auto block border-t border-gray-200 bg-surface-light dark:border-zinc-700 dark:bg-surface-ground-dark',
    '[class.sticky]': '!dialog()',
    '[class.bottom-0]': '!dialog()',
    // A class binding cannot carry Tailwind's bracket syntax, so the page variant's
    // scroll-under shadow goes on as a style.
    '[style.box-shadow]': "dialog() ? null : '0 -4px 12px -6px rgb(0 0 0 / 0.35)'",
    '[class.shrink-0]': 'dialog()',
    '[class.-mx-5]': 'dialog()',
    '[class.-mb-5]': 'dialog()',
    '[class.rounded-b-xl]': 'dialog()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormActionBar {
  readonly submitLabel = input.required<string>();
  readonly submitIcon = input('pi pi-check');
  readonly savingLabel = input('Saving...');
  readonly saving = input(false);
  readonly disabled = input(false);
  /** Rendered as a `role="alert"` on the left of the bar; empty hides it. */
  readonly errorMessage = input<string>();
  /** Bleed over `.p-dialog-content`'s padding and drop the page column. */
  readonly dialog = input(false, { transform: booleanAttribute });

  readonly cancelled = output<void>();

  protected readonly barClass = computed(() => (this.dialog() ? DIALOG_BAR : PAGE_BAR));
}
