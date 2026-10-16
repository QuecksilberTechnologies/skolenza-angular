import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { SelectChangeEvent, SelectModule } from '@openng/optimus-ui/select';

import { countryFlagUrl } from '@shared/utilities/country-flag';

/**
 * Country picker — renders each option with its flag.
 *
 * Owns the `#item` / `#selectedItem` markers so the templates hosting it can
 * stay free of duplicate reference names.
 */
@Component({
  selector: 'app-country-select',
  imports: [SelectModule, ReactiveFormsModule],
  templateUrl: './country-select.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    { provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) },
  ],
})
export class CountrySelect {
  readonly controlName = input.required<string>();
  readonly selectId = input<string>();
  readonly inputId = input<string>();
  readonly options = input<unknown[]>([]);
  readonly placeholder = input('Select a country');
  readonly loading = input(false);
  readonly invalid = input(false, { transform: booleanAttribute });

  readonly selectionChange = output<SelectChangeEvent>();

  protected readonly flagUrl = countryFlagUrl;
}
