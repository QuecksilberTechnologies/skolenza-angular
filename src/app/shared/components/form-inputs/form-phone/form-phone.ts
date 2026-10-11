import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { InputGroupModule } from '@openng/optimus-ui/inputgroup';
import { InputGroupAddonModule } from '@openng/optimus-ui/inputgroupaddon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { TrimInput } from '@shared/directives';

import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Phone number field, prefixed with the dial code of the country already chosen elsewhere
 * on the form.
 *
 * The field holds the local part only — the caller prepends {@link dialCode} when building
 * the request body, the same split the API stores.
 */
@Component({
  selector: 'app-form-phone',
  imports: [
    FormField,
    TrimInput,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    FormFieldShell,
  ],
  templateUrl: './form-phone.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormPhone {
  readonly field = input.required<Field<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  /** Empty until a country is selected, which is when the addon appears. */
  readonly dialCode = input('');
}
