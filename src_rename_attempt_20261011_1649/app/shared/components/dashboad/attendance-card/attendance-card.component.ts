import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Check, Fingerprint, LucideAngularModule, X } from 'lucide-angular';

import { CheckInStore } from '@core/stores';

import { DashboardCard } from '../dashboard-card/dashboard-card';

@Component({
  selector: 'app-attendance-card',
  imports: [DashboardCard, LucideAngularModule],
  templateUrl: './attendance-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceCardComponent {
  title = input<string>();
  readonly Fingerprint = Fingerprint;
  readonly Check = Check;
  readonly X = X;

  readonly #checkInStore = inject(CheckInStore);

  readonly isClockedIn = this.#checkInStore.isClockedIn;
  readonly isLoading = this.#checkInStore.isLoading;
  readonly hasLoadFailed = this.#checkInStore.hasLoadFailed;
  readonly punchCount = this.#checkInStore.punchCount;
  readonly workDateLabel = this.#checkInStore.workDateLabel;
  readonly hasCheckedInToday = this.#checkInStore.hasCheckedInToday;

  readonly checkInTime = computed(() => this.#checkInStore.clockInTime() ?? '--:--');
  readonly checkOutTime = computed(() => this.#checkInStore.clockOutTime() ?? '--:--');
}
