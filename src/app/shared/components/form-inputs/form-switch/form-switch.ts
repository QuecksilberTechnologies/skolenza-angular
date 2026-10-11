import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type Field, FormField } from '@angular/forms/signals';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { FormHintIcon } from '../form-hint-icon/form-hint-icon';

/**
 * Bordered label/switch row — the field-bound counterpart of
 * `shared/components/toggle-field`, which projects the switch and leaves the
 * binding to the caller.
 *
 * The box is the host, so callers can pass layout classes (`md:col-span-2`)
 * straight onto the tag. No message slot: a boolean field has nothing to say
 * beyond its own state, and every existing toggle row in the app renders none.
 *
 * Binds through `p-toggleswitch`'s `ControlValueAccessor`; see `app-form-date` for
 * why the `$any(...)` cast is still needed and why there is no local `disabled`
 * input.
 */
@Component({
  selector: 'app-form-switch',
  imports: [FormField, ToggleSwitchModule, FormHintIcon],
  templateUrl: './form-switch.html',
  host: {
    class:
      'flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-zinc-700',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSwitch {
  readonly field = input.required<Field<boolean>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  /** Moves the hint behind an info-icon tooltip, like `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
}
