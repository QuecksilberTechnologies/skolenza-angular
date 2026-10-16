import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { StatusMessage } from '@shared/components/status-message/status-message';
import { InstitutionLocationRow, InstitutionLocationType } from '@shared/interfaces';
import { GetInstitutionLocationTypePipe } from '@shared/pipes';

import { CompanyProfileStore } from './company-profile.store';

/** A boolean rendered as an icon + label chip. Colour is never the only signal. */
interface FlagChip {
  label: string;
  on: boolean;
}

const MODULE_CODE = 'INSTITUTION_PROFILE';

/**
 * `INSTITUTION_PROFILE`. Read-only, and thin on purpose: the backend has no institution-scoped company read,
 * so this shows what a institution token may see. See {@link CompanyProfileStore}.
 */
@Component({
  selector: 'app-company-profile',
  imports: [
    ButtonModule,
    GetInstitutionLocationTypePipe,
    NgTemplateOutlet,
    SkeletonModule,
    StatusMessage,
    TagModule,
  ],
  providers: [CompanyProfileStore],
  templateUrl: './company-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CompanyProfile {
  protected readonly store = inject(CompanyProfileStore);

  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);

  constructor() {
    effect(() =>
      this.#commonService.setPageHeaderInfo({
        pageTitle: this.#featurePageStore.displayNameOf(MODULE_CODE) ?? 'Company Profile',
        pageDescription: 'Your company, its locations and departments',
        pageIcon: 'pi pi-building-columns',
        isBreadcrumbShow: false,
      }),
    );
    this.#commonService.resetBreadcrumbItems();
  }

  /** Empty when the row carries no address at all, so the template drops the line entirely. */
  protected locationAddress(location: InstitutionLocationRow): string {
    return [
      location.address,
      location.landmark,
      location.localityName,
      location.districtName,
      location.stateName,
      location.postalCode,
    ]
      .filter(Boolean)
      .join(', ');
  }

  /** The type label already reads "Head Office" for type 1; the tag would only repeat it. */
  protected showHeadOfficeTag(location: InstitutionLocationRow): boolean {
    return !!location.isHeadOffice && location.locationType !== InstitutionLocationType.HeadOffice;
  }

  /** Every field on the row is optional, and a flag the API did not send is unknown, not off. */
  protected locationFlags(location: InstitutionLocationRow): FlagChip[] {
    const flags: [string, boolean | undefined][] = [
      ['Geofence', location.isGeoFenceEnabled],
      ['Attendance', location.isAttendanceAllowed],
      ['Biometric', location.isBiometricEnabled],
    ];
    return flags.flatMap(([label, on]) => (typeof on === 'boolean' ? [{ label, on }] : []));
  }
}

