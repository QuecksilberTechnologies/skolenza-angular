import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { RadioButtonModule } from '@openng/optimus-ui/radiobutton';

import { FormFieldShell } from '../form-field-shell/form-field-shell';

/** One option row in a {@link FormRadioGroup}. */
export interface RadioOption<T> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

/**
 * Radio group.
 *
 * A group has no single focusable control to label, so the shell renders its
 * caption as a `<span id="<inputId>-label">` ({@link FormFieldShell.groupLabel})
 * and the list carries `role="radiogroup"` + `aria-labelledby`. Each radio gets
 * `<inputId>-<index>` as its own id so its own `<label for>` still resolves.
 *
 * Every radio binds the same field, so each gets its own `[formField]` plus a
 * `[value]`. Optimus' `RadioControlRegistry` and the Signal Forms binding do not
 * fight over the group: the `FormField` directive overwrites the rendered `name`
 * with the field's own path (`ng.form0.employmentType`), which is unique per
 * field, so two groups on one page keep their selections independent. Verified
 * on the `form-inputs-demo` page, which renders two.
 */
@Component({
  selector: 'app-form-radio-group',
  imports: [FormField, RadioButtonModule, FormFieldShell],
  templateUrl: './form-radio-group.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormRadioGroup<T> {
  readonly field = input.required<Field<T>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly options = input.required<readonly RadioOption<T>[]>();
  /** `vertical` stacks the options; `horizontal` lays them out in a wrapping row. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
}
