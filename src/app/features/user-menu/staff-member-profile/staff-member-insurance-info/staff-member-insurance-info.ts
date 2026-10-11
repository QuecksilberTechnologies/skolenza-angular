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
import { BadgeCheck, LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin } from 'rxjs';

import {
  Common,
  StaffMemberDependentApi,
  StaffMemberInsuranceApi,
  PoliciesInsuranceApi,
  PolicyTypeApi,
  ProfileAccessApi,
} from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { ProfileBlockActions } from '@shared/components/profile/profile-block-actions/profile-block-actions';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileInfoCard } from '@shared/components/profile/profile-info-card/profile-info-card';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import {
  DeleteStaffMemberInsuranceReq,
  StaffMemberDependent,
  StaffMemberInsurance,
  GetEnrolledInsuranceReq,
  InsuranceDetail,
  LoginInfo,
  PolicyTypeEnum,
  PolicyTypesName,
} from '@shared/interfaces';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import { StaffMemberInsuranceForm } from './staff-member-insurance-form/staff-member-insurance-form';

@Component({
  selector: 'app-staff-member-insurance-info',
  imports: [
    DatePipe,
    CardModule,
    ConfirmDialogModule,
    LucideAngularModule,
    ProfileLoader,
    ProfileEmpty,
    ProfileInfoBlock,
    ProfileHeader,
    ProfileBlockActions,
    ProfileInfoCard,
  ],
  templateUrl: './staff-member-insurance-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberInsuranceInfo implements OnInit {
  readonly #staffMemberInsuranceApi = inject(StaffMemberInsuranceApi);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #policiesInsuranceApi = inject(PoliciesInsuranceApi);
  readonly #staffMemberDependentApi = inject(StaffMemberDependentApi);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #dialogService = inject(DialogService);
  readonly #policyTypeMap = signal<Map<number, string>>(new Map());
  readonly #insuranceDetailMap = signal<Map<number, InsuranceDetail>>(new Map());
  readonly #dependentMap = signal<Map<number, StaffMemberDependent>>(new Map());
  readonly profileHeader = viewChild<ProfileHeader>('profileHeader');
  readonly BadgeCheck = BadgeCheck;

  readonly staffMemberInsurances = computed(() => {
    const insurances = this.#staffMemberInsuranceApi.staffMemberInsurances();
    const policyTypes = this.#policyTypeMap();
    const insuranceDetails = this.#insuranceDetailMap();
    const dependents = this.#dependentMap();
    return insurances.map((ins) => {
      const detail = insuranceDetails.get(ins.insurancePolicyId);
      return {
        ...ins,
        policyTypeName: ins.policyTypeName || policyTypes.get(ins.policyTypeId) || '-',
        insurancePolicyName: ins.insurancePolicyName || detail?.insurancePolicyName || '-',
        isStaffMemberConsumed: detail?.isStaffMemberConsumed ?? false,
        isDependentConsumed: detail?.isDependentConsumed ?? false,
        consumedDependentCount: detail?.consumedDependentCount ?? 0,
        dependents: (ins.dependents ?? []).map((dep) => {
          const info = dependents.get(dep.dependentId);
          return {
            ...dep,
            dependentName: info?.dependentName ?? '-',
            relationType: info?.relationType ?? '-',
          };
        }),
      };
    });
  });
  readonly completionPercentage = computed(() => this.#staffMemberInsuranceApi.completionPercentage());
  readonly profileEmptyMessage = 'No insurance information available.';
  readonly profileEmptyDescription = "We couldn't find any insurance details to display.";
  readonly profileEmptyTabIcon = 'pi pi-asterisk';
  // True from the start: ngOnInit awaits the session before the request goes out.
  readonly isLoading = signal(true);
  readonly isLoadingPolicyNames = signal(false);
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  protected tabInfoType = PROFILE_TABS.Insurance;
  protected readonly moduleCode = 'STAFF_INSURANCE';
  protected readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Delete'),
  );
  protected loginInfo: LoginInfo | undefined;

  constructor() {
    this.#staffMemberInsuranceApi.setStaffMemberInsurances([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.getEnrolledInsurances();
  }

  async getEnrolledInsurances() {
    const staffMemberId = this.#getTargetStaffMemberId();
    const body: GetEnrolledInsuranceReq = { StaffMemberId: staffMemberId };

    this.isLoading.set(true);
    this.#staffMemberInsuranceApi.setStaffMemberInsurances([]);

    forkJoin({
      enrollments: this.#staffMemberInsuranceApi.getEnrolledInsurances(body),
      policyTypes: this.#policyTypeApi.getPolicyTypeNames({
        IsActive: true,
        PolicyTypeEnumVal: PolicyTypeEnum.Insurance,
      }),
      dependents: this.#staffMemberDependentApi.getStaffMemberDependentsDetail({
        StaffMemberId: staffMemberId,
        UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? staffMemberId,
      }),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ enrollments, policyTypes, dependents }) => {
          if (policyTypes.isSucceeded) {
            const ptMap = new Map<number, string>();
            policyTypes.data?.forEach((pt: PolicyTypesName) => ptMap.set(pt.id, pt.policyName));
            this.#policyTypeMap.set(ptMap);
          }

          if (dependents.isSucceeded) {
            const depMap = new Map<number, StaffMemberDependent>();
            dependents.data?.dependents?.forEach((d: StaffMemberDependent) => depMap.set(d.id, d));
            this.#dependentMap.set(depMap);
          }

          if (enrollments.isSucceeded) {
            const policies = enrollments.data?.policies ?? [];
            this.#staffMemberInsuranceApi.setStaffMemberInsurances(policies);
            this.#staffMemberInsuranceApi.setCompletionPercentage(enrollments.completionPercentage);
            this.isLoadingPolicyNames.set(true);
            this.#loadInsuranceDetails(policies);
          } else {
            this.#staffMemberInsuranceApi.setStaffMemberInsurances([]);
            this.#commonService.showMessage(enrollments.message, 'error');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  #loadInsuranceDetails(policies: StaffMemberInsurance[]) {
    const uniquePolicyTypeIds = [...new Set(policies.map((p) => p.policyTypeId))];
    if (uniquePolicyTypeIds.length === 0) {
      this.isLoadingPolicyNames.set(false);
      return;
    }

    const staffMemberId = this.#getTargetStaffMemberId();
    const requests = uniquePolicyTypeIds.map((policyTypeId) =>
      this.#policiesInsuranceApi.getInsuranceDetails({
        StaffMemberId: staffMemberId,
        PolicyId: policyTypeId,
        IsActive: true,
      }),
    );

    forkJoin(requests)
      .pipe(
        finalize(() => this.isLoadingPolicyNames.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (results) => {
          const detailMap = new Map<number, InsuranceDetail>();
          for (const res of results) {
            if (res.isSucceeded) {
              res.data?.forEach((detail: InsuranceDetail) =>
                detailMap.set(detail.insurancePolicyId, detail),
              );
            }
          }
          this.#insuranceDetailMap.set(detailMap);
        },
      });
  }

  async addInsurance(staffMemberInsurance?: StaffMemberInsurance) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberInsuranceForm, {
      header: staffMemberInsurance ? 'Edit Insurance Information' : 'Add Insurance Information',
      style: { width: '90vw', maxWidth: '54rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMemberInsurance },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (data) => {
      if (!data) {
        return;
      }
      await this.getEnrolledInsurances();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  removeInsurance(staffMemberInsurance: StaffMemberInsurance) {
    if (!this.canDelete()) return;

    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this insurance? This action cannot be undone.`,
      header: 'Delete Insurance',
      icon: 'pi pi-trash text-red-400! text-xl!',
      acceptLabel: 'Delete Insurance',
      rejectLabel: 'Keep Insurance',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteInsuranceProcess(staffMemberInsurance);
      },
    });
  }

  deleteInsuranceProcess(staffMemberInsurance: StaffMemberInsurance) {
    const body: DeleteStaffMemberInsuranceReq = {
      staffMemberInsuranceMappingId: staffMemberInsurance.id,
    };

    this.#staffMemberInsuranceApi
      .deleteInsurance(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.getEnrolledInsurances();
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
    this.getEnrolledInsurances();
    this.#staffMemberInsuranceApi.toggleVerifySignal(status, id);
  }

  updateEditStatus(status: boolean, id: number) {
    this.getEnrolledInsurances();
    this.#staffMemberInsuranceApi.toggleEditSignal(status, id);
  }
}

