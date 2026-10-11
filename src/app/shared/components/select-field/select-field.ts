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
 * `p-select` bound to a control on the surrounding form, with the shared
 * "no options" / "no matches" panel states built in.
 *
 * Optimus resolves its projected templates by reference name, so a template
 * that hosts several selects can only declare `#empty` / `#emptyfilter` once.
 * Owning the select here keeps every marker unique per component.
 */
@Component({
  selector: 'app-select-field',
  imports: [SelectModule, ReactiveFormsModule],
  templateUrl: './select-field.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    { provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) },
  ],
})
export class SelectField {
  readonly controlName = input.required<string>();
  readonly selectId = input<string>();
  readonly inputId = input<string>();
  readonly options = input<unknown[]>([]);
  readonly optionLabel = input<string>();
  readonly optionValue = input<string>();
  readonly placeholder = input<string>();
  readonly loading = input(false);
  readonly showClear = input(false);
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Heading of the panel shown when the select has no options at all. */
  readonly emptyTitle = input('No options available');
  /** Supporting copy under {@link emptyTitle}. */
  readonly emptyDetail = input('There are currently no records to display.');
  /** Highlighted call to action rendered on its own line below {@link emptyDetail}. */
  readonly emptyActionText = input('Please contact your administrator');
  /** Plain copy that follows {@link emptyActionText} on the same line. */
  readonly emptyActionSuffix = input('to configure available options.');
  /** Message shown when the filter box matches nothing. */
  readonly emptyFilterMessage = input(
    'No matching results found. Try adjusting your search criteria.',
  );

  readonly selectionChange = output<SelectChangeEvent>();
}
