import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { SelectChangeEvent, SelectModule } from '@openng/optimus-ui/select';

import { controlAria } from '../form-field-shell/control-aria';
import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Single-choice select.
 *
 * The Signal Forms counterpart of `shared/components/select-field`, which stays
 * on Reactive Forms and `controlName`. Both own the `#empty` / `#emptyfilter`
 * markers so a template hosting several selects never declares a reference name
 * twice — that constraint is the reason these wrappers exist at all.
 *
 * Binds through `p-select`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed.
 */
@Component({
  selector: 'app-form-select',
  imports: [FormField, SelectModule, FormFieldShell],
  templateUrl: './form-select.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSelect<T> {
  readonly field = input.required<Field<T>>();
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
  readonly filter = input(false, { transform: booleanAttribute });
  readonly filterBy = input<string>();
  /** Class on the overlay panel, e.g. `select-option-truncate` for long option labels. */
  readonly panelStyleClass = input<string>();

  /** Heading of the panel shown when the select has no options at all. */
  readonly emptyTitle = input('No options available');
  /** Supporting copy under {@link emptyTitle}. */
  readonly emptyDetail = input('There are currently no records to display.');
  /** Message shown when the filter box matches nothing. */
  readonly emptyFilterMessage = input(
    'No matching results found. Try adjusting your search criteria.',
  );

  readonly selectionChange = output<SelectChangeEvent>();

  /** See {@link controlAria}. */
  protected readonly aria = computed(() => controlAria(this.inputId(), this.required()));
}
