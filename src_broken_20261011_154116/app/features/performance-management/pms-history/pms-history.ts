import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from '@openng/optimus-ui/card';
import { SelectModule } from '@openng/optimus-ui/select';

import { AuthApi } from '@core/services';
import { HistoryEventType, TableEmptyMessage, TableLoader } from '@shared/index';

import { isHrAdmin } from '../pms-access';
import { PmsTimeline } from '../ui/pms-timeline';
import { PmsHistoryStore } from './pms-history.store';

@Component({
  selector: 'app-pms-history',
  imports: [FormsModule, CardModule, SelectModule, TableLoader, TableEmptyMessage, PmsTimeline],
  providers: [PmsHistoryStore],
  templateUrl: './pms-history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsHistory implements OnInit {
  readonly store = inject(PmsHistoryStore);
  readonly #authApi = inject(AuthApi);

  /** Mock current staffMember id; HR/Admin sees everyone. */
  readonly #currentStaffMemberId = 'e-101';
  readonly isHr = computed(() => isHrAdmin(this.#authApi.authRoleType()));

  readonly selectedStaffMember = signal<string | null>(null);
  readonly selectedType = signal<HistoryEventType | null>(null);

  readonly typeOptions: HistoryEventType[] = [
    'Review',
    'Promotion',
    'Achievement',
    'Award',
    'Feedback',
  ];

  ngOnInit(): void {
    this.store.loadHistory();
    // Non-HR users default to their own history (still switchable in this mock).
    if (!this.isHr()) {
      this.selectedStaffMember.set(this.#currentStaffMemberId);
      this.store.setStaffMemberFilter(this.#currentStaffMemberId);
    }
  }

  onStaffMemberChange(id: string | null): void {
    this.selectedStaffMember.set(id);
    this.store.setStaffMemberFilter(id);
  }

  onTypeChange(type: HistoryEventType | null): void {
    this.selectedType.set(type);
    this.store.setTypeFilter(type);
  }
}
