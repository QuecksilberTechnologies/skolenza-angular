import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { AuthApi } from '@core/services';
import {
  Goal,
  GOAL_CATEGORY_FALLBACK_CLASS,
  GOAL_CATEGORY_META,
  GoalCategory,
  PMS_STATUS_OPTIONS,
  PmsStatus,
  TableEmptyMessage,
  TableLoader,
} from '@shared/index';

import { canManageTeam } from '../pms-access';
import { PmsProgressBar } from '../ui/pms-progress-bar';
import { PmsStatusBadge } from '../ui/pms-status-badge';
import PmsGoalForm from './pms-goal-form/pms-goal-form';
import { PmsGoalsStore } from './pms-goals.store';

@Component({
  selector: 'app-pms-goals',
  imports: [
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    SelectModule,
    DialogModule,
    InputNumberModule,
    ConfirmDialogModule,
    TooltipModule,
    TableLoader,
    TableEmptyMessage,
    PmsStatusBadge,
    PmsProgressBar,
    DatePipe,
  ],
  providers: [PmsGoalsStore, DialogService, ConfirmationService],
  templateUrl: './pms-goals.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsGoals implements OnInit {
  readonly store = inject(PmsGoalsStore);
  readonly #dialogService = inject(DialogService);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authApi = inject(AuthApi);

  /** Only HR/Admin or Manager may delete goals. */
  readonly canDelete = computed(() => canManageTeam(this.#authApi.authRoleType()));

  readonly statusOptions = PMS_STATUS_OPTIONS;
  readonly selectedStatus = signal<PmsStatus | null>(null);

  /** Update-progress dialog state. */
  readonly progressDialogVisible = signal(false);
  readonly progressGoal = signal<Goal | null>(null);
  readonly progressValue = signal(0);

  /** View-goal (read-only) dialog state. */
  readonly viewDialogVisible = signal(false);
  readonly viewGoal = signal<Goal | null>(null);

  ngOnInit(): void {
    this.store.loadGoals();
  }

  /** Soft colour-pair class for a category chip. */
  categoryClass(category: GoalCategory): string {
    return GOAL_CATEGORY_META[category] ?? GOAL_CATEGORY_FALLBACK_CLASS;
  }

  /** Up-to-two-letter uppercased initials from an owner name. */
  initials(name: string): string {
    return (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase();
  }

  /** Due date is in the past for a goal that is still open. */
  isOverdue(goal: Goal): boolean {
    if (goal.status === 'Completed' || goal.status === 'Cancelled') return false;
    const due = new Date(goal.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  onStatusChange(status: PmsStatus | null): void {
    this.selectedStatus.set(status);
    this.store.setStatusFilter(status);
  }

  openForm(goal?: Goal): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(PmsGoalForm, {
      header: goal ? 'Update Goal' : 'Add Goal',
      style: { width: '90vw', maxWidth: '40rem' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { goal, store: this.store },
    });
    this.#destroyRef.onDestroy(() => ref?.close());
  }

  openView(goal: Goal): void {
    this.viewGoal.set(goal);
    this.viewDialogVisible.set(true);
  }

  openProgress(goal: Goal): void {
    this.progressGoal.set(goal);
    this.progressValue.set(goal.progress);
    this.progressDialogVisible.set(true);
  }

  saveProgress(): void {
    const goal = this.progressGoal();
    if (goal) this.store.updateProgress(goal.id, this.progressValue());
    this.progressDialogVisible.set(false);
  }

  confirmDelete(goal: Goal): void {
    this.#confirmationService.confirm({
      message: `This will permanently delete <strong>${goal.title}</strong>. This action cannot be undone.`,
      header: 'Delete this goal',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Goal',
      rejectLabel: 'Keep Goal',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteGoal(goal.id),
    });
  }
}
