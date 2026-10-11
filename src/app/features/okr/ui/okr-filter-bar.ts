import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { Select } from '@openng/optimus-ui/select';

import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { IOkrFilter, SettledSearchTerm } from '@shared/interfaces';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-okr-filter-bar',
  imports: [FormsModule, Select, ButtonModule, TableSearchInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="sticky top-0 z-10 mb-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/85 p-2 shadow-sm backdrop-blur sm:flex-row sm:flex-wrap sm:items-center dark:border-zinc-800 dark:bg-zinc-900/85"
    >
      <app-table-search-input
        class="block w-full sm:min-w-48 sm:flex-1"
        [fullWidth]="true"
        placeholder="Search objectives, owners…"
        ariaLabel="Search OKRs"
        (searchTerm)="searchChange.emit($event)"
      />
      <p-select
        [options]="departmentOptions()"
        optionLabel="label"
        optionValue="value"
        placeholder="Department"
        [showClear]="true"
        appendTo="body"
        class="w-full sm:w-auto sm:min-w-44"
        (onChange)="filterChange.emit({ departmentId: $event.value })"
      />
      <p-select
        [options]="quarterOptions()"
        optionLabel="label"
        optionValue="value"
        placeholder="Quarter"
        [showClear]="true"
        appendTo="body"
        class="w-full sm:w-auto sm:min-w-36"
        (onChange)="filterChange.emit({ quarter: $event.value })"
      />
      <p-button
        label="View all OKRs"
        icon="pi pi-list"
        [outlined]="true"
        styleClass="w-full sm:w-auto"
        (onClick)="viewAll.emit()"
      />
    </div>
  `,
})
export class OkrFilterBar {
  readonly departmentOptions = input.required<SelectOption[]>();
  readonly quarterOptions = input.required<SelectOption[]>();

  readonly searchChange = output<SettledSearchTerm>();
  readonly filterChange = output<Partial<IOkrFilter>>();
  readonly viewAll = output<void>();
}
