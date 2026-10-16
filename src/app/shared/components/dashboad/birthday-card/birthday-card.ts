import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { Cake, LucideAngularModule } from 'lucide-angular';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { SuperAdminDashboardStaffMember } from '@shared/interfaces';

interface BirthdayEntry {
  staffMemberId: string;
  name: string;
  /** Department, or Position where the staffMember has none. */
  subtitle: string;
  birthdayDate: string | null;
  daysUntil: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days from today to `date`. Only the calendar part (`yyyy-MM-dd`) is read, so a time or
 * zone suffix on the API value cannot shift the birthday by a day.
 */
function daysFromToday(date: string | null): number | null {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = new Date(year, month - 1, day).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

@Component({
  selector: 'app-birthday-card',
  imports: [
    CardModule,
    ButtonModule,
    DatePipe,
    TableEmptyMessage,
    TooltipModule,
    LucideAngularModule,
    UserAvatar,
  ],
  templateUrl: './birthday-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdayCard {
  readonly title = input<string>();
  /** Upcoming birthdays; `date` is the next birthday, not the date of birth. */
  readonly staffMembers = input<SuperAdminDashboardStaffMember[] | null>(null);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly Cake = Cake;
  protected readonly skeletonRows = [1, 2, 3];

  protected readonly birthdays = computed<BirthdayEntry[]>(() =>
    (this.staffMembers() ?? []).map((staffMember) => ({
      staffMemberId: staffMember.staffMemberId,
      name: staffMember.staffMemberName,
      subtitle: staffMember.departmentName || staffMember.positionName || '',
      birthdayDate: staffMember.date,
      daysUntil: daysFromToday(staffMember.date),
    })),
  );
}
