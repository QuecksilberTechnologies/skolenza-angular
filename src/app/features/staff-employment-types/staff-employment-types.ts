import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Menu, MenuModule } from '@openng/optimus-ui/menu';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common, StaffEmploymentTypesAPI } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import {
  BulkImportDialogData,
  StaffEmploymentType,
  GetStaffEmploymentTypesResponse,
  LoginInfo,
} from '@shared/interfaces';
import { isAdminSession } from '@shared/utilities/login-info';

import {
  STAFF_EMPLOYMENT_TYPES_IMPORT_DISPLAY,
  staffEmploymentTypeBulkImportAdapter,
} from './staff-employment-type-bulk-import';
import StaffEmploymentTypeManageDialog from './staff-employment-type-manage-dialog/staff-employment-type-manage-dialog';
import { StaffEmploymentTypesStore } from './staff-employment-types.store';

@Component({
  selector: 'app-staff-employment-types',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    TagModule,
    TooltipModule,
    SplitButtonModule,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
  ],
  providers: [StaffEmploymentTypesStore],
  templateUrl: './staff-employment-types.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffEmploymentTypes implements OnInit {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #staffEmploymentTypesApi = inject(StaffEmploymentTypesAPI);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(StaffEmploymentTypesStore);
  protected readonly table = viewChild<Table>('dt');
  protected readonly actionMenu = viewChild<Menu>('actionMenu');
  protected readonly loginInfo = signal<LoginInfo | null>(null);
  protected readonly selectedRow = signal<StaffEmploymentType | null>(null);
  protected readonly moduleCode = ['STAFF_EMPLOYMENT_TYPES'] as const;

  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(this.moduleCode, 'Update'),
  );

  protected readonly canAddStaffEmploymentType = computed(() => isAdminSession(this.loginInfo()));

  protected readonly staffEmploymentTypeSplitButtonItems: MenuItem[] = [
    {
      label: 'Import StaffMember Types',
      icon: 'pi pi-upload',
      command: () => this.openBulkImport(),
    },
  ];

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();

    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.createEditStaffEmploymentType(row),
      },
      { separator: true },
      {
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.confirmDeleteStaffEmploymentType(row),
      },
    ];
  });

  constructor() {
    effect(() => this.#setPageHeaderInfo());
  }

  async ngOnInit() {
    this.loginInfo.set(await this.#commonService.getLoginInfo());
  }

  #setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'StaffMember Types',
      pageDescription: 'Manage staffMember types and their configurations',
      pageIcon: 'pi pi-tags',
      isBreadcrumbShow: false,
    });
  }

  createEditStaffEmploymentType(staffEmploymentType?: StaffEmploymentType | null) {
    const ref = this.#dialogService.open(StaffEmploymentTypeManageDialog, {
      header: staffEmploymentType ? 'Update StaffMember Type' : 'Add StaffMember Type',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffEmploymentType },
    });

    ref?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: GetStaffEmploymentTypesResponse | undefined) =>
        this.#refreshAfterSave(result, staffEmploymentType),
      );

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  openBulkImport() {
    // The dialog owns the flow; StaffMember Types owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: staffEmploymentTypeBulkImportAdapter(this.#staffEmploymentTypesApi),
      display: STAFF_EMPLOYMENT_TYPES_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import StaffMember Types',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the list is refetched rather than
    // left showing the staffMember types from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadFirstPage();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  #refreshAfterSave(
    result: GetStaffEmploymentTypesResponse | undefined,
    staffEmploymentType?: StaffEmploymentType | null,
  ) {
    if (!result) return;

    if (staffEmploymentType?.id) {
      this.store.reloadStaffEmploymentTypes();
      return;
    }

    const table = this.table();
    if (table) {
      table.first = 0;
    }
    this.store.reloadFirstPage();
  }

  confirmDeleteStaffEmploymentType(staffEmploymentType?: StaffEmploymentType | null) {
    if (!staffEmploymentType) return;

    this.#confirmationService.confirm({
      message: `This will permanently delete the <strong>${staffEmploymentType.typeName}</strong> staffMember type. This action cannot be undone.`,
      header: 'Delete this staffMember type',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete StaffMember Type',
      rejectLabel: 'Keep StaffMember Type',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteStaffEmploymentType(staffEmploymentType);
      },
    });
  }

  confirmToggleStatus(staffEmploymentType: StaffEmploymentType) {
    const isDeactivating = !!staffEmploymentType.isActive;

    this.#confirmationService.confirm({
      message: `This will mark <strong>${staffEmploymentType.typeName}</strong> as ${
        isDeactivating ? 'Inactive' : 'Active'
      }.${isDeactivating ? ' It will no longer be selectable in staffMember type dropdowns.' : ''}`,
      header: isDeactivating ? 'Deactivate this staffMember type' : 'Activate this staffMember type',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: isDeactivating ? 'Deactivate' : 'Activate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.toggleStaffEmploymentTypeStatus(staffEmploymentType);
      },
    });
  }

  openActionMenu(staffEmploymentType: StaffEmploymentType, event: Event) {
    this.selectedRow.set(staffEmploymentType);
    this.actionMenu()?.toggle(event);
  }
}

