import { DatePipe, DecimalPipe } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffMemberExperienceAPI, ProfileAccessApi } from '@core/services';
import { ProfileBlockActions } from '@shared/components/profile/profile-block-actions/profile-block-actions';
import { ProfileDocumentList } from '@shared/components/profile/profile-document-list/profile-document-list';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileInfoCard } from '@shared/components/profile/profile-info-card/profile-info-card';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import { StatusBadge } from '@shared/components/status-badge/status-badge';
import {
  DeleteStaffMemberExperienceReq,
  GetStaffMemberExperienceReq,
  IStaffMemberExperienceInfo,
  LoginInfo,
} from '@shared/interfaces';
import { PROFILE_TABS } from '@shared/utilities/common-data';
import { maskValue } from '@shared/utilities/mask-value';

import { StaffMemberExperienceForm } from './staffMember-experience-form/staffMember-experience-form';

@Component({
  selector: 'app-staffMember-experience-info',
  imports: [
    CardModule,
    FormsModule,
    ConfirmDialogModule,
    DatePipe,
    DecimalPipe,
    ProfileLoader,
    ProfileEmpty,
    ProfileInfoBlock,
    ProfileHeader,
    ProfileBlockActions,
    ProfileInfoCard,
    ProfileDocumentList,
    StatusBadge,
  ],
  templateUrl: './staffMember-experience-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberExperienceInfo implements OnInit {
  readonly #staffMemberExperienceAPI = inject(StaffMemberExperienceAPI);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #dialogService = inject(DialogService);
  readonly #confirmationService = inject(ConfirmationService);
  readonly profileHeader = viewChild<ProfileHeader>('profileHeader');
  readonly completionPercentage = signal<number>(0);
  /** Experience ids whose CTC is revealed; every other CTC renders masked. */
  readonly revealedCtcIds = signal<ReadonlySet<number>>(new Set());
  protected readonly maskValue = maskValue;
  readonly profileEmptyMessage = 'No experience information available.';
  readonly profileEmptyDescription = "We couldn't find any experience details to display.";
  readonly profileEmptyTabIcon = 'pi pi-briefcase';
  // True from the start: ngOnInit awaits the session before the request goes out.
  readonly isLoading = signal(true);
  readonly staffMemberExperienceInfo = computed(() =>
    this.#staffMemberExperienceAPI.staffMemberExperienceInfo(),
  );
  /** Newest start date first. */
  readonly sortedExperiences = computed(() =>
    [...this.staffMemberExperienceInfo()].sort(
      (a, b) => Date.parse(b.startDate) - Date.parse(a.startDate),
    ),
  );
  /**
   * The API has no "currently working here" flag, so only the most recent record without an end
   * date counts as current. Any other missing end date is just missing data.
   */
  readonly currentExperienceId = computed(() => {
    const latest = this.sortedExperiences()[0];
    return latest && !latest.endDate ? latest.id : null;
  });
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  protected tabInfoType = PROFILE_TABS.Experience;
  protected loginInfo: LoginInfo | undefined;

  constructor() {
    this.#staffMemberExperienceAPI.setStaffMemberExperienceInfo([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.getStaffMemberExperience();
  }

  async getStaffMemberExperience() {
    const body: GetStaffMemberExperienceReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
    };

    this.isLoading.set(true);
    this.#staffMemberExperienceAPI.setStaffMemberExperienceInfo([]);

    this.#staffMemberExperienceAPI
      .getStaffMemberExperience(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#staffMemberExperienceAPI.setStaffMemberExperienceInfo(res.isSucceeded ? res.data : []);
          this.completionPercentage.set(res.isSucceeded ? res.completionPercentage : 0);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  async addExperience(staffMemberExperience?: IStaffMemberExperienceInfo) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberExperienceForm, {
      header: staffMemberExperience ? 'Edit Experience Information' : 'Add Experience Information',
      style: { width: '90vw', maxWidth: '54rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      draggable: true,
      data: { staffMemberExperience },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (data) => {
      if (!data) {
        return;
      }
      await this.getStaffMemberExperience();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  async removeExperience(staffMemberExperience?: IStaffMemberExperienceInfo) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this experience? This action cannot be undone.`,
      header: 'Delete Experience',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Experience',
      rejectLabel: 'Keep Experience',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteExperienceProcess(staffMemberExperience);
      },
    });
  }

  deleteExperienceProcess(experience?: IStaffMemberExperienceInfo) {
    if (!experience || !experience.id) {
      this.#commonService.showMessage('Invalid experience record.', 'error');
      return;
    }

    const body: DeleteStaffMemberExperienceReq = {
      Id: experience.id,
    };

    this.#staffMemberExperienceAPI
      .deleteStaffMemberExperience(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#staffMemberExperienceAPI.removeExperienceSignal(experience.id);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(
            err?.message ?? 'An error occurred during deletion.',
            'error',
          );
        },
      });
  }

  verificationLabel(experience: IStaffMemberExperienceInfo): string {
    const { isExperienceVerifiedByMail: byMail, isExperienceVerifiedByCall: byCall } = experience;
    if (byMail && byCall) return 'Experience verified by mail and call';
    if (byMail) return 'Experience verified by mail';
    if (byCall) return 'Experience verified by call';
    return experience.isExperienceVerified ? 'Experience verified' : 'Experience not verified';
  }

  /** "3 yrs 2 mos" between two dates; the end defaults to today. Empty when the dates are unusable. */
  durationLabel(startDate: string, endDate?: string): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      end.getMonth() -
      start.getMonth() -
      (end.getDate() < start.getDate() ? 1 : 0);
    if (Number.isNaN(months) || months < 0) return '';

    const years = Math.floor(months / 12);
    const rest = months % 12;
    const parts = [
      years ? `${years} ${years === 1 ? 'yr' : 'yrs'}` : '',
      rest ? `${rest} ${rest === 1 ? 'mo' : 'mos'}` : '',
    ].filter(Boolean);
    return parts.join(' ') || 'Less than a month';
  }

  joinParts(...parts: (string | null | undefined)[]): string {
    return parts.filter(Boolean).join(', ');
  }

  getUploadedDocuments(experience: IStaffMemberExperienceInfo) {
    return experience.documents?.filter((doc) => doc.hasExperienceDocUploaded) ?? [];
  }

  #getTargetStaffMemberId(): string {
    return (
      this.#route.snapshot.queryParamMap.get('staffMemberId') ?? this.loginInfo?.user?.staffMemberId ?? ''
    );
  }

  updateVerifyStatus(status: boolean, id: number) {
    this.getStaffMemberExperience();
    this.#staffMemberExperienceAPI.toggleVerifySignal(status, id);
  }

  updateEditStatus(status: boolean, id: number) {
    this.getStaffMemberExperience();
    this.#staffMemberExperienceAPI.toggleEditSignal(status, id);
  }

  toggleCtc(id: number) {
    this.revealedCtcIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }
}
