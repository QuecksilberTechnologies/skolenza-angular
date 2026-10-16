import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { TrimInput } from '@shared/directives';

import { FormFieldShell } from '../form-field-shell/form-field-shell';

/** Upper-cased, with each run of whitespace or dashes collapsed to one dash and no leading dash. */
function formatCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]+/g, '-')
    .replace(/^-/, '');
}

/**
 * Single-line text field. Covers `text`, `email`, `tel` and `url` through
 * {@link type} — they differ only in the keyboard the browser offers, never in
 * validation, which stays in the form's zod schema (`.claude/docs/forms.md`).
 *
 * Pass {@link icon} to wrap the input in `p-iconfield`; Optimus owns the padding,
 * so no manual `pl-10!` is needed.
 */
@Component({
  selector: 'app-form-text',
  imports: [
    NgTemplateOutlet,
    FormField,
    TrimInput,
    AutoFocusModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    FormFieldShell,
  ],
  templateUrl: './form-text.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormText {
  readonly field = input.required<Field<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string>();
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly autofocus = input(false, { transform: booleanAttribute });
  readonly type = input<'text' | 'email' | 'tel' | 'url'>('text');
  /** Full icon class, e.g. `pi pi-user`. Omit for a plain input. */
  readonly icon = input<string>();
  /** Native autocomplete token, e.g. `name`, `email`, `postal-code`. */
  readonly autocomplete = input<string>();
  /**
   * Set false for code-like values (`en`, `IN-MH`, a SKU) the browser would
   * otherwise red-underline. It also turns off autocorrect and autocapitalise,
   * which mangle the same values on mobile keyboards.
   */
  readonly spellcheck = input(true, { transform: booleanAttribute });
  /** Format as a code while typing: capitals, and each run of spaces or dashes becomes one dash
   *  (`mh  casual` → `MH-CASUAL`). A trailing dash survives typing and is dropped on blur. */
  readonly codeFormat = input(false, { transform: booleanAttribute });

  protected onInput(event: Event): void {
    if (!this.codeFormat() || (event as InputEvent).isComposing) return;
    const el = event.target as HTMLInputElement;
    const formatted = formatCode(el.value);
    if (formatted === el.value) return;
    // Formatting can change the length (`ß` → `SS`, collapsed dashes), so the caret goes to the
    // end of the formatted text before it.
    const caret = formatCode(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
    el.value = formatted;
    el.setSelectionRange(caret, caret);
    this.#setControlValue(formatted);
  }

  protected onBlur(): void {
    if (!this.codeFormat()) return;
    const value = this.field()().value();
    const trimmed = value.replace(/-+$/, '');
    if (trimmed !== value) this.#setControlValue(trimmed);
  }

  /** `controlValue`, not `value`, is what the `[formField]` binding writes back — see `TrimInput`. */
  #setControlValue(value: string): void {
    this.field()().controlValue.set(value);
  }

  // TODO: value and blur come from `[formField]` on the native input, so the
  // binding itself is done. Still open: `appTrimInput` is applied
  // unconditionally — make it opt-in if a caller ever needs leading or trailing
  // whitespace preserved.
}
