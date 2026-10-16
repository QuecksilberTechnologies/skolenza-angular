import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { InstitutionPolicyApprovalStage } from '@shared/interfaces';

import { APPROVALS_MODULE_CODE } from '../institution-policy-constants';
import ApprovalStageDialog from './approval-stage-dialog/approval-stage-dialog';
import { PolicyApprovalStagesStore } from './policy-approval-stages.store';

@Component({
  selector: 'app-policy-approval-stages',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    FormsModule,
    SelectModule,
    TagModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [PolicyApprovalStagesStore],
  templateUrl: './policy-approval-stages.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyApprovalStages {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(PolicyApprovalStagesStore);

  protected readonly selectedRow = signal<InstitutionPolicyApprovalStage | null>(null);

  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(APPROVALS_MODULE_CODE, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(APPROVALS_MODULE_CODE, 'Update'),
  );
  protected readonly canDisable = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(APPROVALS_MODULE_CODE, 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDisable());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 7 : 6));

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const stage = this.selectedRow();
    if (!stage) return [];

    const items: MenuItem[] = [];

    if (this.canUpdate()) {
      items.push({
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.upsertStage(stage),
      });
    }
    if (stage.isActive && this.canDisable()) {
      items.push({
        label: 'Disable',
        icon: 'pi pi-ban',
        command: () => this.confirmDisable(stage),
      });
    }

    return items;
  });

  constructor() {
    this.#setPageHeaderInfo();
  }

  #setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(APPROVALS_MODULE_CODE) ?? 'Approval Stages',
      pageDescription: 'Configure the gates a policy version passes on its way to publish',
      pageIcon: 'pi pi-sitemap',
      isBreadcrumbShow: false,
    });
  }

  onCategoryChange(policyCategoryId: number | null) {
    this.store.setPolicyCategoryId(policyCategoryId ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  searchStages(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  categoryName(policyCategoryId: number | null): string {
    if (policyCategoryId === null) return 'Every category';
    return this.store.categories().find((c) => c.id === policyCategoryId)?.name ?? '-';
  }

  roleName(approverRoleId: number): string {
    return this.store.roles().find((r) => r.id === approverRoleId)?.roleName ?? '-';
  }

  upsertStage(stage?: InstitutionPolicyApprovalStage) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(ApprovalStageDialog, {
      header: stage ? 'Edit Approval Stage' : 'Add Approval Stage',
      style: { width: '90vw', maxWidth: '44rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { stage, categories: this.store.categories(), roles: this.store.roles() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) this.store.reloadStages();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDisable(stage: InstitutionPolicyApprovalStage) {
    this.#confirmationService.confirm({
      header: 'Disable this approval stage',
      message: `This stops <strong>${stage.stageName}</strong> gating new submissions. Versions already routed through it keep their approval history.`,
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Disable',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.disableStage(stage),
    });
  }
}
