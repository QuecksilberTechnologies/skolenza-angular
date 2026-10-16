import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { TableEmptyMessage, TableLoader } from '@shared/index';

import PmsFeedbackForm from './pms-feedback-form/pms-feedback-form';
import { PmsFeedbackStore } from './pms-feedback.store';

type FeedbackTab = 'received' | 'given';

@Component({
  selector: 'app-pms-feedback',
  imports: [DatePipe, CardModule, ButtonModule, TableLoader, TableEmptyMessage],
  providers: [PmsFeedbackStore, DialogService],
  templateUrl: './pms-feedback.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsFeedback implements OnInit {
  readonly store = inject(PmsFeedbackStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  readonly activeTab = signal<FeedbackTab>('received');

  ngOnInit(): void {
    this.store.loadFeedback();
  }

  setTab(tab: FeedbackTab): void {
    this.activeTab.set(tab);
  }

  giveFeedback(): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(PmsFeedbackForm, {
      header: 'Give Feedback',
      style: { width: '90vw', maxWidth: '34rem' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { store: this.store, currentUserId: 'e-101', currentUserName: 'Aarav Sharma' },
    });
    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
