import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { SuperAdminDashboardStaffMember } from '@shared/interfaces';

/** The most recently onboarded staffMembers, newest first. */
@Component({
  selector: 'app-onboarding-card',
  imports: [ButtonModule, CardModule, DatePipe, TableEmptyMessage, TooltipModule, UserAvatar],
  templateUrl: './onboarding-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingCard {
  readonly title = input<string>();
  /** `date` is the onboarding date. */
  readonly staffMembers = input<SuperAdminDashboardStaffMember[] | null>(null);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly skeletonRows = [1, 2, 3];
}
