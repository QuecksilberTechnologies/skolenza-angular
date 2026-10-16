import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TagModule } from '@openng/optimus-ui/tag';

import { ProjectTask } from '@shared/interfaces';

import { isOverdue as navIsOverdue } from '../../projects-nav';
import { AssigneeAvatar, ProjectPriorityBadge, TagList } from '../../ui';

@Component({
  selector: 'app-kanban-task-card',
  imports: [
    DatePipe,
    ButtonModule,
    CardModule,
    TagModule,
    MenuModule,
    AssigneeAvatar,
    ProjectPriorityBadge,
    TagList,
  ],
  templateUrl: './kanban-task-card.component.html',
  styleUrl: './kanban-task-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class KanbanTaskCardComponent {
  readonly task = input.required<ProjectTask>();

  readonly open = output<ProjectTask>();
  readonly edit = output<ProjectTask>();
  readonly duplicate = output<ProjectTask>();
  readonly archive = output<ProjectTask>();
  readonly remove = output<ProjectTask>();

  readonly isOverdue = computed(() => navIsOverdue(this.task()));

  readonly hasProgress = computed(() => this.task().progress != null);

  readonly menuItems: MenuItem[] = [
    { label: 'Edit', icon: 'pi pi-pencil', command: () => this.edit.emit(this.task()) },
    { label: 'Duplicate', icon: 'pi pi-copy', command: () => this.duplicate.emit(this.task()) },
    { label: 'Archive', icon: 'pi pi-inbox', command: () => this.archive.emit(this.task()) },
    { separator: true },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'text-red-500',
      command: () => this.remove.emit(this.task()),
    },
  ];
}
