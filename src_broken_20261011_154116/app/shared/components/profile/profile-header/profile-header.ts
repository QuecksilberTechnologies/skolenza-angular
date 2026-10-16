import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { KnobModule } from '@openng/optimus-ui/knob';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';
import {
  ToggleSwitch,
  ToggleSwitchChangeEvent,
  ToggleSwitchModule,
} from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { ProfileAccessApi } from '@core/services/profile-access-api';
import { LoginInfo, UpdateEditStatusReq, UpdateVerifyStatusReq } from '@shared/interfaces';
import { GetStaffMemberProgressColorPipe } from '@shared/pipes';

import { ProfileVerificationStatus } from '../profile-verification-status/profile-verification-status';

@Component({
  selector: 'app-profile-header',
  imports: [
    FormsModule,
    ButtonModule,
    KnobModule,
    ToggleSwitchModule,
    ProgressSpinnerModule,
    GetStaffMemberProgressColorPipe,
    ProfileVerificationStatus,
  ],
  templateUrl: './profile-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeader implements OnInit {
  // Inputs
  readonly id = input.required<number | string>();
  readonly actionLabel = input.required<string>();
  readonly employementCode = input.required<string>();
  readonly completionPercentage = input.required<number>();
  readonly tabInfoType = input.required<number>();
  readonly roleTypeId = input<number>();
  readonly isShowAddBtn = input<boolean>(true);
  readonly showVerificationBar = input<boolean>(true);
  readonly isInfoVerified = input.required<boolean>();
  readonly isEditAllowed = input.required<boolean>();
  readonly isVerifying = input<boolean>();
  readonly isEditing = input<boolean>();

  // Outputs
  readonly create = output();
  readonly refresh = output();
  readonly updateVerifyStatus = output<boolean>();
  readonly updateEditStatus = output<boolean>();

  // ViewChild
  readonly verifyToggleSwitch = viewChild<ToggleSwitch>('verifyToggleSwitch');
  readonly editToggleSwitch = viewChild<ToggleSwitch>('editToggleSwitch');

  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);

  protected loginInfo!: LoginInfo;
  protected isVerified = false;
  protected isEditAllow = false;

  constructor() {
    effect(() => {
      this.isVerified = this.isInfoVerified();
    });

    effect(() => {
      this.isEditAllow = this.isEditAllowed();
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  onCreate() {
    this.create.emit();
  }

  toggleVerify(event: ToggleSwitchChangeEvent) {
    const status = event.checked;
    this.#confirmationService.confirm({
      message: `Do you want to <b>${status ? 'verify' : 'unverify'}</b> this information?`,
      header: 'Verification',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.processUpdateVerifyStatus(status);
      },
      reject: () => {
        const verifyToggleSwitch = this.verifyToggleSwitch?.();
        if (verifyToggleSwitch) {
          verifyToggleSwitch.modelValue.set(!status);
        }
      },
    });
  }

  processUpdateVerifyStatus(status: boolean) {
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;

    const body: UpdateVerifyStatusReq = {
      userStaffMemberId: sessionUser.staffMemberId,
      staffMemberId: queryStaffMemberId ?? sessionUser.staffMemberId,
      tabInfoType: this.tabInfoType(),
      isVerified: status,
    };

    this.#profileAccessApi.setIsVerifying(true);
    this.#profileAccessApi
      .updateVerificationStatus(body)
      .pipe(
        finalize(() => this.#profileAccessApi.setIsVerifying(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.updateVerifyStatus.emit(status);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  toggleEdit(event: ToggleSwitchChangeEvent) {
    const status = event.checked;
    this.#confirmationService.confirm({
      message: `Do you want to <b>${status ? 'allow editing' : 'disallow editing'}</b> for this information?`,
      header: 'Confirm Editing Rights',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.processUpdateEditStatus(status);
      },
      reject: () => {
        const editToggleSwitch = this.editToggleSwitch?.();
        if (editToggleSwitch) {
          editToggleSwitch.modelValue.set(!status);
        }
      },
    });
  }

  processUpdateEditStatus(status: boolean) {
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;

    const body: UpdateEditStatusReq = {
      userStaffMemberId: sessionUser.staffMemberId,
      staffMemberId: queryStaffMemberId ?? sessionUser.staffMemberId,
      tabInfoType: this.tabInfoType(),
      isEditable: status,
    };

    this.#profileAccessApi.setIsEditing(true);
    this.#profileAccessApi
      .updateEditStatus(body)
      .pipe(
        finalize(() => this.#profileAccessApi.setIsEditing(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.updateEditStatus.emit(status);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }
}
