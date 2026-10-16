import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { ProjectTask, ProjectTaskStatus } from '@shared/interfaces';
import { GetPriorityTagPipe, GetStatusTagPipe } from '@shared/pipes';

import { ProjectBoardStore } from '../project-board.store';
import { isOverdue as navIsOverdue, STATUS_OPTIONS } from '../projects-nav';
import { openTaskDialog } from '../task-dialog/open-task-dialog';
import { ProjectFilterBar } from '../ui';

@Component({
  selector: 'app-list-view',
  imports: [
    UserAvatar,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    MenuModule,
    SelectModule,
    TooltipModule,
    ConfirmDialogModule,
    TableInlineFilters,
    TableEmptyMessage,
    TableActionButton,
    ProjectFilterBar,
    GetStatusTagPipe,
    GetPriorityTagPipe,
    DatePipe,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './list-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ListViewComponent {
  readonly store = inject(ProjectBoardStore);
  readonly #dialog = inject(DialogService);
  readonly #confirm = inject(ConfirmationService);

  readonly selectedTask = signal<ProjectTask | null>(null);
  readonly selectedRows = signal<ProjectTask[]>([]);
  readonly bulkStatusOptions = STATUS_OPTIONS;

  readonly menuItems: MenuItem[] = [
    { label: 'View Details', icon: 'pi pi-eye', command: () => this.openDialog('view') },
    { label: 'Edit', icon: 'pi pi-pencil', command: () => this.openDialog('edit') },
    { label: 'Duplicate', icon: 'pi pi-copy', command: () => this.duplicate() },
    { label: 'Archive', icon: 'pi pi-inbox', command: () => this.archive() },
    { separator: true },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'text-red-500',
      command: () => this.confirmDelete(),
    },
  ];

  isOverdue(task: ProjectTask): boolean {
    return navIsOverdue(task);
  }

  onSearch(term: string): void {
    this.store.setSearchTerm(term);
  }

  openDialog(mode: 'create' | 'edit' | 'view'): void {
    const task = mode === 'create' ? undefined : (this.selectedTask() ?? undefined);
    const ref = openTaskDialog(this.#dialog, {
      mode,
      task,
      assignees: this.store.assignees(),
    });
    ref?.onClose.subscribe((result: ProjectTask | undefined) => {
      if (result) this.store.saveTask(result);
    });
  }

  duplicate(): void {
    const task = this.selectedTask();
    if (task) this.store.duplicateTask(task);
  }

  archive(): void {
    const task = this.selectedTask();
    if (task) this.store.archiveTask(task);
  }

  confirmDelete(): void {
    const task = this.selectedTask();
    if (!task) return;
    this.#confirm.confirm({
      header: 'Delete task',
      message: `Delete "${task.title}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.deleteTask(task),
    });
  }

  bulkDelete(): void {
    const ids = this.selectedRows().map((t) => t.id);
    if (!ids.length) return;
    this.#confirm.confirm({
      header: 'Delete tasks',
      message: `Delete ${ids.length} selected task(s)? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.store.bulkDelete(ids);
        this.selectedRows.set([]);
      },
    });
  }

  bulkStatus(status: ProjectTaskStatus): void {
    const ids = this.selectedRows().map((t) => t.id);
    if (!ids.length) return;
    this.store.bulkChangeStatus(ids, status);
    this.selectedRows.set([]);
  }
}
