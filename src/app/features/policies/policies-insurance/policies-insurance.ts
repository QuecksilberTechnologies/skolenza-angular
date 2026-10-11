import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { finalize } from 'rxjs';

import { Common, PolicyTypeApi } from '@core/services';
import { PoliciesInsuranceApi } from '@core/services/policies-insurance-api';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import {
  DeleteInsurancePolicyReq,
  GetInsurancePolicyReq,
  InsurancePolicy,
  LoginInfo,
  TableEmptyMessage,
  TableInlineFilters,
  TableLoader,
  TableSearchInput,
} from '@shared/index';

import { InsurancePolicyDetail } from './insurance-policy-detail/insurance-policy-detail';
import { UpsertInsurancePolicyDialog } from './upsert-insurance-policy-dialog/upsert-insurance-policy-dialog';

@Component({
  selector: 'app-policies-insurance',
  imports: [
    MenuModule,
    ContextMenuModule,
    ConfirmDialogModule,
    CardModule,
    ButtonModule,
    TableModule,
    TableLoader,
    TableEmptyMessage,
    TableSearchInput,
    TableInlineFilters,
    HeadlessDrawer,
    InsurancePolicyDetail,
  ],
  templateUrl: './policies-insurance.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PoliciesInsurance implements OnInit {
  readonly #policiesInsuranceApi = inject(PoliciesInsuranceApi);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(DialogService);
  readonly table = viewChild<Table>('dt');
  readonly insurancPolicies = signal<InsurancePolicy[]>([]);
  readonly isLoading = signal(false);
  readonly sortOrder = signal<string | null>('desc');
  readonly sortBy = signal<string | string[] | null | undefined>(undefined);
  readonly pageNumber = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalRecords = signal<number>(0);
  protected selectedRow!: InsurancePolicy;
  protected actionMenuItems: MenuItem[] = [];
  protected loginInfo!: LoginInfo;
  /**
   * The detail sheet needs its own subject. `selectedRow` cannot serve: it is bound to
   * `contextMenuSelection`, and Optimus emits `null` through that binding on every context-menu
   * dismissal, which would blank the sheet the instant the menu closed.
   */
  protected readonly detailPolicy = signal<InsurancePolicy | null>(null);
  protected readonly isShowDetail = signal(false);
  /** `p-drawer` does not restore focus to whatever opened it. */
  #returnFocusTo: HTMLElement | null = null;

  constructor() {
    this.setPageHeaderInfo();
    this.initActionMenus();

    // Reset Policy Type Names
    this.#policyTypeApi.setPolicyTypeNames([]);

    effect(() => {
      this.insurancPolicies.set(this.#policiesInsuranceApi.insurancPolicies());
    });

    effect(() => {
      this.totalRecords.set(this.#policiesInsuranceApi.totalRecords());
    });

    effect(() => {
      this.isLoading.set(this.#policiesInsuranceApi.isLoading());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Insurance Policies',
      pageDescription: 'Easily browse, create, and manage your company insurance policies.',
      pageIcon: 'pi pi-shield',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Policies', routerLink: '/app/policies' },
      { label: 'Manage Insurance Policies' },
    ]);
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => this.onViewDetails(this.selectedRow),
      },
      {
        separator: true,
      },
      // {
      //   label: 'Edit',
      //   icon: 'pi pi-pencil',
      //   command: () => this.upsertInsurancePolicy(this.selectedRow),
      // },
      // {
      //   separator: true,
      // },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deleteInsurancePolicy(this.selectedRow),
      },
    ];
  }

  onViewDetails(insurancePolicy: InsurancePolicy, trigger?: EventTarget | null) {
    this.#returnFocusTo =
      (trigger as HTMLElement | null) ?? (document.activeElement as HTMLElement | null);
    this.detailPolicy.set(insurancePolicy);
    this.isShowDetail.set(true);
  }

  /** The drawer's own mask-click and Escape paths close themselves; mirror that back here. */
  onDetailVisibleChange(visible: boolean) {
    if (!visible) {
      this.closeDetails();
    }
  }

  /**
   * Setting `visible` false does not make `p-drawer` emit `onHide` — only its own mask-click and
   * Escape paths do — so both routes funnel through here and it has to be safe to run twice.
   */
  closeDetails() {
    this.isShowDetail.set(false);
    this.#returnFocusTo?.focus();
    this.#returnFocusTo = null;
  }

  async getPolicies(event: TableLazyLoadEvent, isPageChange = true) {
    if (!this.loginInfo) {
      this.loginInfo = await this.#commonService.getLoginInfo();
    }

    const { page, rows, sortField, sortOrder } = this.#commonService.getPaginationParam(event);
    if (isPageChange) {
      this.pageNumber.set(page);
    }

    this.pageSize.set(rows);
    this.sortBy.set(sortField);
    this.sortOrder.set(sortOrder);

    const info = this.loginInfo?.user;
    if (!info) return;
    const body: GetInsurancePolicyReq = {
      UserStaffMemberId: info.staffMemberId,
      PageNumber: this.pageNumber(),
      PageSize: this.pageSize() ?? 10,
      SortBy: this.sortBy() ?? '',
      SortOrder: this.sortOrder() ?? 'desc',
      IsActive: true,
    };

    this.#policiesInsuranceApi.setIsLoading(true);
    this.#policiesInsuranceApi.setInsurancPolicies([]);

    this.#policiesInsuranceApi
      .getInsurancePolicies(body)
      .pipe(
        finalize(() => this.#policiesInsuranceApi.setIsLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#policiesInsuranceApi.setInsurancPolicies(res.isSucceeded ? res.data : []);
          this.#policiesInsuranceApi.setTotalRecords(
            res.isSucceeded ? res.totalRecords || res.data.length : 0,
          );
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async upsertInsurancePolicy(insurancePolicy?: InsurancePolicy) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(UpsertInsurancePolicyDialog, {
      header: insurancePolicy ? 'Edit Insurance Policy' : 'Add Insurance Policy',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { insurancePolicy },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (res) => {
      if (!res) {
        return;
      }
      await this.getPolicies({ first: 0, rows: this.pageSize() }, false);
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  async deleteInsurancePolicy(insurancePolicy: InsurancePolicy) {
    this.#confirmationService.confirm({
      message: `This will permanently remove the <strong>${insurancePolicy?.insurancePolicyName}</strong> and all its contents. This action cannot be undone.`,
      header: 'Remove this insurance policy',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Remove Insurance Policy',
      rejectLabel: 'Keep Insurance Policy',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteInsurancePolicyProcess(insurancePolicy);
      },
    });
  }

  deleteInsurancePolicyProcess(insurancePolicy: InsurancePolicy) {
    const body: DeleteInsurancePolicyReq = {
      InsuranceId: insurancePolicy?.insurancePolicyId ?? 0,
    };

    this.#policiesInsuranceApi
      .deleteInsurancePolicy(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            await this.getPolicies({ first: 0, rows: this.pageSize() }, false);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }
}
