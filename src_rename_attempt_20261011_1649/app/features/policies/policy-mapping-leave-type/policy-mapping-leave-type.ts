import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TableModule } from '@openng/optimus-ui/table';
import { finalize } from 'rxjs';

import { Common, PolicyMappingLeaveTypeApi } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { IPolicyMappingLeaveType, PolicyMappingLeaveTypeDeleteRequest } from '@shared/interfaces';

import LeaveTypeMappingDialog from './leave-type-mapping-dialog/leave-type-mapping-dialog';

@Component({
  selector: 'app-policy-mapping-leave-type',
  imports: [
    ButtonModule,
    CardModule,
    TableModule,
    ConfirmDialogModule,
    MenuModule,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
  ],
  providers: [ConfirmationService],
  templateUrl: './policy-mapping-leave-type.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyMappingLeaveType implements OnInit {
  readonly #policyMappingLeaveTypeService = inject(PolicyMappingLeaveTypeApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  protected policyMappingLeaveTypes = signal<IPolicyMappingLeaveType[]>([]);
  protected isLoadingTypes = signal(false);
  protected actionItems: MenuItem[] = [{ label: 'Edit' }, { label: 'Delete' }];

  constructor() {
    this.setPageHeaderInfo();

    effect(() => {
      this.policyMappingLeaveTypes.set(
        this.#policyMappingLeaveTypeService.policyMappingLeaveTypes(),
      );
    });
  }

  async ngOnInit() {
    await this.fetchAllPolicyMappingLeaveTypes();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave - Policy Type Mapping',
      pageDescription: 'Manage Leave - Policy Type Mapping',
      pageIcon: 'pi pi-plus',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Policies', routerLink: '/app/policies' },
      { label: 'Manage Leave - Policy Type Mapping' },
    ]);
  }

  async fetchAllPolicyMappingLeaveTypes() {
    const loginInfo = await this.#commonService.getLoginInfo();
    const sessionUser = loginInfo?.user;
    if (!sessionUser) return;
    const staffMemberId = sessionUser?.staffMemberId;
    const authRoleId = +(sessionUser?.primaryRole?.roleId ?? 0);

    this.isLoadingTypes.set(true);
    this.#policyMappingLeaveTypeService
      .getAllPolicyMappingLeaveTypes(staffMemberId, 0, authRoleId)
      .pipe(
        finalize(() => this.isLoadingTypes.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (rs) => {
          this.#policyMappingLeaveTypeService.setPolicyMappingLeaveTypes(rs.data);
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  openNew(policyMappingLeaveType?: IPolicyMappingLeaveType) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(LeaveTypeMappingDialog, {
      header: policyMappingLeaveType ? 'Edit Map Policy Leave Type' : 'Map Policy Leave Type',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { policyMappingLeaveType },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.fetchAllPolicyMappingLeaveTypes();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteType(policyMappingLeaveType?: IPolicyMappingLeaveType) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deletePolicyMappingLeaveType(policyMappingLeaveType);
      },
    });
  }

  async deletePolicyMappingLeaveType(policyMappingLeaveType?: IPolicyMappingLeaveType) {
    const loginInfo = await this.#commonService.getLoginInfo();
    const staffMemberId = loginInfo?.user?.staffMemberId ?? '';

    const body: PolicyMappingLeaveTypeDeleteRequest = {
      id: policyMappingLeaveType?.id,
      userId: staffMemberId,
    };

    this.#policyMappingLeaveTypeService
      .deletePolicyMappingLeaveType(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          if (result) {
            this.fetchAllPolicyMappingLeaveTypes();
            this.#commonService.showMessage(
              'Policy mapping leave type deleted successfully',
              'success',
            );
          }
        },
        error: (error) => {
          this.#commonService.showMessage(error.message, 'error');
        },
      });
  }
}
