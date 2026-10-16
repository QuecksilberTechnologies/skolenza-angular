import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from '@openng/optimus-ui/select';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

/**
 * `p-select` for a table's inline filter row, with a tooltip on every option.
 *
 * A filter panel truncates long labels to one line, so the full value has to be reachable some
 * other way. Optimus resolves the `#item` marker by reference name and a name may appear only once
 * per template, so a caption hosting several filters cannot declare it inline — this component owns
 * the marker instead.
 *
 * Filters read the store rather than a form, so the value arrives one-way through {@link value} and
 * leaves through {@link valueChange}; there is no `ControlValueAccessor` here on purpose.
 */
@Component({
  selector: 'app-table-filter-select',
  imports: [FormsModule, SelectModule, TooltipModule],
  templateUrl: './table-filter-select.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableFilterSelect<T> {
  readonly options = input<unknown[]>([]);
  readonly optionLabel = input.required<string>();
  readonly optionValue = input<string>();
  readonly placeholder = input<string>();
  readonly ariaLabel = input<string>();
  readonly value = input<T | null>(null);
  readonly loading = input(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly filter = input(false, { transform: booleanAttribute });
  /** Defaults to {@link optionLabel} — a filter box searches the text the reader can see. */
  readonly filterBy = input<string>();
  /** Explains why the select is blocked. Suppressed while the select is usable. */
  readonly blockedReason = input<string>();

  readonly valueChange = output<T | null>();

  /** The option `value` points at, so the trigger can name what it is too narrow to show. */
  readonly #selected = computed(() => {
    const value = this.value();
    if (value === null || value === undefined) {
      return null;
    }
    const key = this.optionValue();
    return (
      this.options().find((option) =>
        key ? (option as Record<string, unknown>)[key] === value : option === value,
      ) ?? null
    );
  });

  /**
   * The trigger clips a long selection, so the whole value is reachable on hover. A blocked select
   * explains why it is blocked instead — that is the more useful thing to say.
   */
  protected readonly tooltip = computed(() =>
    this.disabled() ? (this.blockedReason() ?? '') : this.label(this.#selected()),
  );

  protected label(option: unknown): string {
    const value = (option as Record<string, unknown> | null)?.[this.optionLabel()];
    return value === null || value === undefined ? '' : `${value}`;
  }
}
