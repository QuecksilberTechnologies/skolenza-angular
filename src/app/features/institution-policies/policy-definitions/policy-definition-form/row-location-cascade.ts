import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { LocationsApi } from '@core/services';
import { District, Locality, State } from '@shared/interfaces';

import { ApplicabilityRowModel } from './policy-definition-form.schema';

/** One applicability row's own location cascade. `LookupStore.states()` is a single signal keyed
 *  by one country, so it can't serve two rows targeting different countries. */
interface RowLocationOptions {
  states: State[];
  districts: District[];
  localities: Locality[];
}
export type LocationLevel = keyof RowLocationOptions;
interface RowLocationLookups {
  options: RowLocationOptions;
  loading: Record<LocationLevel, boolean>;
}

/** Top down, below the country: changing one level invalidates every level after it. */
const LOCATION_LEVEL_ORDER: LocationLevel[] = ['states', 'districts', 'localities'];

/** `parentKey` selects the level's options; `ownKey` is the level's own selection. */
export const LOCATION_LEVEL_KEYS: Record<
  LocationLevel,
  {
    parentKey: 'countryId' | 'stateId' | 'districtId';
    ownKey: 'stateId' | 'districtId' | 'localityId';
  }
> = {
  states: { parentKey: 'countryId', ownKey: 'stateId' },
  districts: { parentKey: 'stateId', ownKey: 'districtId' },
  localities: { parentKey: 'districtId', ownKey: 'localityId' },
};

const emptyRowLocations = (): RowLocationLookups => ({
  options: { states: [], districts: [], localities: [] },
  loading: { states: false, districts: false, localities: false },
});

/** The location lookups take the current moment as a UTC timestamp, not a date-only key. */
const nowIso = () => new Date().toISOString();

/** The form's side of the cascade: it owns the applicability rows, the cascade only reads them
 *  and asks for cleared ids to be written back. */
interface RowLocationCascadeHost {
  applicability: () => ApplicabilityRowModel[];
  patchApplicabilityRow: (index: number, patch: Partial<ApplicabilityRowModel>) => void;
  userStaffMemberId: () => Promise<string>;
}

/**
 * The country → state → district → locality options of every applicability row. `rows` is indexed
 * the same as `host.applicability()`. Must be called in an injection context (a field
 * initializer).
 */
export function injectRowLocationCascade(host: RowLocationCascadeHost) {
  const locationsApi = inject(LocationsApi);
  const destroyRef = inject(DestroyRef);
  const rows = signal<RowLocationLookups[]>([]);

  const fetchers: {
    [L in LocationLevel]: (
      UserStaffMemberId: string,
      parentId: number,
    ) => Observable<{ isSucceeded: boolean; data: RowLocationOptions[L] }>;
  } = {
    states: (UserStaffMemberId, CountryId) =>
      locationsApi.getStates({ UserStaffMemberId, CountryId, TodaysDate: nowIso() }),
    districts: (UserStaffMemberId, StateId) =>
      locationsApi.getDistricts({ UserStaffMemberId, StateId, TodaysDate: nowIso() }),
    localities: (UserStaffMemberId, DistrictId) =>
      locationsApi.getLocalities({ UserStaffMemberId, DistrictId, TodaysDate: nowIso() }),
  };

  const patchRow = (index: number, patch: (row: RowLocationLookups) => RowLocationLookups) =>
    rows.update((current) => current.map((row, i) => (i === index ? patch(row) : row)));

  async function loadLevel<L extends LocationLevel>(index: number, level: L, parentId: number) {
    const UserStaffMemberId = await host.userStaffMemberId();
    const { parentKey } = LOCATION_LEVEL_KEYS[level];
    // Rows reindex when one is removed, so a response can land on whichever row now sits at the
    // index it was fired for. Only write back while that row still asks for this parent.
    const isStillAwaited = () => host.applicability()[index]?.[parentKey] === parentId;
    const setLoading = (loading: boolean) =>
      patchRow(index, (row) => ({ ...row, loading: { ...row.loading, [level]: loading } }));

    setLoading(true);
    fetchers[level](UserStaffMemberId, parentId)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: (res) => {
          if (!isStillAwaited()) return;

          patchRow(index, (row) => ({
            options: { ...row.options, [level]: res.isSucceeded ? res.data : [] },
            loading: { ...row.loading, [level]: false },
          }));
        },
        error: () => {
          if (isStillAwaited()) setLoading(false);
        },
      });
  }

  return {
    rows: rows.asReadonly(),

    addRow: () => rows.update((current) => [...current, emptyRowLocations()]),

    removeRow: (index: number) => rows.update((current) => current.filter((_, i) => i !== index)),

    /** Fetches every level a saved row already has a parent for, e.g. after loading a version. */
    loadSavedRows(applicability: ApplicabilityRowModel[]) {
      rows.set(applicability.map(emptyRowLocations));
      applicability.forEach((row, index) => {
        for (const level of LOCATION_LEVEL_ORDER) {
          const parentId = row[LOCATION_LEVEL_KEYS[level].parentKey];
          if (parentId) void loadLevel(index, level, parentId);
        }
      });
    },

    /** Called when the select *above* `level` changes (country → `'states'`, and so on).
     *  `[formField]` already wrote the new parent id into the model by the time `onChange` fires;
     *  this only clears `level` and everything under it, then refetches `level` for this row. */
    onParentChange(index: number, level: LocationLevel, parentId: number | null) {
      const invalidated = LOCATION_LEVEL_ORDER.slice(LOCATION_LEVEL_ORDER.indexOf(level));
      const clearedIds = Object.fromEntries(
        invalidated.map((cleared) => [LOCATION_LEVEL_KEYS[cleared].ownKey, null]),
      );

      host.patchApplicabilityRow(index, clearedIds);
      patchRow(index, (row) => {
        const options = { ...row.options };
        for (const cleared of invalidated) options[cleared] = [];
        return { ...row, options };
      });

      if (parentId) void loadLevel(index, level, parentId);
    },
  };
}
