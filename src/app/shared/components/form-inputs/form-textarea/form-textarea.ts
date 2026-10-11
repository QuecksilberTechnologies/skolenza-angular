import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { TextareaModule } from '@openng/optimus-ui/textarea';

import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * Multi-line text field.
 *
 * This is one of only two controls in the set that cannot use `[formField]`.
 * `pTextarea` injects `NgControl` and subscribes to `ngControl.valueChanges`;
 * the `NgControl` that `[formField]` provides is an interop shim with no
 * `valueChanges`, so the binding throws at runtime. The value is therefore
 * bound in and written back by hand here — which is the boilerplate every
 * existing caller (`module-form.html`, `attendance-policy-form.ts`,
 * `device-master-form.ts`) repeats today, now in one place.
 */
@Component({
  selector: 'app-form-textarea',
  imports: [TextareaModule, FormFieldShell],
  templateUrl: './form-textarea.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormTextarea {
  readonly field = input.required<Field<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly rows = input(3);
  readonly autoResize = input(false, { transform: booleanAttribute });
  /** Hard cap on typing; pair it with the schema's `.max()`, which still owns the error message. */
  readonly maxlength = input<number>();

  protected onInput(event: Event): void {
    const state = this.field()();
    state.value.set((event.target as HTMLTextAreaElement).value);
    state.markAsDirty();
  }

  /** `pTextarea` does not relay blur to the field either. */
  protected onBlur(): void {
    this.field()().markAsTouched();
  }
}
