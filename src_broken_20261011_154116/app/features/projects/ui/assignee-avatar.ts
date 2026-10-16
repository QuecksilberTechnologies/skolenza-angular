import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { Assignee } from '@shared/interfaces';

/** Colored-initial avatar for a task assignee (falls back to an "Unassigned" dash). */
@Component({
  selector: 'app-assignee-avatar',
  imports: [UserAvatar, AvatarModule, TooltipModule],
  template: `
    @if (assignee(); as a) {
      <app-user-avatar [size]="size()" [name]="a.name" [pTooltip]="a.name" tooltipPosition="top" />
    } @else {
      <p-avatar
        icon="pi pi-user"
        shape="circle"
        [size]="size()"
        pTooltip="Unassigned"
        tooltipPosition="top"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssigneeAvatar {
  readonly assignee = input<Assignee | undefined>();
  readonly size = input<'normal' | 'large' | 'xlarge'>('normal');
}
