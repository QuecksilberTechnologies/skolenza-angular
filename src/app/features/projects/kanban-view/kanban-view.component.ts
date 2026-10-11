import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

import { ProjectTask, ProjectTaskStatus } from '@shared/interfaces';

import { ProjectBoardStore } from '../project-board.store';
import { KANBAN_COLUMNS, STATUS_META } from '../projects-nav';
import { openTaskDialog } from '../task-dialog/open-task-dialog';
import { ProjectFilterBar } from '../ui';
import KanbanEmptyStateComponent from './kanban-empty-state/kanban-empty-state.component';
import KanbanTaskCardComponent from './kanban-task-card/kanban-task-card.component';
import KanbanTaskShimmerComponent from './kanban-task-shimmer/kanban-task-shimmer.component';

@Component({
  selector: 'app-kanban-view',
  imports: [
    DragDropModule,
    ButtonModule,
    CardModule,
    SkeletonModule,
    ConfirmDialogModule,
    ProjectFilterBar,
    KanbanTaskCardComponent,
    KanbanTaskShimmerComponent,
    KanbanEmptyStateComponent,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './kanban-view.component.html',
  styleUrl: './kanban-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class KanbanViewComponent {
  readonly store = inject(ProjectBoardStore);
  readonly #dialog = inject(DialogService);
  readonly #confirm = inject(ConfirmationService);

  protected readonly statusMeta = STATUS_META;
  readonly dropListIds = KANBAN_COLUMNS.map((s) => `lane-${s}`);
  readonly skeletonLanes = [0, 1, 2, 3];
  readonly skeletonCards = [0, 1, 2];

  laneId(status: ProjectTaskStatus): string {
    return `lane-${status}`;
  }

  onDrop(event: CdkDragDrop<ProjectTask[]>, targetStatus: ProjectTaskStatus): void {
    if (event.previousContainer === event.container) return;
    const task = event.item.data as ProjectTask;
    if (task.status !== targetStatus) this.store.changeStatus(task, targetStatus);
  }

  openCreate(): void {
    this.#open('create');
  }

  openView(task: ProjectTask): void {
    this.#open('view', task);
  }

  openEdit(task: ProjectTask): void {
    this.#open('edit', task);
  }

  duplicate(task: ProjectTask): void {
    this.store.duplicateTask(task);
  }

  archive(task: ProjectTask): void {
    this.store.archiveTask(task);
  }

  confirmDelete(task: ProjectTask): void {
    this.#confirm.confirm({
      header: 'Delete task',
      message: `Delete "${task.title}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.deleteTask(task),
    });
  }

  #open(mode: 'create' | 'edit' | 'view', task?: ProjectTask): void {
    const ref = openTaskDialog(this.#dialog, {
      mode,
      task,
      assignees: this.store.assignees(),
    });
    ref?.onClose.subscribe((result: ProjectTask | undefined) => {
      if (result) this.store.saveTask(result);
    });
  }
}
