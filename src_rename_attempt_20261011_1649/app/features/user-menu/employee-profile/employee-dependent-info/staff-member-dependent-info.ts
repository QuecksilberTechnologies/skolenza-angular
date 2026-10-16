import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffMemberDependentApi, ProfileAccessApi } from '@core/services';
import { ProfileBlockActions } from '@shared/components/profile/profile-block-actions/profile-block-actions';
import { ProfileDocumentBlock } from '@shared/components/profile/profile-document-block/profile-document-block';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileInfoCard } from '@shared/components/profile/profile-info-card/profile-info-card';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import { StatusBadge } from '@shared/components/status-badge/status-badge';
import {
  DeleteStaffMemberDependentReq,
  StaffMemberDependent,
  GetStaffMemberDependentReq,
  LoginInfo,
} from '@shared/interfaces';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import { StaffMemberDependentForm } from './staffMember-dependent-form/staffMember-dependent-form';

/** Display names for `RELATIONS_DEPENDANT` ids; that list's labels are worded for the form. */
const RELATION_LABELS: Record<number, string> = {
  1: 'Spouse',
  2: 'Parent',
  3: 'In-law',
  4: 'Child',
};

@Component({
  selector: 'app-staffMember-dependent-info',
  imports: [
    CardModule,
    FormsModule,
    ConfirmDialogModule,
    DatePipe,
    ProfileLoader,
    ProfileEmpty,
    ProfileInfoBlock,
    ProfileHeader,
    ProfileBlockActions,
    ProfileInfoCard,
    ProfileDocumentBlock,
    StatusBadge,
  ],
  templateUrl: './staffMember-dependent-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberDependentInfo implements OnInit {
  readonly #staffMemberDependentApi = inject(StaffMemberDependentApi);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #dialogService = inject(DialogService);
  readonly staffMemberDependents = computed(() => this.#staffMemberDependentApi.staffMemberDependents());
  readonly completionPercentage = computed(() => this.#staffMemberDependentApi.completionPercentage());
  readonly profileEmptyMessage = 'No dependent information available.';
  readonly profileEmptyDescription = "We couldn't find any dependent details to display.";
  readonly profileEmptyTabIcon = 'pi pi-users';
  // True from the start: ngOnInit awaits the session before the request goes out.
  readonly isLoading = signal(true);
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  protected tabInfoType = PROFILE_TABS.Dependent;
  protected readonly childRelationId = 4;
  protected loginInfo: LoginInfo | undefined;

  constructor() {
    this.#staffMemberDependentApi.setStaffMemberDependents([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.getStaffMemberDependents();
  }

  async getStaffMemberDependents() {
    const body: GetStaffMemberDependentReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
      PageNumber: 1,
      PageSize: 10,
      SortBy: 'id',
      SortOrder: 'asc',
    };

    this.isLoading.set(true);
    this.#staffMemberDependentApi.setStaffMemberDependents([]);

    this.#staffMemberDependentApi
      .getStaffMemberDependents(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#staffMemberDependentApi.setStaffMemberDependents(res.data ?? []);
            this.#staffMemberDependentApi.setCompletionPercentage(res.completionPercentage);
          } else {
            this.#staffMemberDependentApi.setStaffMemberDependents([]);
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async addDependent(staffMemberDependent?: StaffMemberDependent) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberDependentForm, {
      header: staffMemberDependent ? 'Edit Dependent Information' : 'Add Dependent Information',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMemberDependent },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (data) => {
      if (!data) {
        return;
      }
      await this.getStaffMemberDependents();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  async removeDependent(staffMemberDependent: StaffMemberDependent) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this dependent? This action cannot be undone.`,
      header: 'Delete Dependent',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Dependent',
      rejectLabel: 'Keep Dependent',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteDependentProcess(staffMemberDependent);
      },
    });
  }

  deleteDependentProcess(staffMemberDependent: StaffMemberDependent) {
    const body: DeleteStaffMemberDependentReq = { Id: staffMemberDependent.id };
    this.#staffMemberDependentApi
      .deleteStaffMemberDependent(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#staffMemberDependentApi.removeDependentSignal(staffMemberDependent.id);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  relationLabel(dependent: StaffMemberDependent): string {
    return RELATION_LABELS[dependent.relation] ?? dependent.relationType ?? '';
  }

  /** Whole years since `dateOfBirth`, e.g. "4 yrs"; "Under 1 yr" for infants. */
  ageLabel(dateOfBirth: string, today = new Date()): string {
    const dob = new Date(dateOfBirth);
    if (!dateOfBirth || isNaN(dob.getTime()) || dob > today) {
      return '';
    }

    let years = today.getFullYear() - dob.getFullYear();
    const hadBirthday =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    if (!hadBirthday) {
      years--;
    }

    if (years < 1) {
      return 'Under 1 yr';
    }
    return years === 1 ? '1 yr' : `${years} yrs`;
  }

  #getTargetStaffMemberId(): string {
    return (
      this.#route.snapshot.queryParamMap.get('staffMemberId') ?? this.loginInfo?.user?.staffMemberId ?? ''
    );
  }

  updateVerifyStatus(status: boolean, id: number) {
    this.getStaffMemberDependents();
    this.#staffMemberDependentApi.toggleVerifySignal(status, id);
  }

  updateEditStatus(status: boolean) {
    this.getStaffMemberDependents();
    this.#staffMemberDependentApi.toggleEditSignal(status);
  }
}
