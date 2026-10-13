import { A11yModule } from '@angular/cdk/a11y';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { DatePipe } from '@angular/common';
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
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { Drawer } from '@openng/optimus-ui/drawer';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { OverlayBadgeModule } from '@openng/optimus-ui/overlaybadge';
import { SelectModule } from '@openng/optimus-ui/select';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { AuthApi, Common, StaffMembersApi } from '@core/services';
import { FeaturePageStore, LookupStore } from '@core/stores';
import { AssetStatsLoader } from '@shared/components/asset/asset-stats-loader/asset-stats-loader';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import StaffMemberFilter from '@shared/components/staff-member/staff-member-filter/staff-member-filter';
import { VerificationSettings } from '@shared/components/staff-member/verification-settings/verification-settings';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { RepositionOnResize } from '@shared/directives';
import {
  BulkImportDialogData,
  IStaffMember,
  IStaffMemberFilter,
  LoginInfo,
  ResendCredentialReq,
  Role,
  SummaryStaffMemberInfo,
  UserRole,
} from '@shared/interfaces';
import {
  GetCelebrationBadgesPipe,
  GetNewJoinerBadgePipe,
  GetProgressTonePipe,
} from '@shared/pipes';
import { countryFlagUrl } from '@shared/utilities/country-flag';
import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { CARD_OVERLAY_POSITIONS, closeOverlayOnScroll } from '@shared/utilities/overlay';

import { AvatarPopup } from './avatar-popup/avatar-popup';
import { PROFILE_SECTIONS } from './staff-member-action-menu';
import { staffMemberBulkImportAdapter, staffMemberImportDisplay } from './staff-member-bulk-import';
import { staffMemberImportFields } from './staff-member-import-fields';
import { StaffMemberResetPasswordDialog } from './staff-member-reset-password-dialog/staff-member-reset-password-dialog';
import {
  StaffMemberRoleCell,
  resolveRoleDisplayName,
} from './staff-member-role-cell/staff-member-role-cell';
import StaffMemberStats from './staff-member-stats/staff-member-stats';
import { StaffMembersStore } from './staff-members.store';

/** StaffMember accounts see the grid read-only. */

/** This page's leaf in `GET /Navigation/my-menu`, which publishes the operations it grants. */
const MODULE_CODE = 'STAFF_DIRECTORY';

/**
 * `Reset Password` moved from its own `EMP_PASSWORD_MANAGEMENT` leaf onto `STAFF_DIRECTORY` (read live
 * 2026-09-25). Both are named so a session still served the old shape keeps the action.
 */
const PASSWORD_MODULE_CODE = ['STAFF_DIRECTORY', 'EMP_PASSWORD_MANAGEMENT'] as const;

@Component({
  selector: 'app-staff-members',
  imports: [
    UserAvatar,
    ButtonModule,
    TableModule,
    CardModule,
    TieredMenu,
    ContextMenuModule,
    ConfirmDialogModule,
    SplitButtonModule,
    TooltipModule,
    ClipboardModule,
    SelectModule,
    GetProgressTonePipe,
    GetNewJoinerBadgePipe,
    GetCelebrationBadgesPipe,
    DatePipe,
    StaffMemberStats,
    AssetStatsLoader,
    A11yModule,
    OverlayModule,
    RepositionOnResize,
    AvatarPopup,
    StaffMemberRoleCell,
    OverlayBadgeModule,
    Drawer,
    StaffMemberFilter,
    TableInlineFilters,
    TableSearchFilter,
    TableSearchInput,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
    VerificationSettings,
    HeadlessDrawer,
  ],
  providers: [StaffMembersStore],
  templateUrl: './staff-members.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMembers implements OnInit {
  readonly store = inject(StaffMembersStore);
  readonly #authApi = inject(AuthApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly #clipboard = inject(Clipboard);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #staffMembersApi = inject(StaffMembersApi);

  readonly table = viewChild<Table>('dt');
  readonly verificationSettings = viewChild(VerificationSettings);
  /** The row whose profile-summary card is open — only one at a time. */
  readonly openSummaryId = signal<string | null>(null);
  protected readonly cardOverlayPositions = CARD_OVERLAY_POSITIONS;
  protected readonly overlayScrollStrategy = inject(Overlay).scrollStrategies.noop();

  readonly departmentOptions = this.#lookupStore.departmentOptions;
  readonly staffEmploymentTypeOptions = this.#lookupStore.staffEmploymentTypes;
  readonly isLoadingStaffEmploymentTypes = this.#lookupStore.isLoadingStaffEmploymentTypes;
  readonly isLoadingDepartments = this.#lookupStore.isLoadingDepartmentOptions;

  readonly loginInfo = signal<LoginInfo | null>(null);
  readonly userStaffMemberId = computed(() => this.loginInfo()?.user?.staffMemberId ?? '');
  readonly canManageStaffMembers = computed(
    () =>
      (this.loginInfo()?.user?.primaryRole?.roleTypeId ?? InstitutionRoleTypeId.StaffMember) !==
      InstitutionRoleTypeId.StaffMember,
  );

  /**
   * What the import dialog's fix editor renders per column. Built here rather than inside
   * `openBulkImport` because it needs an injection context, and holds its own lazy lookups — none
   * of which are fetched until the editor is actually opened.
   */
  readonly #importFields = staffMemberImportFields(() => this.userStaffMemberId());

  /**
   * Permissions may only ever narrow what the role check already allows.
   *
   * The captured institution payload publishes all nine `STAFF_DIRECTORY` operations to an ordinary
   * `InstitutionStaffMember` session, so the tree on its own would hand a plain staffMember exactly the write
   * actions `canManageStaffMembers` exists to withhold. Until an staffMember-role payload says otherwise,
   * both have to agree.
   */
  #granted(operation: string): boolean {
    return (
      this.canManageStaffMembers() &&
      this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, operation)
    );
  }

  readonly canAdd = computed(() => this.#granted('Add'));

  /** Import is an `Add` against the same page, so it rides the same grant the button does. */
  protected readonly staffMemberSplitButtonItems: MenuItem[] = [
    {
      label: 'Import StaffMembers',
      icon: 'pi pi-upload',
      command: () => this.openBulkImport(),
    },
  ];

  readonly canUpdate = computed(() => this.#granted('Update'));
  readonly canAssignRole = computed(() => this.#granted('Assign'));
  readonly canRemove = computed(() => this.#granted('Remove'));
  readonly canResendCredentials = computed(() => this.#granted('Resend Credentials'));

  /** Same narrowing rule as `#granted`, against the page that owns the operation. */
  readonly canResetPassword = computed(
    () =>
      this.canManageStaffMembers() &&
      this.#featurePageStore.canPerformOrUnknown(PASSWORD_MODULE_CODE, 'Reset Password'),
  );

  readonly canUseRowActions = computed(
    () =>
      this.canUpdate() ||
      this.canRemove() ||
      this.canResendCredentials() ||
      this.canResetPassword(),
  );

  /** Rows belonging to someone else — the only ones that can reveal field-level masking. */
  readonly #otherRows = computed(() =>
    this.store
      .staffMembers()
      .filter((staffMember) => staffMember.staffMemberId !== this.userStaffMemberId()),
  );

  /**
   * Whether a column carries anything this session is allowed to see.
   *
   * The API masks per field, not per column: an account without access to other staffMembers' details
   * gets those fields back empty on every row but its own. So a column whose only value belongs to
   * the current user is one this session cannot read, and rendering it just prints a column of
   * blanks next to a single populated cell.
   *
   * Falls back to "any row at all" when the list holds nothing but the user's own record: with no
   * other row to compare against, masking is undetectable, and guessing would hide the column from
   * an admin who simply filtered down to themselves.
   */
  #readable(hasValue: (staffMember: IStaffMember) => boolean): boolean {
    const others = this.#otherRows();
    return others.length ? others.some(hasValue) : this.store.staffMembers().some(hasValue);
  }

  readonly showStaffMemberCode = computed(() =>
    this.#readable((staffMember) => !!staffMember.employementCode?.trim()),
  );

  readonly showCountry = computed(() =>
    this.#readable(
      (staffMember) => !!staffMember.countryCode?.trim() || !!staffMember.nationality?.trim(),
    ),
  );

  protected countryCode(staffMember: IStaffMember): string {
    return staffMember.countryCode?.trim().toUpperCase() || '-';
  }

  protected countryFlag(staffMember: IStaffMember): string | null {
    const code = this.countryCode(staffMember);
    return /^[A-Z]{2}$/.test(code) ? countryFlagUrl(code) : null;
  }

  /**
   * The role cell is also where roles are *assigned*, so an empty column has to stay when this
   * session can assign one. Otherwise the first role on a institution where nobody has one yet could
   * never be given from this page — the column would hide the only control that fills it.
   */
  readonly showRole = computed(
    () =>
      this.canAssignRole() ||
      this.#readable((staffMember) => !!resolveRoleDisplayName(staffMember, this.cachedRoles())),
  );

  readonly showProfileCompletion = computed(() =>
    this.#readable((staffMember) => !!staffMember.completionPercentage),
  );

  readonly showJoiningDate = computed(() =>
    this.#readable((staffMember) => !!staffMember.dateOfOnBoarding),
  );

  /** The loading and empty rows must span the same columns the header renders. */
  readonly columnCount = computed(
    () =>
      4 +
      (this.showStaffMemberCode() ? 1 : 0) +
      (this.showCountry() ? 1 : 0) +
      (this.showRole() ? 1 : 0) +
      (this.showProfileCompletion() ? 1 : 0) +
      (this.showJoiningDate() ? 1 : 0) +
      (this.canUseRowActions() ? 1 : 0),
  );

  /** Role options the first opened popup fetched, reused by every other row. */
  readonly cachedRoles = signal<Role[]>([]);
  /** The staffMember whose profile-completion sheet is open. */
  readonly verificationStaffMember = signal<IStaffMember | null>(null);
  /** `p-drawer` does not restore focus to whatever opened it. */
  #verificationReturnFocusTo: HTMLElement | null = null;
  protected readonly selectedRow = signal<IStaffMember | null>(null);
  protected readonly actionMenuItems = computed<MenuItem[]>(() =>
    this.buildActionMenuItems(this.selectedRow()?.staffMemberId === this.userStaffMemberId()),
  );
  protected isShowFilter = false;

  constructor() {
    effect(() => this.setPageHeaderInfo());
    closeOverlayOnScroll(
      () => this.closeSummary(),
      () => this.openSummaryId() !== null,
    );
  }

  async ngOnInit() {
    this.loginInfo.set(await this.#commonService.getLoginInfo());
    this.store.loadStatistics();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(MODULE_CODE) ?? 'StaffMembers',
      pageDescription: 'Manage staffMembers and their information',
      pageIcon: 'pi pi-users',
    });
  }

  private buildActionMenuItems(isOwnRecord: boolean): MenuItem[] {
    return [
      {
        label: 'View Profile',
        icon: 'pi pi-user',
        items: PROFILE_SECTIONS.map(({ label, icon, route }) => ({
          label,
          icon,
          routerLink: route,
          queryParams: () => ({
            staffMemberId: this.selectedRow()?.staffMemberId,
            countryId: this.selectedRow()?.countryId,
          }),
        })),
      },
      { separator: true },
      {
        label: 'Academic Responsibilities',
        icon: 'pi pi-book',
        command: () => this.openAcademicAssignments(this.selectedRow()!),
      },
      {
        label: 'Assign Project <br/><span class="text-xs">(coming soon)</span>',
        icon: 'pi pi-briefcase',
        disabled: true,
        command: () => this.createStaffMember(this.selectedRow() ?? undefined),
      },
      ...(this.canResendCredentials()
        ? [
            {
              label: 'Resend Credentials',
              icon: 'pi pi-envelope',
              command: () => this.resendCredentials(this.selectedRow()!),
            },
          ]
        : []),
      ...(isOwnRecord || !this.canResetPassword()
        ? []
        : [
            {
              label: 'Reset Password',
              icon: 'pi pi-key',
              command: () => this.resetPassword(this.selectedRow()!),
            },
          ]),
      ...(isOwnRecord || !this.canRemove()
        ? []
        : [
            { separator: true },
            {
              label: 'Remove StaffMember',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
              command: () => this.confirmRemoveStaffMember(this.selectedRow() ?? undefined),
            },
          ]),
    ];
  }

  onDepartmentChange(departmentId: number) {
    this.store.applyFilters({
      ...this.store.appliedFilters(),
      department: departmentId,
    });
    this.store.loadDesignations(Number(departmentId));
  }

  onDesignationChange(designationId: number) {
    this.store.applyFilters({
      ...this.store.appliedFilters(),
      designation: designationId,
    });
  }

  onTypeChange(typeId: number) {
    this.store.applyFilters({
      ...this.store.appliedFilters(),
      staffEmploymentType: typeId,
    });
  }

  onFilterApplied(filters: IStaffMemberFilter | null) {
    this.isShowFilter = false;
    this.store.applyFilters(filters);
  }

  openFilterDrawer() {
    this.isShowFilter = true;
  }

  loadStaffMembers(event: TableLazyLoadEvent) {
    this.store.loadStaffMembers(event);
  }

  searchStaffMembers(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }

  createStaffMember(staffMember?: IStaffMember) {
    const route = staffMember?.staffMemberId
      ? ['/app/staff', staffMember.staffMemberId, 'edit']
      : ['/app/staff', 'new'];
    void this.#router.navigate(route, {
      state: { staffMemberBasic: staffMember },
      queryParams: staffMember?.staffMemberId
        ? { staffMemberId: staffMember.staffMemberId }
        : undefined,
    });
  }

  openProfessionalStructure(): void {
    void this.#router.navigate(['/app/staff/professional-structure']);
  }

  openAcademicStructure(): void {
    void this.#router.navigate(['/app/staff/academic-structure']);
  }

  openCurriculumDelivery(): void {
    void this.#router.navigate(['/app/staff/curriculum-delivery']);
  }

  openAcademicAssignments(staffMember: IStaffMember): void {
    void this.#router.navigate(['/app/staff', staffMember.staffMemberId, 'academic-assignments']);
  }

  openBulkImport() {
    // The dialog owns the flow; StaffMembers owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: staffMemberBulkImportAdapter(this.#staffMembersApi),
      display: staffMemberImportDisplay(this.#importFields),
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import StaffMembers',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the list is refetched rather than
    // left showing the staffMembers from before the import. Imported rows land on the first page.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (!imported) return;

      const table = this.table();
      if (table) {
        table.first = 0;
      }
      this.store.loadStaffMembers({ first: 0, rows: this.store.pageSize() });
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  /** No grid reload on close - a new password changes nothing the table renders. */
  resetPassword(staffMember: IStaffMember) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberResetPasswordDialog, {
      header: 'Reset Password',
      style: { width: '90vw', maxWidth: '32rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMember },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmRemoveStaffMember(staffMember?: IStaffMember) {
    this.#confirmationService.confirm({
      message: `This will permanently remove the <strong>${staffMember?.firstName} ${staffMember?.lastName}</strong> and all its contents. This action cannot be undone.`,
      header: 'Remove this staffMember',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Remove StaffMember',
      rejectLabel: 'Keep StaffMember',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteStaffMember(staffMember),
    });
  }

  confirmStatusChange(staffMember: IStaffMember) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${staffMember?.firstName} ${staffMember?.lastName}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleStaffMemberStatus(staffMember),
    });
  }

  resendCredentials(staffMember: IStaffMember) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to resend login credentials to <strong>${staffMember.firstName} ${staffMember.lastName}</strong>?`,
      header: 'Resend Credentials',
      icon: 'pi pi-envelope !text-primary-500 !text-xl',
      acceptLabel: 'Resend',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.sendCredentials(staffMember),
    });
  }

  private sendCredentials(staffMember: IStaffMember) {
    const body: ResendCredentialReq = {
      userLoginId: staffMember.officialEmail,
    };

    this.#authApi
      .resendCredential(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
            return;
          }

          this.#clipboard.copy(res.data.urlLink);
          this.#commonService.showMessage(
            'Credentials resent successfully. Temporary password copied to clipboard.',
            'success',
          );
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  viewRolePermission(staffMember: IStaffMember) {
    this.#router.navigate(['/app/staff-members/permissions', staffMember.staffMemberId]);
  }

  copyStaffMemberCode(value: string) {
    this.#clipboard.copy(value);
    this.#commonService.showMessage('StaffMember code copied. You can now paste it.', 'success');
  }

  onRolesLoaded(roles: Role[]) {
    this.cachedRoles.set(roles);
  }

  onRolesAssigned(staffMember: IStaffMember, userRoles: UserRole[]) {
    this.store.assignRoles(staffMember, userRoles);
  }

  toggleSummary(staffMemberId: string) {
    this.openSummaryId.update((current) => (current === staffMemberId ? null : staffMemberId));
  }

  closeSummary() {
    this.openSummaryId.set(null);
  }

  /**
   * The trigger lives outside the overlay, so CDK reports a click on it as an outside click -
   * before the trigger's own handler runs. Ignoring those leaves the toggle in charge.
   */
  onSummaryOutsideClick(event: MouseEvent, origin: HTMLElement) {
    if (!origin.contains(event.target as Node)) this.closeSummary();
  }

  onSummaryLoaded(staffMemberId: string, summary: SummaryStaffMemberInfo) {
    this.store.cacheSummary(staffMemberId, summary);
  }

  openVerificationSheet(staffMember: IStaffMember, trigger: HTMLElement) {
    this.#verificationReturnFocusTo = trigger;
    this.verificationStaffMember.set(staffMember);
  }

  requestVerificationPopupClose() {
    const settings = this.verificationSettings();
    if (settings) {
      settings.requestClose();
      return;
    }

    this.finishVerificationPopupClose();
  }

  finishVerificationPopupClose() {
    this.verificationStaffMember.set(null);
    this.#verificationReturnFocusTo?.focus();
    this.#verificationReturnFocusTo = null;
  }
}
