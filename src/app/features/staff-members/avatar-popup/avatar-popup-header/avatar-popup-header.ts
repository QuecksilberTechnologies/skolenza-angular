import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { IStaffMember, SummaryStaffMemberInfo } from '@shared/interfaces';

@Component({
  selector: 'app-avatar-popup-header',
  imports: [UserAvatar],
  templateUrl: './avatar-popup-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPopupHeader {
  readonly staffMember = input.required<IStaffMember>();
  readonly summary = input.required<SummaryStaffMemberInfo>();
}
