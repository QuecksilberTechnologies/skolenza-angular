import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { ILeave } from '@shared/interfaces';

@Component({
  selector: 'app-leave-history',
  imports: [TableModule, TagModule, TableEmptyMessage, DatePipe],
  templateUrl: './leave-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveHistory {
  readonly leaveHistory = input<ILeave[]>([]);

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Pending':
        return 'warn';
      case 'Rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
