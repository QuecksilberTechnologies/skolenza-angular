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
import { forkJoin, map, Observable, of, Subscription } from 'rxjs';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  ListSkeleton,
  type RouteTab,
  RouteTabs,
  StatusBadge,
  TableActionButton,
  TableEmptyMessage,
} from '@shared/components';
import {
  AcademicMaster,
  AcademicMasterType,
  ApiDataResponse,
  ClassTeacherAssignment,
  StaffAcademicProfile,
  StaffTeachingAssignment,
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

/** Master lists each tab's add/edit dialog needs for its pickers, fetched when it opens. */
const MASTER_DIALOG_REFERENCES: Record<AcademicMasterType, AcademicMasterType[]> = {
  [AcademicMasterType.Session]: [],
  [AcademicMasterType.Programme]: [],
  [AcademicMasterType.Group]: [AcademicMasterType.Session, AcademicMasterType.Programme],
  [AcademicMasterType.Section]: [AcademicMasterType.Group],
  [AcademicMasterType.Subject]: [],
  [AcademicMasterType.CourseOffering]: [
    AcademicMasterType.Session,
    AcademicMasterType.Group,
    AcademicMasterType.Subject,
  ],
};

type MasterLists = Partial<Record<AcademicMasterType, AcademicMaster[]>>;

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
    TableEmptyMessage,
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
  readonly academicProfile = signal<StaffAcademicProfile>(EMPTY_PROFILE);
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
    const type = this.selectedTab();
    const header = `${master ? 'Edit' : 'Add'} ${this.noun().singular}`;
    this.#withReferences(this.#loadMasters(MASTER_DIALOG_REFERENCES[type]), (lists) => {
      const data: AcademicMasterDialogData = {
        type,
        master,
        sessions: lists[AcademicMasterType.Session] ?? [],
        programmes: lists[AcademicMasterType.Programme] ?? [],
        groups: lists[AcademicMasterType.Group] ?? [],
        subjects: lists[AcademicMasterType.Subject] ?? [],
      };
      this.#openDialog(AcademicMasterDialog, data, header, '40rem', () => this.loadSelected());
    });
  }

  openTeachingDialog(assignment?: StaffTeachingAssignment): void {
    const references = forkJoin({
      lists: this.#loadMasters([AcademicMasterType.CourseOffering, AcademicMasterType.Section]),
      assignmentTypes: this.#api
        .getTeachingAssignmentTypes()
        .pipe(map((response) => (response.isSucceeded ? response.data : []))),
    });
    this.#withReferences(references, ({ lists, assignmentTypes }) => {
      const data: TeachingAssignmentDialogData = {
        staffMemberId: this.staffMemberId() ?? '',
        assignment,
        offerings: lists[AcademicMasterType.CourseOffering] ?? [],
        sections: lists[AcademicMasterType.Section] ?? [],
        assignmentTypes,
      };
      this.#openDialog(
        TeachingAssignmentDialog,
        data,
        `${assignment ? 'Edit' : 'Add'} Teaching Assignment`,
        '44rem',
        () => this.loadProfile(),
      );
    });
  }

  openClassTeacherDialog(assignment?: ClassTeacherAssignment): void {
    this.#withReferences(this.#loadMasters([AcademicMasterType.Section]), (lists) => {
      const data: ClassTeacherDialogData = {
        staffMemberId: this.staffMemberId() ?? '',
        assignment,
        sections: lists[AcademicMasterType.Section] ?? [],
      };
      this.#openDialog(
        ClassTeacherDialog,
        data,
        `${assignment ? 'Edit' : 'Add'} Class Teacher Responsibility`,
        '36rem',
        () => this.loadProfile(),
      );
    });
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

  /** `total` is the tab's unfiltered row count; above zero means the status filter hid every row. */
  emptyMessage(total: number): string {
    const plural = this.noun().plural.toLowerCase();
    return total ? `No ${this.statusFilter} ${plural}` : `No ${plural} yet`;
  }

  emptyDetail(total: number): string {
    const plural = this.noun().plural.toLowerCase();
    return total
      ? `Change the status filter to see all ${plural}.`
      : `${plural[0].toUpperCase()}${plural.slice(1)} appear here once added.`;
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

  /** Fetches only the given master lists, keyed by type. */
  #loadMasters(types: AcademicMasterType[]): Observable<MasterLists> {
    if (!types.length) return of({});
    const requests = Object.fromEntries(
      types.map((type) => [
        type,
        this.#api
          // Inactive rows too: a dialog keeps an already linked inactive parent visible but locked.
          .getMasters(type, false)
          .pipe(map((response) => (response.isSucceeded ? response.data : []))),
      ]),
    );
    return forkJoin(requests) as Observable<MasterLists>;
  }

  /** Waits for a dialog's picker lists, then opens it; a failed fetch shows the error instead. */
  #withReferences<T>(references: Observable<T>, open: (value: T) => void): void {
    references.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: open,
      error: (error) => this.#common.showMessage(error.message, 'error'),
    });
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
