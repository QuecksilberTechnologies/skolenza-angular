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
 * Asset status picker — renders each option with its colour swatch.
 *
 * Owns the `#item` / `#selectedItem` / `#empty` / `#emptyfilter` markers so the
 * templates hosting it can stay free of duplicate reference names.
 */
@Component({
  selector: 'app-asset-status-select',
  imports: [SelectModule, ReactiveFormsModule],
  templateUrl: './asset-status-select.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    { provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) },
  ],
})
export class AssetStatusSelect {
  readonly controlName = input.required<string>();
  readonly selectId = input<string>();
  readonly inputId = input<string>();
  readonly options = input<unknown[]>([]);
  readonly placeholder = input('Select status');
  readonly loading = input(false);
  readonly showClear = input(false);
  readonly invalid = input(false, { transform: booleanAttribute });

  readonly selectionChange = output<SelectChangeEvent>();
}
