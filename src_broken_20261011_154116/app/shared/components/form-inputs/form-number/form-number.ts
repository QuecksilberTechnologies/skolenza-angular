import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';

import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Numeric field.
 *
 * The value stays `number | null` so a blank input keeps showing its placeholder —
 * see the `.min(...)` before `.nullable()` rule in the `signal-forms` skill. zod
 * issues carry no field metadata, so {@link min} and {@link max} must still be
 * passed here for the DOM to report them.
 *
 * Binds through `p-inputnumber`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed.
 */
@Component({
  selector: 'app-form-number',
  imports: [FormField, InputNumberModule, FormFieldShell],
  templateUrl: './form-number.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormNumber {
  readonly field = input.required<Field<number | null>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly min = input<number>();
  readonly max = input<number>();
  readonly showButtons = input(false, { transform: booleanAttribute });
  readonly mode = input<'decimal' | 'currency'>('decimal');
  readonly currency = input<string>();
  readonly minFractionDigits = input<number>();
  readonly maxFractionDigits = input<number>();
  readonly readonlyInput = input(false, { transform: booleanAttribute });

  /**
   * Thousands separator. Optimus defaults this on, which is right for counts but
   * wrong for identifier-like numbers — a year renders as `2,016` and a port as
   * `8,025`. Turn it off for those.
   */
  readonly useGrouping = input(true, { transform: booleanAttribute });
}
