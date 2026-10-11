import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { MessageModule } from '@openng/optimus-ui/message';

import { fieldErrorMessage, showFieldError } from '@shared/utilities/field-error';

import { controlAria } from '../form-field-shell/control-aria';

/**
 * Single boolean checkbox with its label beside it.
 *
 * Does not use `app-form-field-shell`: the shell stacks a caption above the
 * control, which is the wrong reading order for a checkbox. It repeats the
 * shell's message slot instead, so the two stay visually aligned.
 */
@Component({
  selector: 'app-form-checkbox',
  imports: [FormField, CheckboxModule, MessageModule],
  templateUrl: './form-checkbox.html',
  host: { class: 'block space-y-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormCheckbox {
  readonly field = input.required<Field<boolean>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });

  /** Same rule the shell applies — see `@shared/utilities/field-error`. */
  protected readonly showError = computed(() => showFieldError(this.field(), this.submitted()));
  protected readonly errorMessage = computed(() => fieldErrorMessage(this.field()));

  /** See {@link controlAria}. */
  protected readonly aria = computed(() => controlAria(this.inputId(), this.required()));
}
