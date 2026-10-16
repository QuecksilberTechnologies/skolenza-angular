import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TagModule } from '@openng/optimus-ui/tag';
import { catchError, map, of } from 'rxjs';

import { Common, LocationsApi, InstitutionLocationApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { State, InstitutionLocationRow } from '@shared/interfaces';
import { INSTITUTION_LOCATION_TYPES } from '@shared/utilities/common-data';

interface DetailItem {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

const text = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : `${value}`;

/** Only an explicit `false` reads "No" — a field the row did not carry is unknown, not off. */
const yesNo = (value: boolean | null | undefined): string =>
  value === true ? 'Yes' : value === false ? 'No' : '—';

/** Read-only location summary for the row detail sheet. */
@Component({
  selector: 'app-institution-location-detail',
  imports: [ButtonModule, SkeletonModule, TagModule],
  templateUrl: './institution-location-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionLocationDetail {
  readonly #institutionLocationApi = inject(InstitutionLocationApi);
  readonly #locationsApi = inject(LocationsApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);

  /** The list row: its `id` drives the fetch, and it stands in if the fetch fails. */
  readonly location = input<InstitutionLocationRow | undefined>();
  /** Host session only — the institution the list is filtered to. */
  readonly institutionId = input<string | null>(null);
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  /** Reads the record fresh through `get-by-id` rather than trusting the list row. */
  readonly #locationResource = rxResource({
    params: () => {
      const id = this.location()?.id;
      return id ? { id, institutionId: this.institutionId() } : undefined;
    },
    stream: ({ params }) =>
      this.#institutionLocationApi.getInstitutionLocation(params.id, params.institutionId).pipe(
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

  protected readonly isLoading = computed(() => this.#locationResource.isLoading());
  /** A failed read falls back to the list row, so the sheet still shows something. */
  protected readonly detail = computed(() => this.#locationResource.value() ?? this.location());

  protected readonly locationTypeLabel = computed(
    () =>
      INSTITUTION_LOCATION_TYPES.find((type) => type.id === this.detail()?.locationType)?.label ?? '—',
  );

  /**
   * The row comes back with `stateName: null` even when `stateId` is set, so the name is looked up
   * here. Fetched directly rather than through `LookupStore.loadStates`, which would swap out the
   * list page's State filter options under it.
   */
  readonly #statesResource = rxResource({
    params: () => {
      const location = this.detail();
      return !this.isLoading() && location?.countryId && location.stateId && !location.stateName
        ? { countryId: location.countryId }
        : undefined;
    },
    stream: ({ params }) =>
      this.#locationsApi
        .getStates({
          UserStaffMemberId: this.#lookupStore.globalOptionsStaffMemberId() || '0',
          CountryId: params.countryId,
          TodaysDate: new Date().toISOString(),
        })
        .pipe(
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError(() => of([] as State[])),
        ),
  });

  protected readonly stateName = computed(() => {
    const location = this.detail();
    return (
      location?.stateName ||
      this.#statesResource.value()?.find((state) => state.id === location?.stateId)?.stateName
    );
  });

  protected readonly sections = computed<DetailSection[]>(() => {
    const location = this.detail();
    if (!location) {
      return [];
    }

    return [
      {
        title: 'Identity',
        items: [
          { label: 'Location Code', value: text(location.locationCode) },
          { label: 'Location Name', value: text(location.locationName) },
          { label: 'Location Type', value: this.locationTypeLabel() },
          { label: 'Head Office', value: yesNo(location.isHeadOffice) },
        ],
      },
      {
        title: 'Address',
        items: [
          { label: 'Address', value: text(location.address) },
          { label: 'Landmark', value: text(location.landmark) },
          { label: 'Locality', value: text(location.localityName) },
          { label: 'District', value: text(location.districtName) },
          { label: 'State', value: text(this.stateName()) },
          { label: 'Country', value: text(location.countryName) },
          { label: 'Postal Code', value: text(location.postalCode) },
        ],
      },
      {
        title: 'Geo & Time Zone',
        items: [
          { label: 'Latitude', value: text(location.latitude) },
          { label: 'Longitude', value: text(location.longitude) },
          { label: 'Geo-fence Enabled', value: yesNo(location.isGeoFenceEnabled) },
          { label: 'Geo-fence Radius (m)', value: text(location.geoFenceRadiusMeters) },
          { label: 'Time Zone', value: text(location.timeZoneId) },
        ],
      },
      {
        title: 'Attendance',
        items: [
          { label: 'Attendance Allowed', value: yesNo(location.isAttendanceAllowed) },
          { label: 'Biometric Enabled', value: yesNo(location.isBiometricEnabled) },
        ],
      },
    ];
  });

  onCancel() {
    this.closePopup.emit();
  }

  onEdit() {
    this.edit.emit();
  }
}
