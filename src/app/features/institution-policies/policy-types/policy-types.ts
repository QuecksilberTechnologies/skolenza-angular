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
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { BulkImportDialogData, InstitutionPolicyType } from '@shared/interfaces';

import { POLICY_TYPE_IMPORT_DISPLAY, policyBulkImportAdapter } from '../policy-bulk-import';
import PolicyTypeManageDialog from './policy-type-manage-dialog/policy-type-manage-dialog';
import { PolicyTypesStore } from './policy-types.store';

/** The only leaf module this screen resolves gates and `moduleId`/`operationId` against. */
const MODULE_CODE = 'INSTITUTION_POLICY_TYPES';

@Component({
  selector: 'app-policy-types',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    FormsModule,
    SelectModule,
    SplitButtonModule,
    TagModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [PolicyTypesStore],
  templateUrl: './policy-types.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PolicyTypes {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #institutionPolicyApi = inject(InstitutionPolicyApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(PolicyTypesStore);

  protected readonly selectedRow = signal<InstitutionPolicyType | null>(null);

  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  protected readonly canAdd = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Update'),
  );
  protected readonly canImport = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Import'),
  );
  protected readonly canActivate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Active'),
  );
  protected readonly canDeactivate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Inactive'),
  );
  protected readonly canUseRowActions = computed(
    () => this.canUpdate() || this.canActivate() || this.canDeactivate(),
  );
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 5 : 4));

  /** Import hangs off the Add split button, the same place the other masters put it. */
  protected readonly addMenuItems = computed<MenuItem[]>(() =>
    this.canImport()
      ? [
          {
            label: 'Import Policy Types',
            icon: 'pi pi-upload',
            command: () => this.openBulkImport(),
          },
        ]
      : [],
  );

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const policyType = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canToggle = policyType?.isActive ? this.canDeactivate() : this.canActivate();

    return [
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => this.upsertPolicyType(policyType ?? undefined),
            },
          ]
        : []),
      ...(canUpdate && canToggle ? [{ separator: true }] : []),
      ...(canToggle && policyType
        ? [
            {
              label: policyType.isActive ? 'Deactivate' : 'Activate',
              icon: policyType.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              command: () => this.confirmToggleStatus(policyType),
            },
          ]
        : []),
    ];
  });

  constructor() {
    this.#setPageHeaderInfo();
  }

  #setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(MODULE_CODE) ?? 'Policy Types',
      pageDescription: 'Manage the institution policy types policies are created against',
      pageIcon: 'pi pi-tags',
      isBreadcrumbShow: false,
    });
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  searchPolicyTypes(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  categoryName(categoryId: number): string {
    return this.store.categories().find((c) => c.id === categoryId)?.name ?? '-';
  }

  openBulkImport() {
    // The dialog owns the flow; Policy Types owns its target and its copy.
    const data: BulkImportDialogData = {
      adapter: policyBulkImportAdapter(
        this.#institutionPolicyApi,
        this.#featurePageStore,
        'types',
        MODULE_CODE,
      ),
      display: POLICY_TYPE_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Policy Types',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      data,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadPolicyTypes();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  upsertPolicyType(policyType?: InstitutionPolicyType) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(PolicyTypeManageDialog, {
      header: policyType ? 'Edit Policy Type' : 'Create Policy Type',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { policyType, categories: this.store.categories() },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) this.store.reloadPolicyTypes();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmToggleStatus(policyType: InstitutionPolicyType) {
    const isDeactivating = policyType.isActive;

    this.#confirmationService.confirm({
      message: `This will mark <strong>${policyType.name}</strong> as ${
        isDeactivating ? 'Inactive' : 'Active'
      }.${isDeactivating ? ' It will no longer be selectable when creating a policy.' : ''}`,
      header: isDeactivating ? 'Deactivate this policy type' : 'Activate this policy type',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: isDeactivating ? 'Deactivate' : 'Activate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.togglePolicyTypeStatus(policyType),
    });
  }
}

