import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { IUpcomingLeave } from '@shared/interfaces';

@Component({
  selector: 'app-upcoming-leaves',
  imports: [TableModule, TagModule, TableEmptyMessage, DatePipe],
  templateUrl: './upcoming-leaves.html',
  styleUrl: './upcoming-leaves.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingLeaves {
  readonly upcomingLeaves = input<IUpcomingLeave[]>([]);

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
