import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { PasswordModule } from '@openng/optimus-ui/password';

import { controlAria } from '../form-field-shell/control-aria';
import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Password field with the mask toggle on by default.
 *
 * {@link feedback} drives the strength meter; the auth screens keep it off
 * because their rules already live in the zod schema and the meter contradicts
 * them. Set {@link icon} to `pi pi-lock` to match `login.html`.
 *
 * Binds through `p-password`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed.
 */
@Component({
  selector: 'app-form-password',
  imports: [
    NgTemplateOutlet,
    FormField,
    IconFieldModule,
    InputIconModule,
    PasswordModule,
    FormFieldShell,
  ],
  templateUrl: './form-password.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormPassword {
  readonly field = input.required<Field<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly toggleMask = input(true, { transform: booleanAttribute });
  readonly feedback = input(false, { transform: booleanAttribute });
  /** Full icon class, e.g. `pi pi-lock`. Omit for a plain field. */
  readonly icon = input<string>();
  /** `current-password` on sign-in, `new-password` on set/reset. */
  readonly autocomplete = input('off');

  /** See {@link controlAria}. */
  protected readonly aria = computed(() => controlAria(this.inputId(), this.required()));
}
