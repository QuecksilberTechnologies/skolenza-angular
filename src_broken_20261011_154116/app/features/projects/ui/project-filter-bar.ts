import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';

import { Assignee, ProjectTaskFilter } from '@shared/interfaces';

import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../projects-nav';

/** Shared search + filter bar used by the List and Board tabs. */
@Component({
  selector: 'app-project-filter-bar',
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <p-iconfield class="grow sm:grow-0">
        <p-inputicon class="pi pi-search" />
        <input
          type="text"
          pInputText
          placeholder="Search tasks…"
          [ngModel]="search()"
          (ngModelChange)="searchChange.emit($event)"
          class="w-full sm:w-64"
          aria-label="Search tasks"
        />
      </p-iconfield>

      <p-select
        [options]="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Status"
        [showClear]="true"
        [ngModel]="filters()?.status ?? null"
        (ngModelChange)="patch({ status: $event })"
        styleClass="w-40"
        ariaLabel="Filter by status"
      />

      <p-select
        [options]="priorityOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Priority"
        [showClear]="true"
        [ngModel]="filters()?.priority ?? null"
        (ngModelChange)="patch({ priority: $event })"
        styleClass="w-40"
        ariaLabel="Filter by priority"
      />

      <p-select
        [options]="assignees()"
        optionLabel="name"
        optionValue="id"
        placeholder="Assignee"
        [showClear]="true"
        [ngModel]="filters()?.assigneeId ?? null"
        (ngModelChange)="patch({ assigneeId: $event })"
        styleClass="w-44"
        ariaLabel="Filter by assignee"
      />

      @if (tags().length) {
        <p-select
          [options]="tags()"
          placeholder="Tag"
          [showClear]="true"
          [ngModel]="filters()?.tag ?? null"
          (ngModelChange)="patch({ tag: $event })"
          styleClass="w-40"
          ariaLabel="Filter by tag"
        />
      }

      @if (filterCount()) {
        <p-button
          label="Clear"
          icon="pi pi-filter-slash"
          severity="secondary"
          [text]="true"
          (onClick)="clear.emit()"
        />
      }
    </div>
  `,
})
export class ProjectFilterBar {
  readonly search = input<string>('');
  readonly filters = input<ProjectTaskFilter | null>(null);
  readonly assignees = input<Assignee[]>([]);
  readonly tags = input<string[]>([]);
  readonly filterCount = input<number>(0);

  readonly searchChange = output<string>();
  readonly filterChange = output<ProjectTaskFilter>();
  readonly clear = output<void>();

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected patch(part: Partial<ProjectTaskFilter>): void {
    this.filterChange.emit({ ...this.filters(), ...part });
  }
}
