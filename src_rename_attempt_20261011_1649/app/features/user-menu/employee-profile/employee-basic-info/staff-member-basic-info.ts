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
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { Droplet, LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { Common, StaffMemberBasicAPI, ProfileAccessApi } from '@core/services';
import { AuthStore, LookupStore } from '@core/stores';
import { StaffMemberManageDialog } from '@shared/components/staffMember/staffMember-manage-dialog/staffMember-manage-dialog';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileInfoCard } from '@shared/components/profile/profile-info-card/profile-info-card';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import { GetStaffMemberBasicReq, IStaffMemberBasicInfo, LoginInfo } from '@shared/interfaces';
import { GetRelationNamePipe, GetRoleTypePipe } from '@shared/pipes';
import { PROFILE_TABS } from '@shared/utilities/common-data';

@Component({
  selector: 'app-staffMember-basic-info',
  imports: [
    ButtonModule,
    CardModule,
    LucideAngularModule,
    ConfirmDialogModule,
    DatePipe,
    GetRelationNamePipe,
    GetRoleTypePipe,
    ProfileLoader,
    ProfileEmpty,
    ProfileInfoBlock,
    ProfileHeader,
    ProfileInfoCard,
    TooltipModule,
  ],
  templateUrl: './staffMember-basic-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberBasicInfo implements OnInit {
  readonly #staffMemberBasicAPI = inject(StaffMemberBasicAPI);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #dialogService = inject(DialogService);
  readonly #authStore = inject(AuthStore);
  readonly #lookupStore = inject(LookupStore);
  readonly profileHeader = viewChild<ProfileHeader>('profileHeader');
  readonly staffMemberBasics = computed(() => this.#staffMemberBasicAPI.staffMemberBasics());
  readonly completionPercentage = computed(() => this.#staffMemberBasicAPI.completionPercentage());
  readonly relationsOptions = this.#lookupStore.relations;
  readonly profileEmptyMessage = 'No basic information found';
  readonly profileEmptyDescription = "We couldn't find any profile details to display.";
  readonly profileEmptyTabIcon = 'pi pi-user';
  // True from the start: ngOnInit awaits the session before the request goes out.
  readonly isLoading = signal(true);
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  readonly Droplet = Droplet;
  protected tabInfoType = PROFILE_TABS.StaffMember;
  protected loginInfo: LoginInfo | undefined;

  constructor() {
    this.#staffMemberBasicAPI.setStaffMemberBasics([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    // When redirected from user menu
    this.#route.fragment.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (fragment) => {
      if (fragment) {
        await this.getStaffMemberBasics();
      }
    });

    // When redirected from staffMembers page
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    if (queryStaffMemberId) {
      await this.getStaffMemberBasics();
    } else if (!this.#route.snapshot.fragment) {
      // Neither entry point applies, so no request will clear the initial loading state.
      this.isLoading.set(false);
    }
  }

  async getStaffMemberBasics() {
    const body: GetStaffMemberBasicReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
    };

    this.isLoading.set(true);
    this.#staffMemberBasicAPI.setStaffMemberBasics([]);

    this.#staffMemberBasicAPI
      .getStaffMemberBasics(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#staffMemberBasicAPI.setStaffMemberBasics(res.data ?? []);
            this.#staffMemberBasicAPI.setCompletionPercentage(res.completionPercentage);
          } else {
            this.#staffMemberBasicAPI.setStaffMemberBasics([]);
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async addBasic(staffMemberBasic?: IStaffMemberBasicInfo) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberManageDialog, {
      header: staffMemberBasic ? 'Edit Basic Info' : 'Add Basic Info',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMemberBasic },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (data) => {
      if (!data) {
        return;
      }
      // Refresh summary and menu first, while basics still has the updated data from the dialog
      this.#refreshProfileSummaryAndMenu();
      await this.getStaffMemberBasics();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  #refreshProfileSummaryAndMenu() {
    const staffMemberId = this.#getTargetStaffMemberId();
    // Refresh profile summary and sync the updated name to the top-right menu + storage
    this.#staffMemberBasicAPI
      .fetchProfileSummary(staffMemberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((res) => {
        if (res?.isSucceeded && res.data?.fullName) {
          this.#authStore.updateStaffMemberName(res.data.fullName);
        }
      });
  }

  #getTargetStaffMemberId(): string {
    return (
      this.#route.snapshot.queryParamMap.get('staffMemberId') ?? this.loginInfo?.user?.staffMemberId ?? ''
    );
  }

  updateVerifyStatus(status: boolean, id: string) {
    this.getStaffMemberBasics();
    this.#staffMemberBasicAPI.toggleVerifySignal(status, id);
  }

  updateEditStatus(status: boolean, id: string) {
    this.getStaffMemberBasics();
    this.#staffMemberBasicAPI.toggleEditSignal(status, id);
  }
}
