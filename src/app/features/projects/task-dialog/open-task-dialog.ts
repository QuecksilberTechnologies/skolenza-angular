import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { Assignee, ProjectTask } from '@shared/interfaces';

import TaskDialogComponent from './task-dialog.component';
import { TaskDialogMode } from './task-dialog.model';

export interface OpenTaskDialogOptions {
  mode: TaskDialogMode;
  task?: ProjectTask;
  assignees: Assignee[];
}

const HEADERS: Record<TaskDialogMode, string> = {
  create: 'New Task',
  edit: 'Edit Task',
  view: 'Task Details',
};

/** Single entry point so List and Board open the exact same dialog configuration. */
export function openTaskDialog(
  dialog: DialogService,
  opts: OpenTaskDialogOptions,
): DynamicDialogRef | null {
  return dialog.open(TaskDialogComponent, {
    header: HEADERS[opts.mode],
    style: { width: '90vw', maxWidth: '52rem' },
    modal: true,
    closable: true,
    focusOnShow: false,
    data: { mode: opts.mode, task: opts.task, assignees: opts.assignees },
  });
}
