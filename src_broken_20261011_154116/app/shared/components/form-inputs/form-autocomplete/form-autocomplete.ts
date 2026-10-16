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
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
  type AutoCompletePassThrough,
} from '@openng/optimus-ui/autocomplete';

import { controlAria } from '../form-field-shell/control-aria';
import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Type-ahead field.
 *
 * {@link multiple} turns it into the chips input — Optimus has no separate
 * `p-chips`, and a tag list is this control with one flag.
 *
 * The caller owns the search: handle {@link completeMethod} and push the
 * results back through {@link suggestions}. The control never fetches.
 *
 * Binds through `p-autocomplete`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed.
 */
@Component({
  selector: 'app-form-autocomplete',
  imports: [FormField, AutoCompleteModule, FormFieldShell],
  templateUrl: './form-autocomplete.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormAutocomplete<T> {
  readonly field = input.required<Field<T>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly suggestions = input<unknown[]>([]);
  readonly optionLabel = input<string>();
  readonly multiple = input(false, { transform: booleanAttribute });
  readonly dropdown = input(false, { transform: booleanAttribute });
  readonly forceSelection = input(true, { transform: booleanAttribute });
  readonly minLength = input(1);
  readonly delay = input(300);
  readonly emptyMessage = input('No matching results found.');

  readonly completeMethod = output<AutoCompleteCompleteEvent>();

  /**
   * Single mode focuses `pcInputText`; {@link multiple} mode focuses the chip-list `input`
   * section, which Optimus binds but leaves out of its pass-through typings. See {@link controlAria}.
   */
  protected readonly pt = computed(() => {
    const aria = controlAria(this.inputId(), this.required());
    return { pcInputText: { root: aria }, input: aria } as unknown as AutoCompletePassThrough;
  });
}
