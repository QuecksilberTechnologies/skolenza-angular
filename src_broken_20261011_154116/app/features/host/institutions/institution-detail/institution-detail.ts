import { formatDate, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TagModule } from '@openng/optimus-ui/tag';
import { catchError, map, of } from 'rxjs';

import { ApiError, InstitutionsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { StatusMessage } from '@shared/components/status-message/status-message';
import {
  IInstitution,
  InstitutionDetail as InstitutionAggregate,
  InstitutionDetailLocationRow,
  InstitutionStaffMemberRow,
  InstitutionLocationType,
  InstitutionLoginCredentialRow,
} from '@shared/interfaces';
import { GetInstitutionLocationTypePipe } from '@shared/pipes';

interface DetailItem {
  label: string;
  value: string;
  /** The value is the placeholder, so the template paints it as one rather than as content. */
  isEmpty: boolean;
  /** Spans both grid columns. For values half the panel width cannot hold. */
  fullWidth?: boolean;
}

/** A boolean rendered as an icon + label chip. Colour is never the only signal. */
interface FlagChip {
  label: string;
  on: boolean;
}

/** The sanctioned empty-value placeholder. */
const EMPTY = '—';

/** The panel is a summary, not a list page — long collections are cut off and counted instead. */
const LIST_LIMIT = 5;

const item = (
  label: string,
  value: string | number | null | undefined,
  fullWidth = false,
): DetailItem => {
  const isEmpty = value === null || value === undefined || value === '';
  return { label, value: isEmpty ? EMPTY : `${value}`, isEmpty, fullWidth };
};

/**
 * Read-only institution summary for the row detail sheet.
 *
 * The list row carries ten fields; `get-institution-by-id` answers with the whole aggregate, so this
 * panel fetches its own copy on open rather than rendering what the grid happens to hold. The
 * parent destroys and re-creates it per open, which is what re-fires the request.
 */
@Component({
  selector: 'app-institution-detail',
  imports: [
    ButtonModule,
    GetInstitutionLocationTypePipe,
    NgTemplateOutlet,
    SkeletonModule,
    StatusMessage,
    TagModule,
  ],
  templateUrl: './institution-detail.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionDetail {
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #locale = inject(LOCALE_ID);

  /** Required because the drawer only renders this component once a row is selected. */
  readonly institution = input.required<IInstitution>();
  /** Owned by the caller — this panel stays presentational and reads no permission store. */
  readonly canUpdate = input(false);
  readonly closePopup = output();
  readonly edit = output();

  readonly #detailResource = rxResource({
    params: () => this.institution().id,
    stream: ({ params: institutionId }) =>
      this.#institutionsApi.getInstitutionById(institutionId).pipe(
        map((res) => ({
          detail: res.isSucceeded ? res.data : null,
          // A rejected envelope is a failure here: the row exists, so "no data" is not an answer.
          hasLoadFailed: !res.isSucceeded || !res.data,
          // Kept so the panel can name the failure instead of guessing at it.
          errorMessage: res.isSucceeded && res.data ? '' : res.message,
        })),
        // `BaseService.handleError` rethrows, so an unguarded stream would blank the panel.
        catchError((err: ApiError) =>
          of({
            detail: null as InstitutionAggregate | null,
            hasLoadFailed: true,
            errorMessage: err.message,
          }),
        ),
      ),
  });

  /** The stream catches its own failures, so the resource only ever resolves. */
  readonly #result = computed(
    () =>
      this.#detailResource.value() ?? {
        detail: null as InstitutionAggregate | null,
        hasLoadFailed: false,
        errorMessage: '',
      },
  );

  protected readonly isLoading = computed(() => {
    const status = this.#detailResource.status();
    // `idle` is "the load effect has not flushed yet". Reading it as anything but loading would
    // paint the failure card for a frame, since a resolved-but-empty result is how failure reads.
    //
    // `reloading` is deliberately absent: it only happens via `onRetry`, which is only reachable
    // from the failure card. Counting it here would swap that card for skeletons and a second
    // failure would read as a flicker, so the retry spins its own button instead.
    return status === 'idle' || status === 'loading';
  });
  protected readonly isRetrying = computed(() => this.#detailResource.status() === 'reloading');
  protected readonly detail = computed(() => this.#result().detail);
  protected readonly hasLoadFailed = computed(() => this.#result().hasLoadFailed);
  /** The server's own words where it sent any; the generic line is the fallback, not the answer. */
  protected readonly loadErrorMessage = computed(
    () => this.#result().errorMessage || 'The institution record is temporarily unavailable',
  );

  /** A logo URL that 404s must not leave a broken image where the building mark belongs. */
  readonly #hasLogoFailed = signal(false);
  protected readonly logoUrl = computed(() =>
    this.#hasLogoFailed() ? null : (this.profile()?.logoUrl ?? null),
  );

  protected onLogoError() {
    this.#hasLogoFailed.set(true);
  }

  protected readonly country = computed(() => {
    const countryId = this.detail()?.countryId;
    return countryId ? this.#lookupStore.countries().find((c) => c.id === countryId) : undefined;
  });

  protected readonly companyItems = computed<DetailItem[]>(() => {
    const detail = this.detail();
    return [
      item('Institution code', detail?.institutionCode),
      item('Domain', detail?.companyEmailDomain),
      // The aggregate's own label. The profile carries a second, free-text industry — not repeated.
      item('Institution type', detail?.institutionTypeName),
    ];
  });

  protected readonly contactItems = computed<DetailItem[]>(() => {
    const detail = this.detail();
    return [
      item('Contact person', detail?.contactPersonName),
      item('Contact number', detail?.contactNumber),
    ];
  });

  /** Every child is an array even where only one row is meaningful, so these read `[0]`. */
  protected readonly profile = computed(() => this.detail()?.profiles?.[0] ?? null);
  protected readonly subscription = computed(() => this.detail()?.subscriptions?.[0] ?? null);
  protected readonly codePattern = computed(() => this.detail()?.staffMemberCodePatterns?.[0] ?? null);
  protected readonly emailConfig = computed(() => this.detail()?.emailConfigurations?.[0] ?? null);

  protected readonly locations = computed(() => this.detail()?.locations ?? []);
  protected readonly departments = computed(() => this.detail()?.departments ?? []);
  protected readonly staffMembers = computed(() => this.detail()?.staffMembers ?? []);
  protected readonly loginCredentials = computed(() => this.detail()?.loginCredentials ?? []);

  protected readonly visibleLocations = computed(() => this.locations().slice(0, LIST_LIMIT));
  protected readonly visibleDepartments = computed(() => this.departments().slice(0, LIST_LIMIT));
  protected readonly visibleStaffMembers = computed(() => this.staffMembers().slice(0, LIST_LIMIT));
  protected readonly visibleCredentials = computed(() =>
    this.loginCredentials().slice(0, LIST_LIMIT),
  );

  protected readonly hiddenLocationCount = computed(() =>
    Math.max(this.locations().length - LIST_LIMIT, 0),
  );
  protected readonly hiddenDepartmentCount = computed(() =>
    Math.max(this.departments().length - LIST_LIMIT, 0),
  );
  protected readonly hiddenStaffMemberCount = computed(() =>
    Math.max(this.staffMembers().length - LIST_LIMIT, 0),
  );
  protected readonly hiddenCredentialCount = computed(() =>
    Math.max(this.loginCredentials().length - LIST_LIMIT, 0),
  );

  protected readonly subscriptionItems = computed<DetailItem[]>(() => {
    const plan = this.subscription();
    return [
      item('Start date', this.#asDate(plan?.subscriptionStartDate)),
      item('End date', this.#asDate(plan?.subscriptionEndDate)),
      item('Payment mode', plan?.paymentMode),
      item('Payment txn id', plan?.paymentTxnId),
    ];
  });

  protected readonly profileItems = computed<DetailItem[]>(() => {
    const profile = this.profile();
    return [
      item('Address', profile?.address, true),
      item('Institution ownership', profile?.businessType),
      item('Total staffMembers', profile?.totalStaffMembers),
      item('Total branches', profile?.totalBranches),
      item('Founded year', profile?.foundedYear),
    ];
  });

  protected readonly codePatternItems = computed<DetailItem[]>(() => {
    const pattern = this.codePattern();
    return [
      item('Prefix', pattern?.prefix),
      item('Separator', pattern?.separator),
      item('Running number length', pattern?.runningNumberLength),
      item('Last used number', pattern?.lastUsedNumber),
    ];
  });

  protected readonly codePatternFlags = computed<FlagChip[]>(() => {
    const pattern = this.codePattern();
    return [
      { label: 'Year', on: !!pattern?.includeYear },
      { label: 'Month', on: !!pattern?.includeMonth },
      { label: 'Department', on: !!pattern?.includeDepartment },
    ];
  });

  protected readonly emailConfigItems = computed<DetailItem[]>(() => {
    const config = this.emailConfig();
    return [
      item('SMTP host', config?.smtpHost),
      item('SMTP port', config?.smtpPort),
      item('SMTP username', config?.smtpUsername, true),
      item('From email', config?.fromEmail, true),
      item('From name', config?.fromName),
    ];
  });

  /** Null rather than the placeholder, so the template renders the shared empty markup instead. */
  protected staffMemberName(staffMember: InstitutionStaffMemberRow): string | null {
    return (
      [staffMember.firstName, staffMember.middleName, staffMember.lastName].filter(Boolean).join(' ') || null
    );
  }

  /** Empty when the row carries neither, so the template drops the line rather than printing `—`. */
  protected staffMemberMeta(staffMember: InstitutionStaffMemberRow): string {
    return [staffMember.departmentName, staffMember.officialEmail].filter(Boolean).join(' · ');
  }

  /** Empty when the row carries no address at all, so the template drops the line entirely. */
  protected locationAddress(location: InstitutionDetailLocationRow): string {
    return [location.address, location.landmark, location.postalCode].filter(Boolean).join(', ');
  }

  /** The type label already reads "Head Office" for type 1; the tag would only repeat it. */
  protected showHeadOfficeTag(location: InstitutionDetailLocationRow): boolean {
    return location.isHeadOffice && location.locationType !== InstitutionLocationType.HeadOffice;
  }

  protected locationFlags(location: InstitutionDetailLocationRow): FlagChip[] {
    return [
      { label: 'Geofence', on: location.isGeoFenceEnabled },
      { label: 'Attendance', on: location.isAttendanceAllowed },
      { label: 'Biometric', on: location.isBiometricEnabled },
    ];
  }

  protected credentialFlags(credential: InstitutionLoginCredentialRow): FlagChip[] {
    return [
      { label: 'Onboarded', on: credential.isOnboard },
      { label: 'First login done', on: credential.hasFirstLogin },
      { label: 'Password change required', on: credential.isPasswordChangeRequired },
    ];
  }

  #asDate(value: string | null | undefined): string | null {
    return value ? formatDate(value, 'dd MMM yyyy', this.#locale) : null;
  }

  protected onCancel() {
    this.closePopup.emit();
  }

  protected onEdit() {
    this.edit.emit();
  }

  protected onRetry() {
    this.#detailResource.reload();
  }
}
