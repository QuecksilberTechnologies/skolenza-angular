import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, forkJoin, map, of, tap } from 'rxjs';

import { HostApi, LocationsApi, SubscriptionsApi, InstitutionsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { Country, HostRole, HostUser, IInstitution, SubscriptionPlan } from '@shared/interfaces';

/** Country rows and top-N grouping for the "Institutions by country" widget. */
const TOP_COUNTRIES = 6;

/** Months plotted on the host signup trend. */
const TREND_MONTHS = 6;

/** Rows shown by the recent-institution and recent-activity widgets. */
const RECENT_INSTITUTIONS = 5;
const RECENT_ACTIVITY = 6;

export interface HostBarItem {
  key: string;
  label: string;
  value: number;
  /** Bar width, 0-100. Denominator differs per widget — see the computeds below. */
  percent: number;
  /** Share of the widget total, rendered next to the count. */
  share: number;
  /** ISO-2 country code; renders a flag when the lookup resolved. */
  code?: string;
}

export interface HostBarGroup {
  heading?: string;
  /** Largest possible value in the group — the `aria-valuemax` of every bar. */
  max: number;
  items: HostBarItem[];
}

export interface PlanCatalogRow {
  id: number;
  name: string;
  isFree: boolean;
  isMostPopular: boolean;
  isCustom: boolean;
  maxUsers: number;
  moduleCount: number;
  monthlyPrice: number;
  yearlyPrice: number;
  currencyKey: string;
}

export interface HostActivityRow {
  key: string;
  entity: 'User' | 'Role';
  action: 'Added' | 'Updated';
  name: string;
  detail: string;
  at: number;
}

interface DashboardHostState {
  institutions: IInstitution[];
  plans: SubscriptionPlan[];
  hostUsers: HostUser[];
  hostRoles: HostRole[];
  countries: Country[];
  /** Names of the sources that failed this load — drives the retry banner. */
  failedSources: string[];
}

const initialState: DashboardHostState = {
  institutions: [],
  plans: [],
  hostUsers: [],
  hostRoles: [],
  countries: [],
  failedSources: [],
};

type ListResponse<T> = { isSucceeded: boolean; data: T[] } | null;

const rows = <T>(response: ListResponse<T>): T[] =>
  response?.isSucceeded ? (response.data ?? []) : [];

const share = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);

export const DashboardHostStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionsApi = inject(InstitutionsApi);
    const subscriptionsApi = inject(SubscriptionsApi);
    const hostApi = inject(HostApi);
    const locationsApi = inject(LocationsApi);
    const lookupStore = inject(LookupStore);

    const dashboardResource = rxResource({
      stream: () =>
        forkJoin({
          // Each stream catches on its own — `BaseService.handleError` rethrows, so an
          // unguarded forkJoin would lose every widget when a single endpoint fails.
          institutions: institutionsApi.getInstitutions().pipe(catchError(() => of(null))),
          plans: subscriptionsApi
            .getAllSubscriptionPlan({ IsActive: true })
            .pipe(catchError(() => of(null))),
          hostUsers: hostApi
            // The KPI cards and the by-role chart aggregate the whole set, so one oversized
            // page stands in for the unpaged endpoint this used to call.
            .getHostUsers({ isActive: null, pageNumber: 1, pageSize: 1000 })
            .pipe(catchError(() => of(null))),
          hostRoles: hostApi.getHostRoles().pipe(catchError(() => of(null))),
          // Optional enrichment. Lookups are institution-scoped, so a host login is expected to
          // fail here — the country widget then falls back to `Country #{id}` labels.
          countries: locationsApi
            .getCountries({ UserStaffMemberId: '0', TodaysDate: new Date().toISOString() })
            .pipe(catchError(() => of(null))),
        }).pipe(
          tap((response) => {
            patchState(store, {
              institutions: rows(response.institutions),
              plans: rows(response.plans),
              hostUsers: rows(response.hostUsers),
              hostRoles: rows(response.hostRoles),
              // A institution-side session already has the shared lookups loaded.
              countries: lookupStore.countries().length
                ? lookupStore.countries()
                : rows(response.countries),
              failedSources: [
                !response.institutions?.isSucceeded && 'Institutions',
                !response.plans?.isSucceeded && 'Subscription plans',
                !response.hostUsers?.isSucceeded && 'Host users',
                !response.hostRoles?.isSucceeded && 'Host roles',
              ].filter((source): source is string => !!source),
            });
          }),
          map(() => true),
        ),
    });

    return { dashboardResource };
  }),
  withComputed(
    ({ institutions, plans, hostUsers, hostRoles, countries, failedSources, dashboardResource }) => ({
      isLoading: computed(() => dashboardResource.isLoading()),
      hasLoadErrors: computed(() => failedSources().length > 0),

      kpis: computed(() => {
        const allInstitutions = institutions();
        return {
          totalInstitutions: allInstitutions.length,
          verifiedInstitutions: allInstitutions.filter((institution) => institution.isVerified).length,
          inactiveInstitutions: allInstitutions.filter((institution) => !institution.isActive).length,
          // The catalog is fetched with `isActive: true`, and the rows carry no status flag.
          activePlans: plans().length,
        };
      }),

      /** Verification and activation are independent flags, so they render as two groups. */
      institutionStatusGroups: computed<HostBarGroup[]>(() => {
        const allInstitutions = institutions();
        const total = allInstitutions.length;
        if (!total) return [];

        const verified = allInstitutions.filter((institution) => institution.isVerified).length;
        const active = allInstitutions.filter((institution) => institution.isActive).length;
        const bar = (key: string, label: string, value: number): HostBarItem => ({
          key,
          label,
          value,
          percent: share(value, total),
          share: share(value, total),
        });

        return [
          {
            heading: 'Verification',
            max: total,
            items: [
              bar('verified', 'Verified', verified),
              bar('unverified', 'Unverified', total - verified),
            ],
          },
          {
            heading: 'Activation',
            max: total,
            items: [bar('active', 'Active', active), bar('inactive', 'Inactive', total - active)],
          },
        ];
      }),

      institutionsByCountry: computed<HostBarGroup[]>(() => {
        const allInstitutions = institutions();
        const total = allInstitutions.length;
        if (!total) return [];

        const counts = new Map<number, number>();
        for (const institution of allInstitutions) {
          counts.set(institution.countryId, (counts.get(institution.countryId) ?? 0) + 1);
        }

        const lookup = new Map(countries().map((country) => [country.id, country]));
        const ranked = [...counts]
          .map(([countryId, value]) => {
            const country = lookup.get(countryId);
            return {
              key: String(countryId),
              label: country?.countryName ?? `Country #${countryId}`,
              code: country?.countryCode?.toLowerCase(),
              value,
            };
          })
          .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

        const head = ranked.slice(0, TOP_COUNTRIES);
        const restValue = ranked
          .slice(TOP_COUNTRIES)
          .reduce((sum, country) => sum + country.value, 0);
        const items = restValue
          ? [...head, { key: 'other', label: 'Other', code: undefined, value: restValue }]
          : head;

        // Bars scale against the largest country so small counts stay readable;
        // `share` still reports the honest percentage of all institutions.
        const max = Math.max(...items.map((item) => item.value), 1);
        return [
          {
            max,
            items: items.map((item) => ({
              ...item,
              percent: Math.round((item.value / max) * 100),
              share: share(item.value, total),
            })),
          },
        ];
      }),

      /** The institution API exposes no created date and its ids are opaque tokens, so the closest
       *  proxy left is the order the list arrives in — newest last. */
      recentInstitutions: computed(() => [...institutions()].reverse().slice(0, RECENT_INSTITUTIONS)),

      planLadder: computed(() => {
        const sorted = [...plans()].sort((a, b) => (a.monthlyPrice ?? 0) - (b.monthlyPrice ?? 0));
        return {
          labels: sorted.map((plan) => plan.planName),
          monthly: sorted.map((plan) => plan.monthlyPrice ?? 0),
          yearly: sorted.map((plan) => plan.yearlyPrice ?? 0),
          currency: sorted[0]?.currencyKey ?? '',
          /** One shared axis only makes sense when every plan bills in one currency. */
          mixedCurrency: new Set(sorted.map((plan) => plan.currencyKey)).size > 1,
        };
      }),

      planCatalog: computed(() => {
        const allPlans = plans();
        return {
          freeCount: allPlans.filter((plan) => plan.isFree).length,
          paidCount: allPlans.filter((plan) => !plan.isFree).length,
          rows: [...allPlans]
            .sort((a, b) => (a.monthlyPrice ?? 0) - (b.monthlyPrice ?? 0))
            .map<PlanCatalogRow>((plan) => ({
              id: plan.id,
              name: plan.planName,
              isFree: plan.isFree,
              isMostPopular: plan.isMostPopular ?? false,
              isCustom: plan.isCustom ?? false,
              maxUsers: plan.maxUsers,
              moduleCount: plan.modules?.length ?? 0,
              monthlyPrice: plan.monthlyPrice ?? 0,
              yearlyPrice: plan.yearlyPrice ?? 0,
              currencyKey: plan.currencyKey,
            })),
        };
      }),

      /** Seeded from the role list so roles with no users still appear on the chart. */
      hostUsersByRole: computed(() => {
        const counts = new Map<number, { label: string; value: number }>(
          hostRoles().map((role) => [role.id, { label: role.name, value: 0 }]),
        );

        for (const user of hostUsers()) {
          const bucket = counts.get(user.hostRoleId);
          if (bucket) {
            bucket.value++;
          } else {
            counts.set(user.hostRoleId, {
              label: user.hostRoleName || `Role #${user.hostRoleId}`,
              value: 1,
            });
          }
        }

        const ranked = [...counts.values()].sort(
          (a, b) => b.value - a.value || a.label.localeCompare(b.label),
        );
        return {
          labels: ranked.map((role) => role.label),
          values: ranked.map((role) => role.value),
        };
      }),

      hostSignupTrend: computed(() => {
        const now = new Date();
        const months = Array.from({ length: TREND_MONTHS }, (_, index) => {
          const date = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - index), 1);
          return { key: `${date.getFullYear()}-${date.getMonth()}`, date };
        });

        const spansYears = months[0].date.getFullYear() !== months.at(-1)!.date.getFullYear();
        const format: Intl.DateTimeFormatOptions = spansYears
          ? { month: 'short', year: '2-digit' }
          : { month: 'short' };

        const counts = new Map(months.map((month) => [month.key, 0]));
        for (const user of hostUsers()) {
          const added = new Date(user.addedDateTime);
          if (Number.isNaN(added.getTime())) continue;
          const key = `${added.getFullYear()}-${added.getMonth()}`;
          if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
        }

        return {
          labels: months.map((month) => month.date.toLocaleDateString('en-US', format)),
          values: months.map((month) => counts.get(month.key)!),
        };
      }),

      recentHostActivity: computed<HostActivityRow[]>(() => {
        const activity: HostActivityRow[] = [];

        const push = (
          key: string,
          entity: HostActivityRow['entity'],
          action: HostActivityRow['action'],
          name: string,
          detail: string,
          raw: string | null,
        ) => {
          if (!raw) return;
          const at = new Date(raw).getTime();
          if (Number.isNaN(at)) return;
          activity.push({ key, entity, action, name, detail, at });
        };

        for (const user of hostUsers()) {
          push(`u${user.id}a`, 'User', 'Added', user.name, user.hostRoleName, user.addedDateTime);
          push(
            `u${user.id}u`,
            'User',
            'Updated',
            user.name,
            user.hostRoleName,
            user.updatedDateTime,
          );
        }

        for (const role of hostRoles()) {
          push(`r${role.id}a`, 'Role', 'Added', role.name, role.description, role.addedDateTime);
          push(
            `r${role.id}u`,
            'Role',
            'Updated',
            role.name,
            role.description,
            role.updatedDateTime,
          );
        }

        return activity.sort((a, b) => b.at - a.at).slice(0, RECENT_ACTIVITY);
      }),
    }),
  ),
  withMethods((store) => ({
    reload(): void {
      store.dashboardResource.reload();
    },
  })),
);
