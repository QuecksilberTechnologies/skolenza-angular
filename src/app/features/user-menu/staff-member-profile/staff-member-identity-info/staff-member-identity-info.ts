import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize, firstValueFrom } from 'rxjs';

import { Common, StaffMemberBasicAPI, StaffMemberIdentityApi, ProfileAccessApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { ProfileBlockActions } from '@shared/components/profile/profile-block-actions/profile-block-actions';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileListItem } from '@shared/components/profile/profile-list-item/profile-list-item';
import { ProfileList } from '@shared/components/profile/profile-list/profile-list';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import { StatusBadge, StatusTone } from '@shared/components/status-badge/status-badge';
import { StaffMemberSensitive, GetStaffMemberSensitiveReq, LoginInfo } from '@shared/interfaces';
import { PROFILE_TABS } from '@shared/utilities/common-data';
import { maskValue } from '@shared/utilities/mask-value';

import { StaffMemberIdentityForm } from './staff-member-identity-form/staff-member-identity-form';

export interface IdentityStatus {
  label: string;
  icon: string;
  tone: StatusTone;
}

@Component({
  selector: 'app-staff-member-identity-info',
  imports: [
    CardModule,
    ConfirmDialogModule,
    DatePipe,
    ProfileLoader,
    ProfileEmpty,
    ProfileHeader,
    ProfileInfoBlock,
    ProfileList,
    ProfileListItem,
    StatusBadge,
    ProfileBlockActions,
  ],
  templateUrl: './staff-member-identity-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberIdentityInfo implements OnInit {
  readonly #staffMemberIdentityApi = inject(StaffMemberIdentityApi);
  readonly #staffMemberBasicAPI = inject(StaffMemberBasicAPI);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly profileHeader = viewChild<ProfileHeader>('profileHeader');
  readonly staffMemberIdentities = computed(() => this.#staffMemberIdentityApi.staffMemberIdentities());
  readonly completionPercentage = computed(() => this.#staffMemberIdentityApi.completionPercentage());
  /**
   * The GET returns no tab-level verified flag (see
   * docs/backend-tickets/staffMember-identity-response-gaps.md), so the header keeps the last
   * toggle result here; a reload does not reset it.
   */
  readonly isInfoVerified = signal(false);
  /** Catalogue document ids whose identity number is revealed; every other number renders masked. */
  readonly revealedIdentityIds = signal<ReadonlySet<number>>(new Set());
  protected readonly maskValue = maskValue;
  /** Catalogue rows carry no edit flag, so read it from the first saved row. */
  readonly headerEditAllowed = computed(
    () => !!this.staffMemberIdentities().find((row) => row.staffMemberIdentityId)?.isEditAllowed,
  );
  /** Required documents first; API order is kept within each group. */
  readonly sortedIdentities = computed(() =>
    [...this.staffMemberIdentities()].sort((a, b) => Number(b.isMandatory) - Number(a.isMandatory)),
  );
  readonly profileEmptyMessage = 'No identity information found';
  readonly profileEmptyDescription = "We couldn't find any identity details to display.";
  readonly profileEmptyTabIcon = 'pi pi-id-card';
  // True from the start: ngOnInit awaits the session and country before the request goes out.
  readonly isLoading = signal(true);
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  protected tabInfoType = PROFILE_TABS.Identity;
  protected readonly moduleCode = 'STAFF_IDENTITY';
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Delete'),
  );
  protected loginInfo: LoginInfo | undefined;
  /** Resolved once per visit; every refresh below re-enters `getStaffMemberIdentities`. */
  #selfCountryId: number | null = null;

  constructor() {
    this.#staffMemberIdentityApi.setStaffMemberIdentities([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.getStaffMemberIdentities();
  }

  async getStaffMemberIdentities() {
    this.isLoading.set(true);
    const targetStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId')?.trim();
    const body: GetStaffMemberSensitiveReq = {
      ...(targetStaffMemberId ? { StaffMemberId: targetStaffMemberId } : {}),
      CountryNationalityId: await this.#resolveCountryId(),
    };

    this.#staffMemberIdentityApi.setStaffMemberIdentities([]);

    this.#staffMemberIdentityApi
      .getStaffMemberIdentities(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#staffMemberIdentityApi.setStaffMemberIdentities(res.data ?? []);
            this.#staffMemberIdentityApi.setCompletionPercentage(res.completionPercentage);
          } else {
            this.#staffMemberIdentityApi.setStaffMemberIdentities([]);
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  /**
   * The country decides which identity document types the API returns, so it must be a real
   * value. The staffMembers page passes it as a query param; on the self-service path
   * `/NewLogin/login` does not return countryId yet, so fall back to the staffMember's own basic
   * info rather than sending 0.
   */
  async #resolveCountryId(): Promise<number> {
    const queryCountryId = this.#route.snapshot.queryParamMap.get('countryId')?.trim();
    if (queryCountryId) {
      return +queryCountryId;
    }

    const sessionUser = this.loginInfo?.user;
    if (sessionUser?.countryId) {
      return sessionUser.countryId;
    }

    if (this.#selfCountryId !== null) {
      return this.#selfCountryId;
    }

    const staffMemberId = sessionUser?.staffMemberId;
    if (!staffMemberId) {
      return 0;
    }

    try {
      const res = await firstValueFrom(
        this.#staffMemberBasicAPI.getStaffMemberBasics({
          StaffMemberId: staffMemberId,
          UserStaffMemberId: staffMemberId,
        }),
      );
      this.#selfCountryId = res.data?.[0]?.countryId ?? 0;
    } catch {
      // The identity request below surfaces its own error; 0 keeps the API's default behaviour.
      this.#selfCountryId = 0;
    }

    return this.#selfCountryId;
  }

  addIdentity(staffMemberSensitive?: StaffMemberSensitive) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberIdentityForm, {
      header: staffMemberSensitive?.staffMemberIdentityId
        ? 'Edit Identity Information'
        : 'Add Identity Information',
      style: { width: '90vw', maxWidth: '56rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMemberSensitive },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((data) => {
      if (!data) {
        return;
      }
      this.getStaffMemberIdentities();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  identityStatus(identity: StaffMemberSensitive): IdentityStatus {
    if (identity.isVerified) return { label: 'Verified', icon: 'pi-check-circle', tone: 'success' };
    if (identity.hasIdentityUploaded) {
      return { label: 'Uploaded', icon: 'pi-check-circle', tone: 'success' };
    }
    if (identity.identityValue) {
      return { label: 'Document not uploaded', icon: 'pi-exclamation-circle', tone: 'warning' };
    }
    return {
      label: 'Not added',
      icon: 'pi-clock',
      tone: identity.isMandatory ? 'warning' : 'neutral',
    };
  }

  removeIdentity(staffMemberSensitive?: StaffMemberSensitive) {
    if (!this.canDelete()) return;

    const staffMemberIdentityId = staffMemberSensitive?.staffMemberIdentityId;
    if (!staffMemberIdentityId) {
      this.#commonService.showMessage('No saved identity exists to delete.', 'warn');
      return;
    }

    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this ${staffMemberSensitive.documentName}?`,
      header: 'Delete Identity',
      icon: 'pi pi-trash text-red-400! text-xl!',
      acceptLabel: 'Delete Identity',
      rejectLabel: 'Keep Identity',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#staffMemberIdentityApi
          .deleteStaffMemberIdentity({ staffMemberIdentityId })
          .pipe(takeUntilDestroyed(this.#destroyRef))
          .subscribe({
            next: (res) => {
              this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                this.getStaffMemberIdentities();
              }
            },
            error: (err) => this.#commonService.showMessage(err.message, 'error'),
          });
      },
    });
  }

  updateVerifyStatus(status: boolean) {
    this.isInfoVerified.set(status);
    this.getStaffMemberIdentities();
  }

  updateEditStatus(status: boolean) {
    this.getStaffMemberIdentities();
    this.#staffMemberIdentityApi.toggleEditSignal(status);
  }

  toggleIdentityValue(documentId: number) {
    this.revealedIdentityIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(documentId)) next.add(documentId);
      return next;
    });
  }
}

