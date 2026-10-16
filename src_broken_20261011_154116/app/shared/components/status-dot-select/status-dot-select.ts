import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { SelectChangeEvent, SelectModule } from '@openng/optimus-ui/select';

/**
 * Select whose options carry a `color` class and a `label` — used for status and
 * priority pickers.
 *
 * Owns the `#item` / `#selectedItem` markers so the templates hosting several of
 * these stay free of duplicate reference names. Binds to {@link controlName} on
 * the surrounding form; filter usages back it with a plain local form group.
 */
@Component({
  selector: 'app-status-dot-select',
  imports: [SelectModule, ReactiveFormsModule],
  templateUrl: './status-dot-select.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    { provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) },
  ],
})
export class StatusDotSelect {
  readonly controlName = input.required<string>();
  readonly selectId = input<string>();
  readonly inputId = input<string>();
  readonly options = input<unknown[]>([]);
  readonly optionLabel = input<string>();
  readonly optionValue = input<string>();
  readonly placeholder = input<string>();
  readonly showClear = input(false);
  readonly invalid = input(false, { transform: booleanAttribute });
  /** Extra classes on the option's dot icon, e.g. `!text-sm`. */
  readonly iconClass = input('');
  /** Extra classes on the option's label. */
  readonly labelClass = input('');
  /** Overrides the chevron, e.g. `pi pi-filter text-gray-400` on filter selects. */
  readonly dropdownIcon = input<string>();

  readonly selectionChange = output<SelectChangeEvent>();
}
