import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

/**
 * Info icon beside a field label that reveals the field's hint in a tooltip.
 * Shared by `app-form-field-shell` and `app-form-switch` so both read the same.
 *
 * A real `<button>` so keyboard users reach it and get the tooltip on focus.
 * It carries no copy of the hint itself: each host keeps an `sr-only` copy
 * wired to its control, so screen readers hear the hint with the control.
 */
@Component({
  selector: 'app-form-hint-icon',
  imports: [TooltipModule],
  template: `
    <button
      type="button"
      class="-m-1 inline-flex size-6 cursor-help items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus-visible:bg-primary-50 focus-visible:text-primary-600 focus-visible:ring-2 focus-visible:ring-primary-400 dark:text-zinc-400 dark:hover:bg-primary-950 dark:hover:text-primary-300 dark:focus-visible:bg-primary-950 dark:focus-visible:text-primary-300"
      [attr.aria-label]="'About ' + label()"
      [pTooltip]="hint()"
      tooltipPosition="top"
      tooltipEvent="both"
    >
      <span class="pi pi-info-circle text-sm" aria-hidden="true"></span>
    </button>
  `,
  host: { class: 'inline-flex' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormHintIcon {
  readonly hint = input.required<string>();
  /** The field's label, used to name the button ("About Device"). */
  readonly label = input.required<string>();
}
