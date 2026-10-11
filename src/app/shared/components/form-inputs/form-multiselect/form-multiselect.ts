import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import {
  MultiSelectChangeEvent,
  MultiSelectModule,
  type MultiSelectPassThrough,
} from '@openng/optimus-ui/multiselect';

import { controlAria } from '../form-field-shell/control-aria';
import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Multi-choice select. Owns the `#empty` / `#emptyfilter` markers for the same
 * reason `app-form-select` does.
 *
 * Binds through `p-multiselect`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed.
 */
@Component({
  selector: 'app-form-multiselect',
  imports: [FormField, MultiSelectModule, FormFieldShell],
  templateUrl: './form-multiselect.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormMultiSelect<T> {
  readonly field = input.required<Field<T[]>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly options = input<unknown[]>([]);
  readonly optionLabel = input<string>();
  readonly optionValue = input<string>();
  readonly loading = input(false, { transform: booleanAttribute });
  readonly showClear = input(false, { transform: booleanAttribute });
  readonly filter = input(true, { transform: booleanAttribute });
  readonly showToggleAll = input(true, { transform: booleanAttribute });
  /** Chip list past this many selections collapses to "n items selected". */
  readonly maxSelectedLabels = input(3);

  readonly emptyTitle = input('No options available');
  readonly emptyDetail = input('There are currently no records to display.');
  readonly emptyFilterMessage = input(
    'No matching results found. Try adjusting your search criteria.',
  );

  readonly selectionChange = output<MultiSelectChangeEvent>();

  /**
   * The focusable combobox is the `hiddenInput` section, which Optimus renders through
   * `pBind` but leaves out of its pass-through typings. See {@link controlAria}.
   */
  protected readonly pt = computed(
    () =>
      ({
        hiddenInput: controlAria(this.inputId(), this.required()),
      }) as unknown as MultiSelectPassThrough,
  );
}
