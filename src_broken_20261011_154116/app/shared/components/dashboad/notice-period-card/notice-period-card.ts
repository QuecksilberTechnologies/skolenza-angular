import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { AvatarColor } from '@shared/directives/avatar-color';
import { NoticePeriodStaffMember } from '@shared/interfaces';

import { DashboardCardHeader } from '../dashboard-card-header/dashboard-card-header';
import { RowStatus, RowStatusChip } from '../row-status/row-status';

/** StaffMembers serving their notice period, with the days they have left. */
@Component({
  selector: 'app-notice-period-card',
  imports: [AvatarColor, CardModule, DashboardCardHeader, DatePipe, RowStatus, TableEmptyMessage],
  template: `
    <p-card
      class="h-full shadow-sm dark:border dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none"
    >
      <ng-template #header>
        <app-dashboard-card-header
          [title]="title()"
          [placeholder]="placeholder()"
          [loading]="loading()"
          [refreshable]="refreshable()"
          (refresh)="refresh.emit()"
        />
      </ng-template>
      <ng-template #content>
        <ul
          class="m-0 max-h-96 list-none divide-y divide-zinc-100 overflow-y-auto p-0 dark:divide-zinc-800"
          [attr.aria-busy]="loading()"
        >
          @if (loading() && !staffMembers()?.length) {
            @for (row of skeletonRows(); track row) {
              <!-- same line heights as a loaded name/designation row, so nothing moves when data lands -->
              <li class="flex items-center gap-3 py-3" aria-hidden="true">
                <span
                  class="size-9 shrink-0 animate-pulse rounded-full bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                ></span>
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <p class="m-0 text-base">
                    <span
                      class="inline-block w-32 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                    >
                      &nbsp;
                    </span>
                  </p>
                  <p class="m-0 text-sm">
                    <span
                      class="inline-block w-20 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
                    >
                      &nbsp;
                    </span>
                  </p>
                </div>
              </li>
            }
          } @else {
            @for (staffMember of staffMembers() ?? []; track staffMember.code ?? $index) {
              <li class="flex items-center justify-between gap-4 py-3">
                <div class="flex min-w-0 items-center gap-3">
                  <span
                    class="flex size-9 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                    [appAvatarColor]="staffMember.staffMemberName ?? ''"
                    aria-hidden="true"
                  ></span>
                  <div class="flex min-w-0 flex-col gap-1">
                    <p class="m-0 truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
                      {{ staffMember.staffMemberName }}
                    </p>
                    <p class="m-0 truncate text-sm text-zinc-500 dark:text-zinc-400">
                      @if (staffMember.designationName || staffMember.departmentName; as role) {
                        {{ role }}
                      } @else {
                        <span aria-hidden="true">—</span>
                        <span class="sr-only">No designation</span>
                      }
                    </p>
                  </div>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1 text-sm">
                  <!-- urgent is a state, so it gets a chip; a plain countdown stays text -->
                  <app-row-status
                    [text]="daysLeft(staffMember.noticeDaysRemaining)"
                    [chip]="staffMember.noticeDaysRemaining <= urgentDays ? urgentChip : null"
                  />
                  <span class="text-zinc-500 dark:text-zinc-400">
                    {{ staffMember.expectedLastWorkingDate | date: 'd MMM y' }}
                  </span>
                </div>
              </li>
            } @empty {
              <li>
                <app-table-empty-message
                  icon="pi pi-sign-out"
                  message="No one on notice"
                  subMessage="StaffMembers serving notice show here"
                />
              </li>
            }
          }
        </ul>
      </ng-template>
    </p-card>
  `,
  // the static title="..." the parent writes would otherwise render as a native tooltip
  host: { '[attr.title]': 'null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticePeriodCard {
  readonly title = input<string>();
  readonly staffMembers = input<NoticePeriodStaffMember[] | null>(null);
  /** The backend still fakes this section's values. */
  readonly placeholder = input(false);
  readonly loading = input(false);
  readonly refreshable = input(true);
  readonly refresh = output<void>();

  /** Placeholder rows shown while loading; match the usual loaded count to avoid a jump. */
  readonly skeletonCount = input(3);
  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonCount() }, (_, i) => i),
  );

  /** At or under this many days the row turns amber with a clock, so it reads as urgent. */
  protected readonly urgentDays = 7;
  protected readonly urgentChip: RowStatusChip = { severity: 'warn', icon: 'pi pi-clock' };

  protected daysLeft(days: number): string {
    if (days <= 0) return 'Last day';
    return days === 1 ? '1 day left' : `${days} days left`;
  }
}
