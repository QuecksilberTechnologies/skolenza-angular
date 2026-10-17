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
import { map, Observable, Subscription } from 'rxjs';

import { Common, StaffAcademicStructureApi, StaffCurriculumDeliveryApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  ListSkeleton,
  type RouteTab,
  RouteTabs,
  StatusBadge,
  type StatusTone,
  TableActionButton,
} from '@shared/components';
import {
  AcademicMaster,
  AcademicMasterType,
  AcademicWorkflowStatusOption,
  CurriculumFramework,
  CurriculumTopic,
  CurriculumUnit,
  LessonDelivery,
  LessonPlan,
  SyllabusProgress,
} from '@shared/interfaces';
import { escapeHtml } from '@shared/utilities/escape-html';
import { openManageDialog } from '@shared/utilities/manage-dialog';
import { pendingCounter } from '@shared/utilities/pending-counter';

import {
  CurriculumFrameworkDialog,
  CurriculumFrameworkDialogData,
} from './curriculum-framework-dialog/curriculum-framework-dialog';
import {
  CurriculumUnitDialog,
  CurriculumUnitDialogData,
} from './curriculum-unit-dialog/curriculum-unit-dialog';
import { WORKFLOW_BADGE, WorkflowCode } from './curriculum-workflow';
import {
  LessonDeliveryDialog,
  LessonDeliveryDialogData,
  planLabel,
} from './lesson-delivery-dialog/lesson-delivery-dialog';
import { LessonPlanDialog, LessonPlanDialogData } from './lesson-plan-dialog/lesson-plan-dialog';

export { topicsForTeachingAssignment } from './curriculum-workflow';

/** Each tab id is also its URL segment under `/app/staff/curriculum-delivery/`. */
export type CurriculumTab =
  | 'frameworks'
  | 'units-topics'
  | 'lesson-plans'
  | 'delivery-logs'
  | 'syllabus-progress';

export const CURRICULUM_TABS: readonly RouteTab<CurriculumTab>[] = [
  { id: 'frameworks', label: 'Frameworks', route: 'frameworks' },
  { id: 'units-topics', label: 'Units & Topics', route: 'units-topics' },
  { id: 'lesson-plans', label: 'Lesson Plans', route: 'lesson-plans' },
  { id: 'delivery-logs', label: 'Delivery Logs', route: 'delivery-logs' },
  { id: 'syllabus-progress', label: 'Syllabus Progress', route: 'syllabus-progress' },
];

const isCurriculumTab = (value: string | null): value is CurriculumTab =>
  CURRICULUM_TABS.some((item) => item.id === value);

/** Curriculum endpoints sit under the Staff Directory permission boundary (see module-operation-routes.ts). */
const MODULE_CODE = 'STAFF_DIRECTORY';

type DeletePath = 'frameworks' | 'units' | 'topics' | 'lesson-plans' | 'lesson-deliveries';
type ReviewCode = Exclude<WorkflowCode, 'DRAFT'>;

@Component({
  selector: 'app-staff-curriculum-delivery',
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
  ],
  templateUrl: './staff-curriculum-delivery.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffCurriculumDelivery implements OnInit {
  readonly #api = inject(StaffCurriculumDeliveryApi);
  readonly #academicApi = inject(StaffAcademicStructureApi);
  readonly #common = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(DialogService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  // One counter per list, so an unrelated lookup never holds a list's skeleton.
  readonly #listLoads = {
    frameworks: pendingCounter(),
    units: pendingCounter(),
    plans: pendingCounter(),
    deliveries: pendingCounter(),
    progress: pendingCounter(),
  };
  #unitsLoad?: Subscription;
  readonly loading = {
    frameworks: this.#listLoads.frameworks.active,
    units: this.#listLoads.units.active,
    plans: this.#listLoads.plans.active,
    deliveries: this.#listLoads.deliveries.active,
    progress: this.#listLoads.progress.active,
  };
  readonly tabs = CURRICULUM_TABS;
  readonly selectedTab = signal<CurriculumTab>('frameworks');
  readonly statuses = signal<AcademicWorkflowStatusOption[]>([]);
  readonly frameworks = signal<CurriculumFramework[]>([]);
  readonly selectedFrameworkId = signal(0);
  readonly units = signal<CurriculumUnit[]>([]);
  readonly plans = signal<LessonPlan[]>([]);
  readonly deliveries = signal<LessonDelivery[]>([]);
  readonly progress = signal<SyllabusProgress[]>([]);
  readonly rowMenuItems = signal<MenuItem[]>([]);

  readonly canAdd = computed(() => this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Add'));
  /** Edit, and every workflow review (submit, approve, reject), is a PUT, so an `Update`. */
  readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Update'),
  );
  readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Delete'),
  );
  readonly approvedPlans = computed(() =>
    this.plans().filter((plan) => this.statusCode(plan.workflowStatusId) === 'APPROVED'),
  );

  ngOnInit(): void {
    this.#common.setPageHeaderInfo({
      pageTitle: 'Curriculum & Lesson Delivery',
      pageDescription:
        'Manage curriculum, lesson approvals, actual delivery and calculated syllabus progress',
      pageIcon: 'pi pi-book',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Staff Directory', routerLink: '/app/staff' },
      { label: 'Curriculum & Lesson Delivery' },
    ]);
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const tab = params.get('tab');
      if (!isCurriculumTab(tab)) {
        void this.#router.navigate(['..', CURRICULUM_TABS[0].id], {
          relativeTo: this.#route,
          replaceUrl: true,
        });
        return;
      }
      this.selectTab(tab);
    });
  }

  openTab(tab: CurriculumTab): void {
    if (tab === this.selectedTab()) return;
    void this.#router.navigate(['..', tab], { relativeTo: this.#route });
  }

  selectTab(tab: CurriculumTab): void {
    this.selectedTab.set(tab);
    this.#loadTab(tab);
  }

  selectFramework(id: number | null): void {
    // The picker emits null when cleared or when its value drops out of the list; keep the
    // current framework rather than leaving Units & Topics empty.
    if (!id) return;
    this.selectedFrameworkId.set(id);
    this.units.set([]);
    this.loadUnits();
  }

  openFrameworkDialog(framework?: CurriculumFramework): void {
    this.#withReference(this.#loadMasters(AcademicMasterType.Session), (sessions) => {
      const data: CurriculumFrameworkDialogData = { framework, sessions };
      this.#openDialog(
        CurriculumFrameworkDialog,
        data,
        `${framework ? 'Edit' : 'Add'} Curriculum Framework`,
        '44rem',
        () => this.loadFrameworks(),
      );
    });
  }

  openUnitDialog(unit?: CurriculumUnit): void {
    this.#withReference(this.#loadMasters(AcademicMasterType.CourseOffering), (offerings) => {
      const data: CurriculumUnitDialogData = {
        kind: 'unit',
        unit,
        frameworkId: this.selectedFrameworkId(),
        offerings,
      };
      this.#openDialog(CurriculumUnitDialog, data, `${unit ? 'Edit' : 'Add'} Unit`, '40rem', () =>
        this.loadUnits(),
      );
    });
  }

  openTopicDialog(topic?: CurriculumTopic, unitId?: number): void {
    const data: CurriculumUnitDialogData = { kind: 'topic', topic, unitId, units: this.units() };
    this.#openDialog(CurriculumUnitDialog, data, `${topic ? 'Edit' : 'Add'} Topic`, '40rem', () =>
      this.loadUnits(),
    );
  }

  openPlanDialog(plan?: LessonPlan): void {
    const assignments = this.#api
      .getTeachingAssignments()
      .pipe(map((response) => response.data ?? []));
    this.#withReference(assignments, (assignments) => {
      const data: LessonPlanDialogData = { plan, assignments, units: this.units() };
      this.#openDialog(
        LessonPlanDialog,
        data,
        `${plan ? 'Edit' : 'Add'} Lesson Plan`,
        '48rem',
        () => this.loadPlans(),
      );
    });
  }

  openDeliveryDialog(delivery?: LessonDelivery, lessonPlanId?: number): void {
    const data: LessonDeliveryDialogData = {
      delivery,
      lessonPlanId,
      approvedPlans: this.approvedPlans(),
      plans: this.plans(),
    };
    this.#openDialog(
      LessonDeliveryDialog,
      data,
      delivery ? 'Edit Lesson Delivery' : 'Record Lesson Delivery',
      '48rem',
      () => {
        // Recorded from a lesson plan: show the new row where it lands (the tab loads it).
        if (!delivery && lessonPlanId) this.openTab('delivery-logs');
        else this.loadDeliveries();
      },
    );
  }

  /** A row shows its action menu only when at least one action in it is permitted. */
  hasActions(items: MenuItem[]): boolean {
    return items.some((item) => item.visible !== false);
  }

  openRowMenu(menu: TieredMenu, event: Event, items: MenuItem[]): void {
    this.rowMenuItems.set(items);
    menu.toggle(event);
  }

  frameworkActions(item: CurriculumFramework): MenuItem[] {
    return this.#workflowActions(
      item.workflowStatusId,
      () => this.openFrameworkDialog(item),
      (code) =>
        this.#review(this.#api.reviewFramework.bind(this.#api), item.id, code, () =>
          this.loadFrameworks(),
        ),
      () => this.confirmDelete('frameworks', item.id, item.name),
    );
  }

  unitActions(unit: CurriculumUnit): MenuItem[] {
    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        visible: this.canUpdate(),
        command: () => this.openUnitDialog(unit),
      },
      {
        label: 'Add Topic',
        icon: 'pi pi-plus',
        visible: this.canAdd(),
        command: () => this.openTopicDialog(undefined, unit.id),
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        visible: this.canDelete(),
        command: () => this.confirmDelete('units', unit.id, unit.name),
      },
    ];
  }

  topicActions(topic: CurriculumTopic): MenuItem[] {
    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        visible: this.canUpdate(),
        command: () => this.openTopicDialog(topic),
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        visible: this.canDelete(),
        command: () => this.confirmDelete('topics', topic.id, topic.name),
      },
    ];
  }

  planActions(item: LessonPlan): MenuItem[] {
    if (this.statusCode(item.workflowStatusId) === 'APPROVED') {
      return [
        {
          label: 'Record Delivery',
          icon: 'pi pi-check-square',
          visible: this.canAdd(),
          command: () => this.openDeliveryDialog(undefined, item.id),
        },
      ];
    }
    return this.#workflowActions(
      item.workflowStatusId,
      () => this.openPlanDialog(item),
      (code) =>
        this.#review(this.#api.reviewLessonPlan.bind(this.#api), item.id, code, () =>
          this.loadPlans(),
        ),
      () => this.confirmDelete('lesson-plans', item.id, `${item.courseOfferingName} lesson plan`),
    );
  }

  deliveryActions(item: LessonDelivery): MenuItem[] {
    return this.#workflowActions(
      item.workflowStatusId,
      () => this.openDeliveryDialog(item),
      (code) =>
        this.#review(this.#api.reviewDelivery.bind(this.#api), item.id, code, () =>
          this.loadDeliveries(),
        ),
      () => this.confirmDelete('lesson-deliveries', item.id, 'lesson delivery'),
    );
  }

  /** Tone and icon for a workflow status; the label is the status name on the record. */
  workflowBadge(statusId: number): { tone: StatusTone; icon: string } {
    return (
      WORKFLOW_BADGE[this.statusCode(statusId) as WorkflowCode] ?? {
        tone: 'neutral',
        icon: 'pi-circle',
      }
    );
  }

  statusCode(id: number): string {
    return this.statuses().find((status) => status.id === id)?.code ?? '';
  }

  planTitle(lessonPlanId: number): string {
    const plan = this.plans().find((item) => item.id === lessonPlanId);
    return plan ? planLabel(plan) : 'Lesson plan';
  }

  /** "No <things> yet." plus, for users who can add, the button that creates one. */
  emptyMessage(things: string, addLabel: string): string {
    return this.canAdd() ? `No ${things} yet. Use ${addLabel} to create one.` : `No ${things} yet.`;
  }

  confirmDelete(path: DeletePath, id: number, label: string): void {
    this.#confirmationService.confirm({
      header: `Delete ${label}`,
      // The dialog renders `message` via [innerHTML], so the label is escaped before use.
      message: `Delete "${escapeHtml(label)}"? Records already in use must be removed first.`,
      icon: 'pi pi-trash text-red-400! text-xl!',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.deleteRecord(path, id),
    });
  }

  /** Fetches only what the tab shows; dialog pickers load when their dialog opens. */
  #loadTab(tab: CurriculumTab): void {
    // Workflow badges and row actions need the status codes.
    if (tab !== 'units-topics' && tab !== 'syllabus-progress') this.#loadStatuses();
    switch (tab) {
      case 'frameworks':
        this.loadFrameworks();
        break;
      case 'units-topics':
        this.loadFrameworks();
        break;
      case 'lesson-plans':
        // The framework picker sits here too: its units feed the lesson plan dialog.
        this.loadFrameworks();
        this.loadPlans();
        break;
      case 'delivery-logs':
        // Delivery rows are titled by their lesson plan.
        this.loadPlans();
        this.loadDeliveries();
        break;
      case 'syllabus-progress':
        this.loadProgress();
        break;
    }
  }
  /** The status lookup is fixed, so it is fetched once. */
  #loadStatuses(): void {
    if (this.statuses().length) return;
    this.#api
      .getStatuses()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.statuses.set(response.data ?? []));
  }
  #loadMasters(type: AcademicMasterType): Observable<AcademicMaster[]> {
    return this.#academicApi.getMasters(type).pipe(map((response) => response.data ?? []));
  }
  /** Waits for a dialog's picker list, then opens it; a failed fetch shows the error instead. */
  #withReference<T>(reference: Observable<T>, open: (value: T) => void): void {
    reference.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: open,
      error: (error) => this.error(error),
    });
  }
  private loadFrameworks(): void {
    this.#api
      .getFrameworks()
      .pipe(this.#listLoads.frameworks.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => {
        this.frameworks.set(response.data ?? []);
        if (!this.selectedFrameworkId() && response.data?.length)
          this.selectedFrameworkId.set(response.data[0].id);
        // Only the tabs with the framework picker show units.
        const tab = this.selectedTab();
        if (tab === 'units-topics' || tab === 'lesson-plans') this.loadUnits();
      });
  }
  private loadUnits(): void {
    // Cancel the previous framework's request so a late response cannot fill this one.
    this.#unitsLoad?.unsubscribe();
    const id = this.selectedFrameworkId();
    if (!id) {
      this.units.set([]);
      return;
    }
    this.#unitsLoad = this.#api
      .getUnits(id)
      .pipe(this.#listLoads.units.track, takeUntilDestroyed(this.#destroyRef))
      // The API leaves `topics` out for a unit that has none.
      .subscribe((response) =>
        this.units.set(
          (response.data ?? []).map((unit) => ({ ...unit, topics: unit.topics ?? [] })),
        ),
      );
  }
  private loadPlans(): void {
    this.#api
      .getLessonPlans()
      .pipe(this.#listLoads.plans.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.plans.set(response.data ?? []));
  }
  private loadDeliveries(): void {
    this.#api
      .getDeliveries()
      .pipe(this.#listLoads.deliveries.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.deliveries.set(response.data ?? []));
  }
  private loadProgress(): void {
    this.#api
      .getProgress()
      .pipe(this.#listLoads.progress.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.progress.set(response.data ?? []));
  }
  private deleteRecord(path: DeletePath, id: number): void {
    this.#api
      .deleteRecord(path, id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          if (!response.isSucceeded) return;
          if (path === 'frameworks') this.loadFrameworks();
          if (path === 'units' || path === 'topics') this.loadUnits();
          if (path === 'lesson-plans') this.loadPlans();
          if (path === 'lesson-deliveries') this.loadDeliveries();
        },
        error: (error) => this.error(error),
      });
  }
  private notify(response: { message: string; isSucceeded: boolean }): void {
    this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
  }
  private error(error: { message: string }): void {
    this.#common.showMessage(error.message, 'error');
  }

  /**
   * Menu items for a record in the approval workflow. Draft and rejected records can be edited,
   * submitted or deleted; submitted ones approved or rejected. Approved records have no workflow
   * action left; the API offers no deactivate or new-version call for them.
   */
  #workflowActions(
    statusId: number,
    edit: () => void,
    review: (code: ReviewCode) => void,
    remove: () => void,
  ): MenuItem[] {
    const code = this.statusCode(statusId);
    if (code === 'DRAFT' || code === 'REJECTED') {
      return [
        { label: 'Edit', icon: 'pi pi-pencil', visible: this.canUpdate(), command: edit },
        {
          label: 'Submit',
          icon: 'pi pi-send',
          visible: this.canUpdate(),
          command: () => review('SUBMITTED'),
        },
        { label: 'Delete', icon: 'pi pi-trash', visible: this.canDelete(), command: remove },
      ];
    }
    if (code === 'SUBMITTED') {
      return [
        {
          label: 'Approve',
          icon: 'pi pi-check-circle',
          visible: this.canUpdate(),
          command: () => review('APPROVED'),
        },
        {
          label: 'Reject',
          icon: 'pi pi-times-circle',
          visible: this.canUpdate(),
          command: () => review('REJECTED'),
        },
      ];
    }
    return [];
  }

  #review(
    call: (
      id: number,
      value: { workflowStatusId: number },
    ) => Observable<{ isSucceeded: boolean; message: string }>,
    id: number,
    code: ReviewCode,
    reload: () => void,
  ): void {
    const status = this.statuses().find((option) => option.code === code);
    if (!status) return;
    call(id, { workflowStatusId: status.id })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          reload();
        },
        error: (error) => this.error(error),
      });
  }

  /** Opens a dialog and runs `onSaved` when it closes after a successful save. */
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
}
