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
 * Date picker. {@link showTime} adds the clock, {@link timeOnly} drops the
 * calendar — a time picker is this component with one flag, not a separate one,
 * because the field value stays a `Date` either way.
 *
 * `p-datepicker` provides an `NG_VALUE_ACCESSOR`, which is one of the three shapes
 * `[formField]` accepts, so the field binds directly and blur reaches
 * `markAsTouched()` through the accessor. The `$any(...)` cast is only there
 * because the template type-checker does not recognise a `ControlValueAccessor`
 * as a Signal Forms control; drop it when Optimus ships a `FormValueControl`.
 *
 * There is no local `disabled` input: `[formField]` pushes the field's own
 * `disabled` state onto the control (`setInputOnDirectives` + `setDisabledState`
 * in `@angular/forms` `cvaControlCreate`) after the template's own bindings, so a
 * local one would be silently overwritten. Disable the field instead —
 * `disabled(p.x, { when })` in the `form()` callback.
 */
@Component({
  selector: 'app-form-date',
  imports: [FormField, DatePickerModule, FormFieldShell],
  templateUrl: './form-date.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormDate {
  readonly field = input.required<Field<Date | null>>();
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
  readonly showTime = input(false, { transform: booleanAttribute });
  readonly timeOnly = input(false, { transform: booleanAttribute });
  readonly showButtonBar = input(false, { transform: booleanAttribute });
  readonly minDate = input<Date>();
  readonly maxDate = input<Date>();

  /** See {@link controlAria}. */
  protected readonly aria = computed(() => controlAria(this.inputId(), this.required()));
}
