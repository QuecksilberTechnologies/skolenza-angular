import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { AssignedCourse, AssignPriority, LearningStatus } from '@shared/interfaces';

import { AssignedStore } from '../store/assigned.store';
import { LdProgressBar } from '../ui/ld-progress-bar';
import { LdStatusBadge } from '../ui/ld-status-badge';

const PRIORITY_CLASS: Record<AssignPriority, string> = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Low: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300',
};

@Component({
  selector: 'app-ld-assigned',
  imports: [
    TableModule,
    SelectModule,
    ButtonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    LdProgressBar,
    LdStatusBadge,
    TableLoader,
    TableEmptyMessage,
  ],
  providers: [AssignedStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-xl border border-border-light bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <p-select
          [options]="priorityOptions"
          placeholder="All priorities"
          [showClear]="true"
          styleClass="w-44"
          ariaLabel="Filter by priority"
          [ngModel]="store.filter().priority ?? null"
          (ngModelChange)="store.setPriority($event)"
        />
        <p-select
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All statuses"
          [showClear]="true"
          styleClass="w-44"
          ariaLabel="Filter by status"
          [ngModel]="store.filter().status ?? null"
          (ngModelChange)="store.setStatus($event)"
        />
        <span class="ml-auto text-sm text-gray-500 dark:text-zinc-400">
          {{ store.filteredItems().length }}
          {{ store.filteredItems().length === 1 ? 'course' : 'courses' }}
        </span>
      </div>

      @if (store.isLoading()) {
        <app-table-loader />
      } @else if (!store.filteredItems().length) {
        <app-table-empty-message
          icon="pi pi-inbox"
          message="Nothing assigned"
          subMessage="Courses assigned by your manager or HR will show up here."
        />
      } @else {
        <p-table
          [value]="store.filteredItems()"
          [paginator]="store.filteredItems().length > 10"
          [rows]="10"
          [rowHover]="true"
          responsiveLayout="scroll"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr
              class="[&>th]:text-xs [&>th]:font-semibold [&>th]:tracking-wide [&>th]:text-gray-500 [&>th]:uppercase dark:[&>th]:text-zinc-400"
            >
              <th>Course</th>
              <th>Assigned By</th>
              <th>Assigned</th>
              <th>Due</th>
              <th>Priority</th>
              <th class="w-44">Progress</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-zinc-100">{{ item.title }}</span>
                  @if (item.mandatory) {
                    <span
                      class="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                    >
                      Mandatory
                    </span>
                  } @else {
                    <span
                      class="rounded-full bg-gray-100 px-2 py-0.5 text-[0.65rem] font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      Optional
                    </span>
                  }
                  @if (isExpired(item)) {
                    <span
                      class="rounded-full bg-red-600 px-2 py-0.5 text-[0.65rem] font-semibold text-white"
                    >
                      Expired
                    </span>
                  }
                </div>
              </td>
              <td class="text-sm whitespace-nowrap">{{ item.assignedBy }}</td>
              <td class="whitespace-nowrap">{{ item.assignedDate | date: 'mediumDate' }}</td>
              <td class="whitespace-nowrap">
                <span [class.text-red-600]="isExpired(item)" [class.font-medium]="isExpired(item)">
                  {{ item.dueDate | date: 'mediumDate' }}
                </span>
              </td>
              <td>
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  [class]="priorityClass(item.priority)"
                >
                  {{ item.priority }}
                </span>
              </td>
              <td>
                <app-ld-progress-bar [value]="item.progress" [label]="item.title + ' progress'" />
              </td>
              <td><app-ld-status-badge [status]="item.status" /></td>
              <td>
                <p-button
                  label="Open"
                  icon="pi pi-arrow-right"
                  size="small"
                  [text]="true"
                  [routerLink]="['../catalog', item.courseId]"
                  [attr.aria-label]="'Open ' + item.title"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export default class LdAssigned {
  protected readonly store = inject(AssignedStore);

  protected readonly priorityOptions: AssignPriority[] = ['High', 'Medium', 'Low'];
  protected readonly statusOptions: { label: string; value: LearningStatus }[] = [
    { label: 'Not Started', value: 'NotStarted' },
    { label: 'In Progress', value: 'InProgress' },
    { label: 'Completed', value: 'Completed' },
  ];

  protected priorityClass(p: AssignPriority): string {
    return PRIORITY_CLASS[p];
  }

  protected isExpired(item: AssignedCourse): boolean {
    return item.status !== 'Completed' && new Date(item.dueDate).getTime() < Date.now();
  }
}
