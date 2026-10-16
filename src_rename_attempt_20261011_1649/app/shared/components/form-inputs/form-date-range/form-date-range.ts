import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';

import { controlAria } from '../form-field-shell/control-aria';
import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Date-range picker — `p-datepicker` in `selectionMode="range"`.
 *
 * Separate from `app-form-date` because the field value is a `Date[]`, not a
 * `Date`: the two cannot share one typed `field` input.
 *
 * Optimus writes the partially-filled array while the user is still picking, so
 * the field holds `[Date, null]` between the two clicks. That is deliberate — the
 * "both ends required" rule belongs in the form's zod schema
 * (`z.array(z.date()).length(2, '…')`) like every other rule, not in an
 * interception layer here (`.claude/docs/forms.md`).
 *
 * Binds through `p-datepicker`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed.
 */
@Component({
  selector: 'app-form-date-range',
  imports: [FormField, DatePickerModule, FormFieldShell],
  templateUrl: './form-date-range.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormDateRange {
  readonly field = input.required<Field<Date[] | null>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly dateFormat = input('dd/mm/yy');
  readonly showIcon = input(true, { transform: booleanAttribute });
  readonly showButtonBar = input(true, { transform: booleanAttribute });
  readonly numberOfMonths = input(2);
  readonly minDate = input<Date>();
  readonly maxDate = input<Date>();

  /** See {@link controlAria}. */
  protected readonly aria = computed(() => controlAria(this.inputId(), this.required()));
}
