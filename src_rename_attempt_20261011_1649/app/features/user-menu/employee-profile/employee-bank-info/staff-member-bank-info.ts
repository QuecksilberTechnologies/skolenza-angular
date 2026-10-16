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

import { Common, StaffMemberBanksAPI, ProfileAccessApi } from '@core/services';
import { ProfileBlockActions } from '@shared/components/profile/profile-block-actions/profile-block-actions';
import { ProfileDocumentBlock } from '@shared/components/profile/profile-document-block/profile-document-block';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileInfoCard } from '@shared/components/profile/profile-info-card/profile-info-card';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import {
  DeleteStaffMemberBankReq,
  GetStaffMemberBankReq,
  IStaffMemberBankInfo,
  LoginInfo,
} from '@shared/interfaces';
import { GetPaymentLogoPipe } from '@shared/pipes';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import { StaffMemberBankForm } from './staffMember-bank-form/staffMember-bank-form';

@Component({
  selector: 'app-staffMember-bank-info',
  imports: [
    FormsModule,
    CardModule,
    ConfirmDialogModule,
    ProfileLoader,
    ProfileEmpty,
    ProfileInfoBlock,
    ProfileHeader,
    ProfileBlockActions,
    ProfileInfoCard,
    ProfileDocumentBlock,
    GetPaymentLogoPipe,
  ],
  templateUrl: './staffMember-bank-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberBankInfo implements OnInit {
  readonly #staffMemberBanksAPI = inject(StaffMemberBanksAPI);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly profileHeader = viewChild<ProfileHeader>('profileHeader');
  readonly staffMemberBanks = computed(() => this.#staffMemberBanksAPI.staffMemberBanks());
  readonly completionPercentage = computed(() => this.#staffMemberBanksAPI.completionPercentage());
  readonly profileEmptyMessage = 'No bank information available.';
  readonly profileEmptyDescription = 'No bank details found. Please add your bank information.';
  readonly profileEmptyTabIcon = 'pi pi-building-columns';
  // True from the start: ngOnInit awaits the session before the request goes out.
  readonly isLoading = signal(true);
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  protected tabInfoType = PROFILE_TABS.Bank;
  protected loginInfo: LoginInfo | undefined;

  constructor() {
    this.#staffMemberBanksAPI.setStaffMemberBanks([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.getStaffMemberBanks();
  }

  async getStaffMemberBanks() {
    const body: GetStaffMemberBankReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
    };

    this.isLoading.set(true);
    this.#staffMemberBanksAPI.setStaffMemberBanks([]);

    this.#staffMemberBanksAPI
      .getStaffMemberBanks(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#staffMemberBanksAPI.setStaffMemberBanks(res.data ?? []);
            this.#staffMemberBanksAPI.setCompletionPercentage(res.completionPercentage);
          } else {
            this.#staffMemberBanksAPI.setStaffMemberBanks([]);
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async addEditBank(staffMemberBank?: IStaffMemberBankInfo) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberBankForm, {
      header: staffMemberBank ? 'Edit Bank Information' : 'Add Bank Information',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMemberBank },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (data) => {
      if (!data) {
        return;
      }
      await this.getStaffMemberBanks();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  async removeBank(bank: IStaffMemberBankInfo) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this bank? This action cannot be undone.`,
      header: 'Delete Bank',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Bank',
      rejectLabel: 'Keep Bank',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteBankProcess(bank);
      },
    });
  }

  deleteBankProcess(bank: IStaffMemberBankInfo) {
    const body: DeleteStaffMemberBankReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
      Id: bank.id,
    };

    this.#staffMemberBanksAPI
      .deleteStaffMemberBank(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#staffMemberBanksAPI.removeBankSignal(bank.id);
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

  mask(value: string, visible = 2): string {
    if (!value) return value;
    return value.slice(0, visible) + '*'.repeat(value.length - visible);
  }

  toggleMask(id: number, key: string) {
    const maskFieldMap: Record<string, keyof IStaffMemberBankInfo> = {
      isMasked: 'isMasked',
      accountNumber: 'accountNumberMasked',
      ifscCode: 'ifscCodeMasked',
      upiId: 'upiIdMasked',
    };

    const field = maskFieldMap[key];
    if (!field) return;

    this.#staffMemberBanksAPI.setStaffMemberBanks(
      this.staffMemberBanks().map((item) =>
        item.id === id ? { ...item, [field]: !item[field] } : item,
      ),
    );
  }

  updateVerifyStatus(status: boolean, id: number) {
    this.getStaffMemberBanks();
    this.#staffMemberBanksAPI.toggleVerifySignal(status, id);
  }

  updateEditStatus(status: boolean) {
    this.getStaffMemberBanks();
    this.#staffMemberBanksAPI.toggleEditSignal(status);
  }
}
