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
import { TagModule } from '@openng/optimus-ui/tag';
import { finalize } from 'rxjs';

import { Common, PolicyTypeApi, PolicyTypeInsuranceMapApi } from '@core/services';
import { PoliciesInsuranceApi } from '@core/services/policies-insurance-api';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import {
  DeletePolicyTypeInsuranceMapReq,
  GetPolicyTypeInsuranceMapReq,
  IPolicyTypeInsuranceMap,
  LoginInfo,
} from '@shared/interfaces';

import { UpsertPolicyTypeInsuranceMapDialog } from './upsert-policy-type-insurance-map-dialog/upsert-policy-type-insurance-map-dialog';

@Component({
  selector: 'app-policy-type-insurance-map',
  imports: [
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
    CardModule,
    MenuModule,
    ContextMenuModule,
    TagModule,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchInput,
    // TableSearchFilter,
  ],
  templateUrl: './policy-type-insurance-map.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyTypeInsuranceMap implements OnInit {
  readonly #policyTypeInsuranceMapApi = inject(PolicyTypeInsuranceMapApi);
  readonly #policiesInsuranceApi = inject(PoliciesInsuranceApi);
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #commonService = inject(Common);
  readonly table = viewChild<Table>('dt');
  readonly policyTypeInsuranceMaps = signal<IPolicyTypeInsuranceMap[]>([]);
  readonly sortOrder = signal<string | null>('desc');
  readonly sortBy = signal<string | string[] | null | undefined>(undefined);
  readonly pageNumber = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalRecords = signal<number>(0);
  readonly isLoading = signal(false);
  protected selectedRow!: IPolicyTypeInsuranceMap;
  protected actionMenuItems: MenuItem[] = [];
  protected loginInfo!: LoginInfo;

  constructor() {
    this.setPageHeaderInfo();
    this.initActionMenus();

    // Reset Policy Type Names
    this.#policyTypeApi.setPolicyTypeNames([]);
    this.#policiesInsuranceApi.setInsurancePolicyNames([]);
    this.#policyTypeInsuranceMapApi.setPolicyTypeInsuranceMaps([]);

    effect(() => {
      this.isLoading.set(this.#policyTypeInsuranceMapApi.isLoading());
    });

    effect(() => {
      this.policyTypeInsuranceMaps.set(this.#policyTypeInsuranceMapApi.policyTypeInsuranceMaps());
    });

    effect(() => {
      this.totalRecords.set(this.#policyTypeInsuranceMapApi.totalRecords());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave - Policy Type Mapping',
      pageDescription: 'Manage leave-policy type mappings',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Policies', routerLink: '/app/policies' },
      {
        label: 'Leave - Policy Type Mapping',
        routerLink: '/app/policies/leave-policy-type-mapping',
      },
    ]);
  }

  initActionMenus() {
    this.actionMenuItems = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertPolicyTypeInsuranceMap(this.selectedRow),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deletePolicyTypeInsuranceMap(this.selectedRow),
      },
    ];
  }

  async getPolicyTypeInsuranceMaps(event: TableLazyLoadEvent, isPageChange = true) {
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
    const body: GetPolicyTypeInsuranceMapReq = {
      // PolicyTypeId?: string;
      // InsurancePolicyId?: string;
      PageNumber: this.pageNumber(),
      PageSize: this.pageSize() ?? 10,
      SortBy: this.sortBy() ?? '',
      SortOrder: this.sortOrder() ?? 'desc',
      UserStaffMemberId: info.staffMemberId,
      IsActive: true,
    };

    this.#policyTypeInsuranceMapApi.setIsLoading(true);
    this.#policyTypeInsuranceMapApi.setPolicyTypeInsuranceMaps([]);

    this.#policyTypeInsuranceMapApi
      .getPolicyTypeInsuranceMaps(body)
      .pipe(
        finalize(() => this.#policyTypeInsuranceMapApi.setIsLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#policyTypeInsuranceMapApi.setPolicyTypeInsuranceMaps(
            res.isSucceeded ? res.data : [],
          );
          this.#policyTypeInsuranceMapApi.setTotalRecords(
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

  searchPolicyTypeInsuranceMap(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  upsertPolicyTypeInsuranceMap(policyTypeInsuranceMap?: IPolicyTypeInsuranceMap) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(
      UpsertPolicyTypeInsuranceMapDialog,
      {
        header: policyTypeInsuranceMap ? 'Edit Policy Mapping' : 'Add Policy Mapping',
        style: { width: '90vw', maxWidth: '40rem' },
        contentStyle: { overflow: 'hidden' },
        modal: true,
        closable: true,
        focusOnShow: false,
        data: { policyTypeInsuranceMap },
      },
    );

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((res) => {
      if (!res) {
        return;
      }

      this.getPolicyTypeInsuranceMaps({ first: 0, rows: this.pageSize() }, false);
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deletePolicyTypeInsuranceMap(policyTypeInsuranceMap?: IPolicyTypeInsuranceMap) {
    this.#confirmationService.confirm({
      message: `This will permanently delete the <strong>${policyTypeInsuranceMap?.insurancePolicyName}</strong> and all its contents. This action cannot be undone.`,
      header: 'Delete this mapping',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Mapping',
      rejectLabel: 'Keep Mapping',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        if (policyTypeInsuranceMap) {
          this.deletePolicyTypeInsuranceMapProcess(policyTypeInsuranceMap?.id);
        }
      },
    });
  }

  deletePolicyTypeInsuranceMapProcess(id: number) {
    const body: DeletePolicyTypeInsuranceMapReq = { Id: id };
    this.#policyTypeInsuranceMapApi
      .deletePolicyTypeInsuranceMap(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.getPolicyTypeInsuranceMaps({ first: 0, rows: this.pageSize() }, false);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }
}
