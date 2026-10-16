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
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { AuthApi } from '@core/services';
import {
  PMS_STATUS_OPTIONS,
  PmsStatus,
  Review,
  TableEmptyMessage,
  TableLoader,
} from '@shared/index';

import { canManageTeam } from '../pms-access';
import { PmsRatingStars } from '../ui/pms-rating-stars';
import { PmsStatusBadge } from '../ui/pms-status-badge';
import PmsReviewForm from './pms-review-form/pms-review-form';
import { PmsReviewsStore } from './pms-reviews.store';

@Component({
  selector: 'app-pms-reviews',
  imports: [
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
    TableLoader,
    TableEmptyMessage,
    PmsStatusBadge,
    PmsRatingStars,
    DatePipe,
  ],
  providers: [PmsReviewsStore, DialogService],
  templateUrl: './pms-reviews.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsReviews implements OnInit {
  readonly store = inject(PmsReviewsStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authApi = inject(AuthApi);

  /** HR/Admin & Manager edit the full review; StaffMembers edit self-review only. */
  readonly canManageReview = computed(() => canManageTeam(this.#authApi.authRoleType()));

  readonly statusOptions = PMS_STATUS_OPTIONS;
  readonly selectedStatus = signal<PmsStatus | null>(null);

  /** Per-status counts for the toolbar summary chips (whole list, ignores filter). */
  readonly statusCounts = computed(() => {
    const all = this.store.reviews();
    return {
      completed: all.filter((r) => r.status === 'Completed').length,
      inReview: all.filter((r) => r.status === 'InReview').length,
      pending: all.filter((r) => r.status === 'Pending').length,
    };
  });

  ngOnInit(): void {
    this.store.loadReviews();
  }

  onStatusChange(status: PmsStatus | null): void {
    this.selectedStatus.set(status);
    this.store.setStatusFilter(status);
  }

  /** Up to two leading letters of a name, for avatar fallback. */
  initials(name: string): string {
    return (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** Relative due-date hint + urgency tone. Pure date math, SSR-guarded. */
  dueMeta(review: Review): { label: string; tone: 'overdue' | 'soon' | 'normal' | 'done' } {
    if (review.status === 'Completed' || review.status === 'Cancelled') {
      return { label: '', tone: 'done' };
    }
    if (typeof window === 'undefined') return { label: '', tone: 'normal' };

    const due = new Date(review.dueDate);
    if (Number.isNaN(due.getTime())) return { label: '', tone: 'normal' };

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const MS_PER_DAY = 86_400_000;
    const days = Math.round(
      (startOfDay(due).getTime() - startOfDay(new Date()).getTime()) / MS_PER_DAY,
    );

    if (days < 0) return { label: 'Overdue', tone: 'overdue' };
    if (days === 0) return { label: 'Due today', tone: 'soon' };
    if (days <= 7) return { label: `in ${days} day${days === 1 ? '' : 's'}`, tone: 'soon' };
    return { label: '', tone: 'normal' };
  }

  openForm(review: Review): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(PmsReviewForm, {
      header: `Review — ${review.staffMemberName}`,
      style: { width: '92vw', maxWidth: '48rem' },
      contentStyle: { maxHeight: '80vh', overflow: 'auto' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { review, store: this.store, canManageReview: this.canManageReview() },
    });
    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
