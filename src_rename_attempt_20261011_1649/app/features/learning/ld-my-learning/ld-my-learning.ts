import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { LearningStatus } from '@shared/interfaces';

import { LearningStore } from '../store/learning.store';
import { LdProgressBar } from '../ui/ld-progress-bar';
import { LdStatusBadge } from '../ui/ld-status-badge';

@Component({
  selector: 'app-ld-my-learning',
  imports: [
    TableModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    FormsModule,
    RouterLink,
    DatePipe,
    LdProgressBar,
    LdStatusBadge,
    TableLoader,
    TableEmptyMessage,
  ],
  providers: [LearningStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-xl border border-border-light bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="relative">
          <i
            class="pi pi-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400"
            aria-hidden="true"
          ></i>
          <input
            pInputText
            type="search"
            placeholder="Search courses"
            class="w-64 !pl-9"
            aria-label="Search my learning"
            [ngModel]="store.filter().search ?? ''"
            (ngModelChange)="store.setSearch($event)"
          />
        </span>
        <p-select
          [options]="categoryOptions()"
          placeholder="All categories"
          [showClear]="true"
          styleClass="w-48"
          ariaLabel="Filter by category"
          [ngModel]="store.filter().category ?? null"
          (ngModelChange)="store.setCategory($event)"
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
          icon="pi pi-book"
          message="Nothing here yet"
          subMessage="Enrolled courses will appear here as you start learning."
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
              <th>Category</th>
              <th class="w-48">Progress</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Last Accessed</th>
              <th>Action</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td>
                <div class="flex items-center gap-3">
                  <img
                    [src]="item.thumbnail"
                    [alt]="item.title + ' thumbnail'"
                    width="64"
                    height="40"
                    loading="lazy"
                    class="h-10 w-16 shrink-0 rounded object-cover"
                  />
                  <span class="font-medium text-gray-900 dark:text-zinc-100">{{ item.title }}</span>
                </div>
              </td>
              <td>{{ item.category }}</td>
              <td>
                <app-ld-progress-bar [value]="item.progress" [label]="item.title + ' progress'" />
              </td>
              <td class="whitespace-nowrap tabular-nums">{{ item.durationHours }}h</td>
              <td><app-ld-status-badge [status]="item.status" /></td>
              <td class="whitespace-nowrap">{{ item.lastAccessed | date: 'mediumDate' }}</td>
              <td>
                <p-button
                  [label]="item.status === 'Completed' ? 'Review' : 'Continue'"
                  [icon]="item.status === 'Completed' ? 'pi pi-replay' : 'pi pi-play'"
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
export default class LdMyLearning {
  protected readonly store = inject(LearningStore);

  protected readonly statusOptions: { label: string; value: LearningStatus }[] = [
    { label: 'Not Started', value: 'NotStarted' },
    { label: 'In Progress', value: 'InProgress' },
    { label: 'Completed', value: 'Completed' },
  ];

  protected readonly categoryOptions = computed(() => this.store.categories());
}
