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

import { Country } from '@shared/interfaces';
import { countryFlagUrl } from '@shared/utilities/country-flag';

import { controlAria } from '../form-field-shell/control-aria';
import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Country picker — renders each option with its flag.
 *
 * The Signal Forms counterpart of `shared/components/country-select`, which stays on
 * Reactive Forms and `controlName`. Both own the `#item` / `#selectedItem` markers so a
 * template hosting several selects never declares a reference name twice — that constraint
 * is the reason these wrappers exist at all.
 */
@Component({
  selector: 'app-form-country',
  imports: [FormField, SelectModule, FormFieldShell],
  templateUrl: './form-country.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormCountry {
  readonly field = input.required<Field<number | null>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input('Select a country');
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly options = input<Country[]>([]);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly filter = input(false, { transform: booleanAttribute });

  readonly selectionChange = output<SelectChangeEvent>();

  protected readonly flagUrl = countryFlagUrl;

  /** See {@link controlAria}. */
  protected readonly aria = computed(() => controlAria(this.inputId(), this.required()));
}
