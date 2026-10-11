import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { MessageModule } from '@openng/optimus-ui/message';

import { fieldErrorMessage, showFieldError } from '@shared/utilities/field-error';

import { FormHintIcon } from '../form-hint-icon/form-hint-icon';

/**
 * Layout shell every `app-form-*` control projects into — label, required marker
 * and the reserved message slot. Not exported from the barrel: callers reach for
 * a typed control (`app-form-text`, `app-form-select`, …), never for this.
 *
 * The markup is the "modern" field dialect already used by the host and institution
 * forms — see `features/host/device-masters/device-master-form/device-master-form.html`
 * and `features/campuses/campus-form/campus-form.html`.
 * The message slot keeps a `min-h-5` floor under an inline hint so a field does
 * not shift the layout when its error appears, and geometry matches
 * `form-skeleton/form-skeleton-field.ts`.
 *
 * Projected controls read {@link showError} through a template reference on the
 * host tag (`<app-form-field-shell #shell>` … `[class.p-invalid]="shell.showError()"`),
 * which is why it is public.
 */
@Component({
  selector: 'app-form-field-shell',
  imports: [MessageModule, FormHintIcon],
  templateUrl: './form-field-shell.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldShell<T> {
  /** The bound Signal Forms field — the single source for error state. */
  readonly field = input.required<Field<T>>();
  /** Id of the control this labels; the message slot derives `<inputId>-help` from it. */
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  /** Shown in the message slot while there is no error to report. */
  readonly hint = input<string>();
  /**
   * Moves the hint behind an info-icon tooltip beside the label. Opt-in, for optional
   * clarification or tight side-by-side rows; most hints read better inline.
   */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  /** Set once the form has been submitted, so untouched invalid fields start speaking up. */
  readonly submitted = input(false, { transform: booleanAttribute });
  /**
   * Renders the caption as a `<span>` instead of a `<label>`, for controls that
   * have no single focusable target (radio group, file upload). Those set
   * `role="group"`/`"radiogroup"` and point `aria-labelledby` at `<inputId>-label`.
   */
  readonly groupLabel = input(false, { transform: booleanAttribute });

  /**
   * The shared rule from `@shared/utilities/field-error`, so the shell, `app-form-checkbox`
   * and the raw feature forms all report errors at the same moment.
   */
  readonly showError = computed(() => showFieldError(this.field(), this.submitted()));

  /** First zod issue message on the bound field. */
  readonly errorMessage = computed(() => fieldErrorMessage(this.field()));

  /**
   * Whether the message slot shows anything — an empty slot, or one holding only the sr-only copy of
   * an icon hint, adds no spacing under the control.
   */
  protected readonly hasMessage = computed(
    () => (this.showError() && !!this.errorMessage()) || (!!this.hint() && !this.hintIcon()),
  );
}
