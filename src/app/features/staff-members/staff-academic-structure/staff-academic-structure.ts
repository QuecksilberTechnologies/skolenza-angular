import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  Type,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { TieredMenu, TieredMenuModule } from '@openng/optimus-ui/tieredmenu';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { Observable, Subscription } from 'rxjs';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  ListSkeleton,
  type RouteTab,
  RouteTabs,
  StatusBadge,
  TableActionButton,
} from '@shared/components';
import {
  AcademicMaster,
  AcademicMasterType,
  ApiDataResponse,
  ClassTeacherAssignment,
  StaffAcademicProfile,
  StaffTeachingAssignment,
  TeachingAssignmentTypeOption,
} from '@shared/interfaces';
import { openManageDialog } from '@shared/utilities/manage-dialog';
import { pendingCounter } from '@shared/utilities/pending-counter';
import { confirmStatusChange, statusRowActions } from '@shared/utilities/status-change';

import {
  AcademicMasterDialog,
  AcademicMasterDialogData,
} from './academic-master-dialog/academic-master-dialog';
import {
  ClassTeacherDialog,
  ClassTeacherDialogData,
} from './class-teacher-dialog/class-teacher-dialog';
import {
  TeachingAssignmentDialog,
  TeachingAssignmentDialogData,
} from './teaching-assignment-dialog/teaching-assignment-dialog';

/** URL segment under `/app/staff/academic-structure/` for each tab. */
export const ACADEMIC_TAB_ROUTES: readonly { route: string; tab: AcademicMasterType }[] = [
  { route: 'sessions', tab: AcademicMasterType.Session },
  { route: 'programmes', tab: AcademicMasterType.Programme },
  { route: 'groups', tab: AcademicMasterType.Group },
  { route: 'sections', tab: AcademicMasterType.Section },
  { route: 'subjects', tab: AcademicMasterType.Subject },
  { route: 'course-offerings', tab: AcademicMasterType.CourseOffering },
];

/** Singular and plural record names per tab, for headings, tab labels and empty states. */
const TAB_NOUNS: Record<AcademicMasterType, { singular: string; plural: string }> = {
  [AcademicMasterType.Session]: { singular: 'Session', plural: 'Sessions' },
  [AcademicMasterType.Programme]: { singular: 'Programme', plural: 'Programmes' },
  [AcademicMasterType.Group]: { singular: 'Group', plural: 'Groups' },
  [AcademicMasterType.Section]: { singular: 'Section', plural: 'Sections' },
  [AcademicMasterType.Subject]: { singular: 'Subject', plural: 'Subjects' },
  [AcademicMasterType.CourseOffering]: { singular: 'Course Offering', plural: 'Course Offerings' },
};

/** Academic-structure endpoints sit under the Staff Directory permission boundary (see module-operation-routes.ts). */
const MODULE_CODE = 'STAFF_DIRECTORY';

const EMPTY_PROFILE: StaffAcademicProfile = {
  teachingAssignments: [],
  classTeacherAssignments: [],
};

@Component({
  selector: 'app-staff-academic-structure',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    FormsModule,
    ListSkeleton,
    RouteTabs,
    SelectModule,
    StatusBadge,
    TableActionButton,
    TieredMenuModule,
    TooltipModule,
  ],
  templateUrl: './staff-academic-structure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffAcademicStructure implements OnInit {
  readonly #api = inject(StaffAcademicStructureApi);
  readonly #common = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly tabs: RouteTab<AcademicMasterType>[] = ACADEMIC_TAB_ROUTES.map((item) => ({
    id: item.tab,
    route: item.route,
    label: TAB_NOUNS[item.tab].plural,
  }));
  readonly selectedTab = signal(AcademicMasterType.Session);
  readonly records = signal<AcademicMaster[]>([]);
  readonly sessions = signal<AcademicMaster[]>([]);
  readonly programmes = signal<AcademicMaster[]>([]);
  readonly groups = signal<AcademicMaster[]>([]);
  readonly sections = signal<AcademicMaster[]>([]);
  readonly subjects = signal<AcademicMaster[]>([]);
  readonly offerings = signal<AcademicMaster[]>([]);
  readonly academicProfile = signal<StaffAcademicProfile>(EMPTY_PROFILE);
  readonly assignmentTypes = signal<TeachingAssignmentTypeOption[]>([]);
  readonly staffMemberId = signal<string | null>(null);
  readonly #listLoad = pendingCounter();
  #selectedLoad?: Subscription;
  readonly loading = this.#listLoad.active;
  readonly statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  readonly noun = computed(() => TAB_NOUNS[this.selectedTab()]);
  readonly canAdd = computed(() => this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Add'));
  readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Update'),
  );
  /** Deactivating calls a DELETE endpoint (a soft deactivate); activating is an Update. */
  readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Delete'),
  );
  readonly rowMenuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    const staffMemberId = this.#route.snapshot.paramMap.get('staffMemberId');
    this.staffMemberId.set(staffMemberId);
    this.#common.setPageHeaderInfo({
      pageTitle: staffMemberId ? 'Staff Academic Assignments' : 'Academic Structure',
      pageDescription: staffMemberId
        ? 'Manage subject teaching and class teacher responsibilities'
        : 'Manage sessions, programmes, groups, sections, subjects and course offerings',
      pageIcon: 'pi pi-book',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Staff Directory', routerLink: '/app/staff' },
      { label: staffMemberId ? 'Academic Assignments' : 'Academic Structure' },
    ]);
    this.loadReferences();
    if (staffMemberId) {
      this.loadProfile();
      return;
    }
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const match = ACADEMIC_TAB_ROUTES.find((item) => item.route === params.get('tab'));
      if (!match) {
        void this.#router.navigate(['..', ACADEMIC_TAB_ROUTES[0].route], {
          relativeTo: this.#route,
          replaceUrl: true,
        });
        return;
      }
      this.selectTab(match.tab);
    });
  }

  selectTab(type: AcademicMasterType): void {
    this.selectedTab.set(type);
    // Every tab shares `records`; clear it so the next tab shows a loading state, not stale rows.
    this.records.set([]);
    this.loadSelected();
  }

  openMasterDialog(master?: AcademicMaster): void {
    const data: AcademicMasterDialogData = {
      type: this.selectedTab(),
      master,
      sessions: this.sessions(),
      programmes: this.programmes(),
      groups: this.groups(),
      subjects: this.subjects(),
    };
    this.#openDialog(
      AcademicMasterDialog,
      data,
      `${master ? 'Edit' : 'Add'} ${this.noun().singular}`,
      '40rem',
      () => {
        // Every master type feeds another tab's pickers.
        this.loadReferences();
        this.loadSelected();
      },
    );
  }

  openTeachingDialog(assignment?: StaffTeachingAssignment): void {
    const data: TeachingAssignmentDialogData = {
      staffMemberId: this.staffMemberId() ?? '',
      assignment,
      offerings: this.offerings(),
      sections: this.sections(),
      assignmentTypes: this.assignmentTypes(),
    };
    this.#openDialog(
      TeachingAssignmentDialog,
      data,
      `${assignment ? 'Edit' : 'Add'} Teaching Assignment`,
      '44rem',
      () => this.loadProfile(),
    );
  }

  openClassTeacherDialog(assignment?: ClassTeacherAssignment): void {
    const data: ClassTeacherDialogData = {
      staffMemberId: this.staffMemberId() ?? '',
      assignment,
      sections: this.sections(),
    };
    this.#openDialog(
      ClassTeacherDialog,
      data,
      `${assignment ? 'Edit' : 'Add'} Class Teacher Responsibility`,
      '36rem',
      () => this.loadProfile(),
    );
  }

  // The backend DELETE endpoints soft-deactivate (isActive = false); nothing is hard-deleted.
  confirmMasterActive(item: AcademicMaster): void {
    this.confirmStatusChange(item.name, item.isActive, () =>
      item.isActive
        ? this.#runStatusChange(this.#api.deleteMaster(this.selectedTab(), item.id), true)
        : this.#runStatusChange(
            this.#api.saveMaster(this.selectedTab(), { ...item, isActive: true }),
            true,
          ),
    );
  }

  confirmTeachingActive(item: StaffTeachingAssignment): void {
    this.confirmStatusChange(`${item.subjectName} - ${item.classSectionName}`, item.isActive, () =>
      item.isActive
        ? this.#runStatusChange(this.#api.deleteTeachingAssignment(item.id), false)
        : this.#runStatusChange(
            this.#api.saveTeachingAssignment({
              id: item.id,
              staffMemberId: this.staffMemberId() ?? '',
              courseOfferingId: item.courseOfferingId,
              classSectionId: item.classSectionId,
              assignmentType: item.assignmentType,
              contributionPercent: item.contributionPercent,
              effectiveFrom: item.effectiveFrom,
              effectiveTo: item.effectiveTo,
              isPrimary: item.isPrimary,
              isActive: true,
            }),
            false,
          ),
    );
  }

  confirmClassTeacherActive(item: ClassTeacherAssignment): void {
    this.confirmStatusChange(
      `${item.academicGroupName} - ${item.classSectionName}`,
      item.isActive,
      () =>
        item.isActive
          ? this.#runStatusChange(this.#api.deleteClassTeacherAssignment(item.id), false)
          : this.#runStatusChange(
              this.#api.saveClassTeacherAssignment({
                id: item.id,
                staffMemberId: this.staffMemberId() ?? '',
                classSectionId: item.classSectionId,
                effectiveFrom: item.effectiveFrom,
                effectiveTo: item.effectiveTo,
                isPrimary: item.isPrimary,
                isActive: true,
              }),
              false,
            ),
    );
  }

  /** A row shows its action menu only when at least one action in it is permitted. */
  hasRowActions(isActive: boolean): boolean {
    return this.canUpdate() || (isActive && this.canDelete());
  }

  openRowMenu(menu: TieredMenu, event: Event, items: MenuItem[]): void {
    this.rowMenuItems.set(items);
    menu.toggle(event);
  }

  masterActions(item: AcademicMaster): MenuItem[] {
    return this.rowActions(
      item.isActive,
      () => this.openMasterDialog(item),
      () => this.confirmMasterActive(item),
    );
  }

  teachingActions(item: StaffTeachingAssignment): MenuItem[] {
    return this.rowActions(
      item.isActive,
      () => this.openTeachingDialog(item),
      () => this.confirmTeachingActive(item),
    );
  }

  classTeacherActions(item: ClassTeacherAssignment): MenuItem[] {
    return this.rowActions(
      item.isActive,
      () => this.openClassTeacherDialog(item),
      () => this.confirmClassTeacherActive(item),
    );
  }

  emptyMessage(total: number): string {
    const plural = this.noun().plural.toLowerCase();
    if (total) return `No ${this.statusFilter} ${plural}.`;
    return this.canAdd()
      ? `No ${plural} yet. Use Add ${this.noun().singular} to create one.`
      : `No ${plural} yet.`;
  }

  visibleRecords(): AcademicMaster[] {
    return this.statusFilter === 'all'
      ? this.records()
      : this.records().filter((item) => item.isActive === (this.statusFilter === 'active'));
  }

  private loadSelected(): void {
    // Cancel the previous tab's request so a late response cannot fill this tab.
    this.#selectedLoad?.unsubscribe();
    this.#selectedLoad = this.#api
      .getMasters(this.selectedTab(), false)
      .pipe(this.#listLoad.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.records.set(response.isSucceeded ? response.data : []),
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  private loadReferences(): void {
    this.#api
      .getTeachingAssignmentTypes()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.assignmentTypes.set(response.isSucceeded ? response.data : []));
    const targets: [AcademicMasterType, (rows: AcademicMaster[]) => void][] = [
      [AcademicMasterType.Session, (rows) => this.sessions.set(rows)],
      [AcademicMasterType.Programme, (rows) => this.programmes.set(rows)],
      [AcademicMasterType.Group, (rows) => this.groups.set(rows)],
      [AcademicMasterType.Section, (rows) => this.sections.set(rows)],
      [AcademicMasterType.Subject, (rows) => this.subjects.set(rows)],
      [AcademicMasterType.CourseOffering, (rows) => this.offerings.set(rows)],
    ];
    for (const [type, assign] of targets) {
      this.#api
        // Inactive rows too: a dialog keeps an already linked inactive parent visible but locked.
        .getMasters(type, false)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe((response) => assign(response.isSucceeded ? response.data : []));
    }
  }

  private loadProfile(): void {
    const id = this.staffMemberId();
    if (!id) return;
    this.#api
      .getStaffProfile(id)
      .pipe(this.#listLoad.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) =>
        this.academicProfile.set(response.isSucceeded ? response.data : EMPTY_PROFILE),
      );
  }

  private rowActions(isActive: boolean, edit: () => void, toggleActive: () => void): MenuItem[] {
    return statusRowActions({
      isActive,
      canEdit: this.canUpdate(),
      canDeactivate: this.canDelete(),
      canActivate: this.canUpdate(),
      edit,
      toggleActive,
    });
  }

  /** Runs an activate or deactivate call, then refreshes the master tab or the staff profile. */
  #runStatusChange(request: Observable<ApiDataResponse<unknown>>, isMaster: boolean): void {
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: (response) => {
        this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
        if (!response.isSucceeded) return;
        if (isMaster) {
          this.loadReferences();
          this.loadSelected();
        } else {
          this.loadProfile();
        }
      },
      error: (error) => this.#common.showMessage(error.message, 'error'),
    });
  }

  /** Opens a manage dialog and runs `onSaved` when it closes after a successful save. */
  #openDialog(
    component: Type<unknown>,
    data: unknown,
    header: string,
    maxWidth: string,
    onSaved: () => void,
  ): void {
    openManageDialog(
      this.#dialogService,
      this.#destroyRef,
      { component, header, maxWidth, data },
      onSaved,
    );
  }

  private confirmStatusChange(name: string, isActive: boolean, accept: () => void): void {
    confirmStatusChange(this.#confirmationService, name, isActive, accept);
  }
}
