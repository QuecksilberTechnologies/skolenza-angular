import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { AuthApi } from '@core/services';
import { OneOnOne, TableEmptyMessage, TableLoader } from '@shared/index';

import { canManageTeam } from '../pms-access';
import { PmsStatusBadge } from '../ui/pms-status-badge';
import PmsMeetingForm from './pms-meeting-form/pms-meeting-form';
import { PmsOneOnOneStore } from './pms-one-on-one.store';

@Component({
  selector: 'app-pms-one-on-one',
  imports: [DatePipe, CardModule, ButtonModule, TableLoader, TableEmptyMessage, PmsStatusBadge],
  providers: [PmsOneOnOneStore, DialogService],
  templateUrl: './pms-one-on-one.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsOneOnOne implements OnInit {
  readonly store = inject(PmsOneOnOneStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authApi = inject(AuthApi);

  /** Only HR/Admin or Manager may create/edit meetings. */
  readonly canManage = computed(() => canManageTeam(this.#authApi.authRoleType()));

  ngOnInit(): void {
    this.store.loadMeetings();
  }

  select(id: string): void {
    this.store.select(id);
  }

  toggleAction(meetingId: string, itemId: string): void {
    this.store.toggleActionItem(meetingId, itemId);
  }

  openForm(meeting?: OneOnOne): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(PmsMeetingForm, {
      header: meeting ? 'Update Meeting' : 'Add Meeting',
      style: { width: '90vw', maxWidth: '38rem' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { meeting, store: this.store },
    });
    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
