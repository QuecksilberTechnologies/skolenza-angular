import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { ColorPickerModule } from '@openng/optimus-ui/colorpicker';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { normalizeHex } from '@shared/utilities/color';

import { controlAria } from '../form-field-shell/control-aria';
import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Colour swatch bound to a form field, with a typable hex input beside it.
 *
 * Not `shared/components/color-picker` — that one is the institution brand picker: a
 * CDK overlay with a curated palette and no form binding at all.
 *
 * Binds through `p-colorpicker`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed. The format is fixed to `hex`, so the
 * accessor writes `#rrggbb` — Optimus prepends the `#` itself — and the field
 * value is directly usable. Optimus' `rgb` and `hsb` formats are deliberately not
 * exposed: they write an *object* to the model, which a `Field<string>` cannot
 * hold and the swatch caption would render as `[object Object]`.
 *
 * The swatch alone is not a keyboard-reachable way to set an exact value, so the
 * hex input is the real control: it accepts a pasted `abc`, `#abc` or `2563EB`
 * and normalises to `#rrggbb` on blur.
 *
 * A institution brand colour must clear `contrast(brand, #ffffff) >= 3.0`; that gate
 * belongs in the form's zod schema, not here — as does rejecting malformed hex.
 */
@Component({
  selector: 'app-form-color',
  imports: [FormField, ColorPickerModule, InputTextModule, FormFieldShell],
  templateUrl: './form-color.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormColor {
  readonly field = input.required<Field<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly submitted = input(false, { transform: booleanAttribute });

  /** Written raw so a half-typed value still reaches the schema and reports itself. */
  protected onHexInput(event: Event): void {
    const state = this.field()();
    state.value.set((event.target as HTMLInputElement).value);
    state.markAsDirty();
  }

  protected onHexBlur(event: Event): void {
    const state = this.field()();
    const normalized = normalizeHex((event.target as HTMLInputElement).value);
    if (normalized && normalized !== state.value()) {
      state.value.set(normalized);
    }
    state.markAsTouched();
  }

  /** Swatch only: the hex input carries `aria-required` itself. See {@link controlAria}. */
  protected readonly aria = computed(() => controlAria(this.inputId()));
}
