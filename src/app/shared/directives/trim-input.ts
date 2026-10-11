import { Directive, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';

@Directive({
  selector: '[appTrimInput]',
  host: { '(blur)': 'onBlur()' },
})
export class TrimInput {
  /**
   * `[formField]` also provides an `NgControl` — Angular's `InteropNgControl`, which has a `value`
   * getter but no `setValue`. So the Signal Forms binding has to win here, not act as a fallback.
   */
  readonly #formField = inject<FormField<unknown>>(FormField, { optional: true });
  readonly #ngControl = inject(NgControl, { optional: true });

  onBlur(): void {
    if (this.#formField) {
      // `controlValue` is a `linkedSignal` on the field value, and it — not `value` — is what the
      // binding writes back to the control.
      const state = this.#formField.state();
      const value = state.value();

      if (typeof value === 'string' && value !== value.trim()) {
        state.controlValue.set(value.trim());
      }
      return;
    }

    const value = this.#ngControl?.control?.value;
    if (value) {
      this.#ngControl?.control?.setValue(value.trim());
    }
  }
}
