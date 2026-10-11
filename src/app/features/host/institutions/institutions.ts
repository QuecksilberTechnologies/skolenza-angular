import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Select } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { HOST_MODULE } from '@core/host-modules';
import { Common, InstitutionsApi } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore, LookupStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { GetInstitutionDeleteDependenciesRes, IInstitution, SettledSearchTerm } from '@shared/interfaces';

import { summariseInstitutionDeleteImpact } from './institution-delete-impact';
import { InstitutionDetail } from './institution-detail/institution-detail';
import { InstitutionsStore } from './institutions.store';

@Component({
  selector: 'app-institutions',
  imports: [
    ButtonModule,
    TableModule,
    CardModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    MenuModule,
    Select,
    HeadlessDrawer,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
    InstitutionDetail,
  ],
  providers: [InstitutionsStore],
  templateUrl: './institutions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Institutions {
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #router = inject(Router);
  readonly store = inject(InstitutionsStore);
  readonly #institutionsApi = inject(InstitutionsApi);
  readonly #destroyRef = inject(DestroyRef);

  /** Guards a second click while the impact read is still out. */
  readonly #isLoadingDependencies = signal(false);
  readonly countries = this.#lookupStore.countries;
  readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;

  // No "All" entry: it would sit in the list as a real option and suppress the placeholder, so
  // both selects would read "All" and never name what they filter. Clearing is `showClear`.
  readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  readonly verifiedOptions = [
    { status: 'Verified', value: true },
    { status: 'Not Verified', value: false },
  ];

  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  // Institutions and Modules have no catalog module of their own — they ride the
  // parent `Host` key until the backend models them separately.
  protected readonly moduleKey = HOST_MODULE.host;
  // Distinct from `moduleKey` above (the permission-catalog moduleName
  // `CurrentUserPermissionsStore` matches on) — this is `my-menu`'s own moduleCode, used only to
  // source the label the sidebar already shows for this leaf.
  protected readonly moduleCode = 'HOST_INSTITUTION_LIST';

  protected readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );
  /**
   * The widest the header ever gets. Columns drop out via CSS at narrow widths, but the
   * loading/empty row holds a single cell and browsers clamp an over-large colspan, so this
   * does not need to track what is currently visible.
   */
  protected readonly columnCount = 7;

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() ||
      this.store.statusFilter() !== null ||
      this.store.verifiedFilter() !== null,
  );

  /** Cursor for the action/context menus only. */
  protected readonly selectedRow = signal<IInstitution | null>(null);
  /**
   * The detail sheet needs its own subject. `selectedRow` cannot serve: Optimus installs a
   * permanent `hideCallback` on the context menu (Table.handleRowRightClick) that emits
   * `contextMenuSelectionChange` with `null` on every dismissal, which would blank the sheet the
   * instant the menu closed.
   */
  protected readonly detailInstitution = signal<IInstitution | null>(null);
  protected readonly isShowDetail = signal(false);
  protected readonly canAssignDevice = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Add'),
  );

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();
    // Assigning a device is the "Add" op on `institution-devices`, which rides the same `Host`
    // module key as everything else here - and only means something for a live institution.
    const canAssignDevice = this.canAssignDevice() && !!this.selectedRow()?.isActive;

    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => this.onViewDetails(this.selectedRow()!),
      },
      ...(canUpdate || canAssignDevice || canDelete ? [{ separator: true }] : []),
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => this.onEdit(this.selectedRow()!),
            },
            // Entitlements only mean something while the institution is live.
            ...(this.selectedRow()?.isActive
              ? [
                  {
                    label: 'Sync Plan Module',
                    icon: 'pi pi-sync',
                    command: () => this.onSyncEntitlements(this.selectedRow()!),
                  },
                ]
              : []),
            {
              label: this.selectedRow()?.isVerified
                ? 'Resend Verification Email'
                : 'Send Verification Email',
              icon: 'pi pi-envelope',
              disabled: this.store.sendingVerification().has(this.selectedRow()?.id ?? ''),
              command: () => this.onVerify(this.selectedRow()!),
            },
          ]
        : []),
      ...(canAssignDevice
        ? [
            {
              label: 'Device Assignment',
              icon: 'pi pi-desktop',
              command: () => this.onAssignDevice(this.selectedRow()!),
            },
          ]
        : []),
      ...((canUpdate || canAssignDevice) && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: 'Delete',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
              command: () => this.onDelete(this.selectedRow()!),
            },
          ]
        : []),
    ];
  });

  constructor() {
    effect(() => this.setPageHeaderInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Institutions',
      pageDescription: 'Manage institutions and their information',
      pageIcon: 'pi pi-building',
      isBreadcrumbShow: false,
    });
  }

  getCountry(countryId: number) {
    return this.countries().find((c) => c.id === countryId);
  }

  searchInstitutions(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onStatusChange(status: boolean | null) {
    this.store.setStatusFilter(status ?? null);
  }

  onVerifiedChange(verified: boolean | null) {
    this.store.setVerifiedFilter(verified ?? null);
  }

  onViewDetails(institution: IInstitution) {
    this.detailInstitution.set(institution);
    this.isShowDetail.set(true);
  }

  onDetailEdit() {
    const institution = this.detailInstitution();
    if (!institution) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.onEdit(institution);
  }

  onCreate() {
    this.#router.navigate(['/app/institutions/new']);
  }

  onEdit(institution: IInstitution) {
    this.#router.navigate(['/app/institutions', institution.id, 'edit']);
  }

  /**
   * Asks the backend what a delete would take with it before showing the confirmation.
   *
   * The impact read is best-effort on purpose: swagger publishes no response schema for it, so an
   * unrecognised payload or an outright failure falls back to the generic warning this dialog
   * always carried rather than blocking a delete that worked before.
   */
  onDelete(institution: IInstitution) {
    if (this.#isLoadingDependencies()) return;

    this.#isLoadingDependencies.set(true);

    this.#institutionsApi
      .getInstitutionDeleteDependencies(institution.id)
      .pipe(
        finalize(() => this.#isLoadingDependencies.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => this.#confirmDelete(institution, res.isSucceeded ? res.data : null),
        error: () => this.#confirmDelete(institution, null),
      });
  }

  #confirmDelete(institution: IInstitution, dependencies: GetInstitutionDeleteDependenciesRes['data']) {
    const impact = summariseInstitutionDeleteImpact(dependencies);

    this.#confirmationService.confirm({
      message:
        `Are you sure you want to delete <strong>${institution.companyName}</strong>? Every staff member, role and record under this institution goes with it.` +
        (impact ? `<br><br>This deletes: ${impact}.` : ''),
      header: 'Delete Institution',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Institution',
      rejectLabel: 'Keep Institution',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteInstitution(institution),
    });
  }

  onVerify(institution: IInstitution) {
    this.#confirmationService.confirm({
      message: institution.isVerified
        ? `<strong>${institution.companyName}</strong> is already verified. Send a new verification email anyway?`
        : `Are you sure you want to send a verification email to <strong>${institution.companyName}</strong>?`,
      header: institution.isVerified ? 'Resend Verification Email' : 'Send Verification Email',
      icon: 'pi pi-envelope !text-primary-500 !text-xl',
      acceptLabel: institution.isVerified ? 'Resend' : 'Send',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.sendVerificationEmail(institution),
    });
  }

  onSyncEntitlements(institution: IInstitution) {
    this.store.syncPlanEntitlements(institution);
  }

  onAssignDevice(institution: IInstitution) {
    this.#router.navigate(['/app/institution-devices/new'], {
      queryParams: { institutionId: institution.id },
    });
  }

  toggleActive(institution: IInstitution) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to ${institution.isActive ? 'deactivate' : 'activate'} <strong>${institution.companyName}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(institution),
    });
  }
}
