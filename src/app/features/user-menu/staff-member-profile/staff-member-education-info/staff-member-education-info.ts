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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffMemberEducationAPI, ProfileAccessApi } from '@core/services';
import { ProfileBlockActions } from '@shared/components/profile/profile-block-actions/profile-block-actions';
import { ProfileDocumentBlock } from '@shared/components/profile/profile-document-block/profile-document-block';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileInfoCard } from '@shared/components/profile/profile-info-card/profile-info-card';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import {
  DeleteStaffMemberEducationReq,
  GetStaffMemberEducationReq,
  IStaffMemberEducationInfo,
  LoginInfo,
} from '@shared/interfaces';
import { GetScoreTypePipe } from '@shared/pipes';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import { StaffMemberEducationForm } from './staff-member-education-form/staff-member-education-form';

@Component({
  selector: 'app-staff-member-education-info',
  imports: [
    CardModule,
    FormsModule,
    ConfirmDialogModule,
    DatePipe,
    GetScoreTypePipe,
    ProfileLoader,
    ProfileEmpty,
    ProfileInfoBlock,
    ProfileDocumentBlock,
    ProfileBlockActions,
    ProfileHeader,
    ProfileInfoCard,
  ],
  templateUrl: './staff-member-education-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberEducationInfo implements OnInit {
  readonly #staffMemberEducationAPI = inject(StaffMemberEducationAPI);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #dialogService = inject(DialogService);
  readonly profileHeader = viewChild<ProfileHeader>('profileHeader');
  readonly staffMemberEducations = computed(() => this.#staffMemberEducationAPI.staffMemberEducations());
  readonly completionPercentage = computed(() => this.#staffMemberEducationAPI.completionPercentage());
  readonly profileEmptyMessage = 'No education information available.';
  readonly profileEmptyDescription = "We couldn't find any education details to display.";
  readonly profileEmptyTabIcon = 'pi pi-graduation-cap';
  // True from the start: ngOnInit awaits the session before the request goes out.
  readonly isLoading = signal(true);
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  protected tabInfoType = PROFILE_TABS.Education;
  protected loginInfo: LoginInfo | undefined;

  constructor() {
    this.#staffMemberEducationAPI.setStaffMemberEducations([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.getStaffMemberEducations();
  }

  async getStaffMemberEducations() {
    const body: GetStaffMemberEducationReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
    };

    this.isLoading.set(true);
    this.#staffMemberEducationAPI.setStaffMemberEducations([]);

    this.#staffMemberEducationAPI
      .getStaffMemberEducations(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#staffMemberEducationAPI.setStaffMemberEducations(res.data ?? []);
            this.#staffMemberEducationAPI.setCompletionPercentage(res.completionPercentage);
          } else {
            this.#staffMemberEducationAPI.setStaffMemberEducations([]);
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async addEditDegree(staffMemberEducation?: IStaffMemberEducationInfo) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberEducationForm, {
      header: staffMemberEducation ? 'Edit Education' : 'Add Education',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMemberEducation },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (data) => {
      if (!data) {
        return;
      }
      // this.#staffMemberEducationAPI.setStaffMemberEducations(data);
      await this.getStaffMemberEducations();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  async removeDegree(staffMemberEducation: IStaffMemberEducationInfo) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this degree? This action cannot be undone.`,
      header: 'Delete Degree',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Degree',
      rejectLabel: 'Keep Degree',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteEducationProcess(staffMemberEducation);
      },
    });
  }

  deleteEducationProcess(staffMemberEducation: IStaffMemberEducationInfo) {
    const body: DeleteStaffMemberEducationReq = { Id: staffMemberEducation.id };
    this.#staffMemberEducationAPI
      .deleteStaffMemberEducation(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#staffMemberEducationAPI.removeEducationSignal(staffMemberEducation.id);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  #getTargetStaffMemberId(): string {
    return (
      this.#route.snapshot.queryParamMap.get('staffMemberId') ?? this.loginInfo?.user?.staffMemberId ?? ''
    );
  }

  updateVerifyStatus(status: boolean, id: number) {
    this.getStaffMemberEducations();
    this.#staffMemberEducationAPI.toggleVerifySignal(status, id);
  }

  updateEditStatus(status: boolean) {
    this.getStaffMemberEducations();
    this.#staffMemberEducationAPI.toggleEditSignal(status);
  }
}
