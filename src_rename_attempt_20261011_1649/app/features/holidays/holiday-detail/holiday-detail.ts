import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TagModule } from '@openng/optimus-ui/tag';
import { catchError, map, of } from 'rxjs';

import { Common, HolidayCalandarApi } from '@core/services';
import { Holiday } from '@shared/interfaces';

import { PrimeIconPipe } from '../prime-icon-pipe';

/** Read-only holiday summary for the row detail sheet. */
@Component({
  selector: 'app-holiday-detail',
  imports: [ButtonModule, DatePipe, PrimeIconPipe, SkeletonModule, TagModule],
  templateUrl: './holiday-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayDetail {
  readonly #holidayCalandarApi = inject(HolidayCalandarApi);
  readonly #commonService = inject(Common);

  readonly holiday = input<Holiday | null>(null);
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output<Holiday>();

  /** Reads the record fresh through `GET /{id}` rather than trusting the list row. */
  readonly #holidayResource = rxResource({
    params: () => {
      const id = this.holiday()?.id;
      return id ? { id } : undefined;
    },
    stream: ({ params }) =>
      this.#holidayCalandarApi.getHoliday(params.id).pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
          return res.isSucceeded ? res.data : null;
        }),
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of(null);
        }),
      ),
  });

  protected readonly isLoading = computed(() => this.#holidayResource.isLoading());
  /** A failed read falls back to the list row, so the sheet still shows something. `GET /{id}`
   *  returns no `locationName`, so it borrows the one the store resolved onto the row. */
  protected readonly detail = computed(() => {
    const fresh = this.#holidayResource.value();
    const row = this.holiday();
    if (!fresh) {
      return row;
    }
    const rowName = row?.campusId === fresh.campusId ? row.locationName : null;
    return { ...fresh, locationName: fresh.locationName ?? rowName ?? null };
  });

  onCancel() {
    this.closePopup.emit();
  }

  onEdit(holiday: Holiday) {
    this.edit.emit(holiday);
  }
}
