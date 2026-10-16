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
import { Popover, PopoverModule } from '@openng/optimus-ui/popover';
import { SelectModule } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common, PolicyTypeApi } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  DeletePolicyTypeReq,
  GetPolicyTypesReq,
  LoginInfo,
  PolicyType,
  PolicyTypeEnum,
} from '@shared/interfaces';

import { PolicyTypeLeaveDetail } from './policy-type-leave-detail/policy-type-leave-detail';
import { PolicyTypeMapDetail } from './policy-type-map-detail/policy-type-map-detail';
import { PolicyTypeUnstructDetail } from './policy-type-unstruct-detail/policy-type-unstruct-detail';
import { UpsertPolicyTypesDialog } from './upsert-policy-types-dialog/upsert-policy-types-dialog';

interface HasDocOption {
  name: string;
  value: boolean;
}

interface PolicyCategoryOption {
  name: string;
  value: number;
}

export interface IPolicyTypeFilter {
  hasDocumnet?: boolean;
  policyTypeEnumVal?: number;
}

@Component({
  selector: 'app-policy-types',
  imports: [
    ButtonModule,
    SplitButtonModule,
    CardModule,
    TableModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    TagModule,
    PopoverModule,
    SelectModule,
    TooltipModule,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
    TableSearchInput,
    PolicyTypeMapDetail,
    PolicyTypeLeaveDetail,
    PolicyTypeUnstructDetail,
  ],
  templateUrl: './policy-types.html',
  styleUrl: './policy-types.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyTypes implements OnInit {
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly table = viewChild<Table>('dt');
  readonly op = viewChild<Popover>('op');
  readonly policyTypes = signal<PolicyType[]>([]);
  readonly sortOrder = signal<string | null>('desc');
  readonly sortBy = signal<string | string[] | null | undefined>(undefined);
  readonly pageNumber = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalRecords = signal<number>(0);
  readonly hasDocOptions = signal<HasDocOption[]>([]);
  readonly policyCategoryOptions = signal<PolicyCategoryOption[]>([]);
  readonly isLoading = signal(false);
  readonly appliedFilters = signal<IPolicyTypeFilter | null>(null);
  readonly selectedCity: HasDocOption | undefined;
  protected primaryActionItems: MenuItem[] = [];
  protected actionMenuItems: MenuItem[] = [];
  protected selectedRow!: PolicyType;
  protected loginInfo!: LoginInfo;
  protected readonly PolicyTypeEnum = PolicyTypeEnum;

  constructor() {
    this.setPageHeaderInfo();
    this.initPrimaryActionItems();
    this.initActionMenus();

    this.hasDocOptions.set([
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ]);

    this.policyCategoryOptions.set([
      { name: 'Insurance', value: PolicyTypeEnum.Insurance },
      { name: 'Leave', value: PolicyTypeEnum.Leave },
      { name: 'Rental', value: PolicyTypeEnum.Rental },
      { name: 'Other', value: PolicyTypeEnum.Other },
    ]);

    effect(() => {
      this.isLoading.set(this.#policyTypeApi.isLoading());
    });

    effect(() => {
      this.policyTypes.set(this.#policyTypeApi.policyTypes());
    });

    effect(() => {
      this.totalRecords.set(this.#policyTypeApi.totalRecords());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Policies',
      pageDescription: 'Manage Policies',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: false,
    });
  }

  initPrimaryActionItems() {
    this.primaryActionItems = [
      {
        label: 'Attendance Policies',
        icon: 'pi pi-verified',
        routerLink: ['/app/policies/attendance-policies'],
      },
      { separator: true },
      {
        label: 'Insurance - Policies',
        icon: 'pi pi-sitemap',
        routerLink: ['/app/policies/insurance-policies'],
      },
      { separator: true },
      {
        label: 'Insurance - Policy Type Mapping',
        icon: 'pi pi-sitemap',
        routerLink: ['/app/policies/insurance-policy-type-mapping'],
      },
      { separator: true },
      {
        label: 'Leave - Policy Type Mapping',
        icon: 'pi pi-cog',
        routerLink: ['/app/policies/leave-policy-type-mapping'],
      },
      { separator: true },
      {
        label: 'Leave - Staff Member Policy Mapping',
        icon: 'pi pi-cog',
        routerLink: ['/app/policies/leave-staff-member-policy-mapping'],
      },
    ];
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertPolicyType(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deletePolicyType(this.selectedRow),
      },
    ];
  }

  async getPolicyTypes(
    event: TableLazyLoadEvent,
    isPageChange = true,
    filters?: IPolicyTypeFilter | null,
  ) {
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

    const req: GetPolicyTypesReq = {
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
      PageNumber: this.pageNumber(),
      PageSize: this.pageSize() ?? 10,
      SortBy: this.sortBy() ?? '',
      SortOrder: this.sortOrder() ?? 'desc',
      IsActive: true,
    };

    if (filters?.policyTypeEnumVal !== undefined) {
      req.PolicyTypeEnumVal = filters.policyTypeEnumVal;
    }

    if (filters?.hasDocumnet !== undefined) {
      req.HasDocumnet = filters.hasDocumnet;
    }

    this.#policyTypeApi.setIsLoading(true);
    this.#policyTypeApi.setPolicyTypes([]);

    this.#policyTypeApi
      .getPolicyTypes(req)
      .pipe(
        finalize(() => this.#policyTypeApi.setIsLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#policyTypeApi.setPolicyTypes(res.isSucceeded ? res.data : []);
          this.#policyTypeApi.setTotalRecords(
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

  hasDocOptionsChange(hasDocumnet: boolean) {
    this.appliedFilters.update((filter) => ({ ...filter, hasDocumnet: hasDocumnet }));
    this.getPolicyTypes({ first: 0, rows: this.pageSize() }, true, this.appliedFilters());
  }

  policyCategoryChange(policyTypeEnumVal: number | null) {
    this.appliedFilters.update((filter) => ({
      ...filter,
      policyTypeEnumVal: policyTypeEnumVal ?? undefined,
    }));
    this.getPolicyTypes({ first: 0, rows: this.pageSize() }, true, this.appliedFilters());
  }

  searchPolicyTypes(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  upsertPolicyType(policyType?: PolicyType) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(UpsertPolicyTypesDialog, {
      header: policyType ? 'Edit Policy' : 'Add Policy',
      modal: true,
      closable: true,
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      data: { policyType },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.getPolicyTypes({ first: 0, rows: this.pageSize() }, false);
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deletePolicyType(policyType: PolicyType) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${policyType.policyName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteLeaveType(policyType);
      },
    });
  }

  async deleteLeaveType(policyType: PolicyType) {
    if (!policyType) return;

    const body: DeletePolicyTypeReq = { PolicyId: policyType?.id };
    this.#policyTypeApi
      .deletePolicyType(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            await this.getPolicyTypes({ first: 0, rows: this.pageSize() }, false);
          }
        },
        error: (error) => {
          this.#commonService.showMessage(error.message, 'error');
        },
      });
  }

  showVerificationPopover(event: unknown, policyType: PolicyType) {
    this.hidePopover();

    setTimeout(() => {
      this.selectedRow = {} as PolicyType;
      this.selectedRow = policyType;
      this.op()?.show(event);

      if (this.op()?.container) {
        this.op()?.align();
      }
    }, 0);
  }

  onHideVerificationPopover() {
    this.selectedRow = {} as PolicyType;
  }

  hidePopover() {
    this.op()?.hide();
  }
}
