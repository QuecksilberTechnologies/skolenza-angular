import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { ProjectScheduleItem } from '@shared/interfaces';

import { SCHEDULE_TYPE_META } from '../../projects-nav';

interface DetailsData {
  item: ProjectScheduleItem;
  linkedTaskTitle?: string;
}

@Component({
  selector: 'app-schedule-item-details-dialog',
  imports: [ButtonModule, DatePipe],
  templateUrl: './schedule-item-details-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ScheduleItemDetailsDialogComponent {
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject<DynamicDialogConfig<DetailsData>>(DynamicDialogConfig);

  readonly item: ProjectScheduleItem = this.#config.data!.item;
  readonly linkedTaskTitle = this.#config.data?.linkedTaskTitle;
  readonly typeMeta = SCHEDULE_TYPE_META[this.item.type];

  onEdit(): void {
    this.#ref.close({ action: 'edit', item: this.item });
  }

  onDelete(): void {
    this.#ref.close({ action: 'delete', item: this.item });
  }

  onClose(): void {
    this.#ref.close();
  }
}
