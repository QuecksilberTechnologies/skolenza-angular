import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  Type,
  viewChild,
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
import { forkJoin, map, Observable, of, Subscription, tap } from 'rxjs';

import { Common, StaffAcademicStructureApi, StaffCurriculumDeliveryApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  ListSkeleton,
  LoadMore,
  type RouteTab,
  RouteTabs,
  StatusBadge,
  type StatusTone,
  TableActionButton,
  TableEmptyMessage,
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
} from '@shared/interfaces';
import { escapeHtml } from '@shared/utilities/escape-html';
import { openManageDialog } from '@shared/utilities/manage-dialog';
import { allPages, pagedList, PagedList } from '@shared/utilities/paged-list';
import { requestLimiter } from '@shared/utilities/request-limiter';

import {
  CurriculumFrameworkDialog,
  CurriculumFrameworkDialogData,
} from './curriculum-framework-dialog/curriculum-framework-dialog';
import {
  CurriculumUnitDialog,
  CurriculumUnitDialogData,
  CurriculumUnitDialogResult,
} from './curriculum-unit-dialog/curriculum-unit-dialog';
import { WORKFLOW_BADGE, WorkflowCode } from './curriculum-workflow';
import {
  LessonDeliveryDialog,
  LessonDeliveryDialogData,
  planLabel,
} from './lesson-delivery-dialog/lesson-delivery-dialog';
import { LessonPlanDialog, LessonPlanDialogData } from './lesson-plan-dialog/lesson-plan-dialog';

export { unitIdsForTeachingAssignment } from './curriculum-workflow';

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

/** The part of a paged list a `more` row drives. */
interface MoreList {
  loading(): boolean;
  failed(): boolean;
  loadMore(): void;
  retry(): void;
}

/**
 * One fixed-height row of the virtual Units & Topics list. A `more` row stands where a list has
 * another page; rendering it loads that page (infinite scroll), and a failed load offers a retry.
 * `what` names the page for the row's copy, e.g. "more units".
 */
export type UnitRow =
  | { kind: 'unit'; key: string; unit: CurriculumUnit }
  | { kind: 'topic'; key: string; topic: CurriculumTopic; unitName: string }
  | { kind: 'more'; key: string; what: string; list: MoreList };

/** Row height of the Units & Topics viewport, in px; the row template matches it. */
export const UNIT_ROW_HEIGHT = 56;
type ReviewCode = Exclude<WorkflowCode, 'DRAFT'>;

@Component({
  selector: 'app-staff-curriculum-delivery',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    FormsModule,
    ListSkeleton,
    LoadMore,
    RouteTabs,
    ScrollingModule,
    SelectModule,
    StatusBadge,
    TableActionButton,
    TableEmptyMessage,
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
  readonly tabs = CURRICULUM_TABS;
  readonly selectedTab = signal<CurriculumTab>('frameworks');
  readonly statuses = signal<AcademicWorkflowStatusOption[]>([]);
  readonly selectedFrameworkId = signal(0);
  /** Every framework, for the picker; the Frameworks tab pages its own list. */
  readonly frameworkOptions = signal<CurriculumFramework[]>([]);
  /** Every lesson plan, so each delivery row can name its plan. */
  readonly planLookup = signal<LessonPlan[]>([]);
  readonly rowMenuItems = signal<MenuItem[]>([]);

  /** A failed list request shows its error as a toast. */
  readonly #toast = (error: unknown): void => this.error(error as { message: string });
  // Each tab's list is server-paged and grows with "Load more".
  readonly frameworks = pagedList((page) => this.#api.getFrameworks(page), this.#destroyRef, {
    onError: this.#toast,
  });
  readonly units = pagedList(
    (page) =>
      this.#api
        .getUnits(this.selectedFrameworkId(), page)
        // Topics page on their own: each new unit on the page fetches its first page of topics.
        .pipe(tap((response) => this.#syncTopics(response.data ?? [], page.pageNumber === 1))),
    this.#destroyRef,
    { onError: this.#toast },
  );
  readonly plans = pagedList((page) => this.#api.getLessonPlans(page), this.#destroyRef, {
    onError: this.#toast,
  });
  readonly deliveries = pagedList((page) => this.#api.getDeliveries(page), this.#destroyRef, {
    onError: this.#toast,
  });
  readonly progress = pagedList((page) => this.#api.getProgress(page), this.#destroyRef, {
    onError: this.#toast,
  });
  /** Topic lists of the units in `units`, created as their units arrive; a new Map on change. */
  readonly #topics = signal(new Map<number, PagedList<CurriculumTopic>>());
  /** Topic requests in flight at once, across every unit on the tab. */
  readonly #topicRequests = requestLimiter(4);
  #frameworkOptionsLoad?: Subscription;
  /** Every unit of one framework, for the dialog pickers; dropped when units change. */
  #unitOptions?: { frameworkId: number; units: CurriculumUnit[] };

  readonly unitRowHeight = UNIT_ROW_HEIGHT;
  /** Units & Topics as flat rows: each unit, its loaded topics, then the rows that load more. */
  readonly unitRows = computed<UnitRow[]>(() => {
    const rows: UnitRow[] = [];
    let topicsLoading = false;
    for (const unit of this.units.items()) {
      rows.push({ kind: 'unit', key: `unit-${unit.id}`, unit });
      const topics = this.topicsOf(unit.id);
      if (!topics) continue;
      topicsLoading ||= topics.loading();
      for (const topic of topics.items())
        rows.push({ kind: 'topic', key: `topic-${topic.id}`, topic, unitName: unit.name });
      // A failed list keeps its row too, so its Retry stays reachable on the last page.
      if (topics.hasMore() || topics.failed())
        rows.push({
          kind: 'more',
          key: `topics-${unit.id}`,
          what: `more topics in ${unit.name}`,
          list: topics,
        });
    }
    // Until a page's topics arrive its units are one row each, so the next page would come into
    // view at once and load too; wait for them so each scroll loads one page.
    if ((this.units.hasMore() && !topicsLoading) || this.units.failed())
      rows.push({ kind: 'more', key: 'units', what: 'more units', list: this.units });
    return rows;
  });
  /** One polite announcement for the virtual list, instead of a status region per row. */
  readonly unitsStatus = computed(() => {
    const more = this.unitRows().filter((row) => row.kind === 'more');
    if (more.some((row) => row.list.failed())) return "Some units or topics couldn't load.";
    return more.some((row) => row.list.loading()) ? 'Loading more units and topics...' : '';
  });
  readonly trackRow = (_index: number, row: UnitRow): string => row.key;
  private readonly unitViewport = viewChild(CdkVirtualScrollViewport);

  constructor() {
    // Infinite scroll: a scroll that renders a `more` row loads the next page behind it.
    effect((onCleanup) => {
      const viewport = this.unitViewport();
      if (!viewport) return;
      const subscription = viewport.renderedRangeStream.subscribe((range) =>
        this.loadRendered(range),
      );
      onCleanup(() => subscription.unsubscribe());
    });
    // So do new rows that leave a `more` row in view. Read after rendering, so the range belongs
    // to the rows on screen rather than to the previous ones.
    afterRenderEffect(() => {
      const viewport = this.unitViewport();
      if (viewport) this.loadRendered(viewport.getRenderedRange());
    });
  }

  readonly canAdd = computed(() => this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Add'));
  /** Edit, and every workflow review (submit, approve, reject), is a PUT, so an `Update`. */
  readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Update'),
  );
  readonly canDelete = computed(() =>
    this.#featurePageStore.canPerformOrUnknown(MODULE_CODE, 'Delete'),
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
    this.#switchUnits();
  }

  /**
   * Loads the next page behind every `more` row in the rendered range. A failed list waits for its
   * Retry button, so a failing API is not asked again on every render.
   */
  loadRendered({ start, end }: ListRange): void {
    for (const row of this.unitRows().slice(start, end))
      if (row.kind === 'more' && !row.list.loading() && !row.list.failed()) row.list.loadMore();
  }

  /** The topics of a unit on the Units & Topics tab, paged on their own. */
  topicsOf(unitId: number): PagedList<CurriculumTopic> | undefined {
    return this.#topics().get(unitId);
  }

  openFrameworkDialog(framework?: CurriculumFramework): void {
    this.#withReference(this.#loadMasters(AcademicMasterType.Session), (sessions) => {
      const data: CurriculumFrameworkDialogData = { framework, sessions };
      this.#openDialog(
        CurriculumFrameworkDialog,
        data,
        `${framework ? 'Edit' : 'Add'} Curriculum Framework`,
        '44rem',
        () => this.frameworks.refresh(),
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
        this.#refreshUnits(),
      );
    });
  }

  openTopicDialog(topic?: CurriculumTopic, unitId?: number): void {
    this.#withReference(this.#allUnits(), (units) => {
      const data: CurriculumUnitDialogData = { kind: 'topic', topic, unitId, units };
      this.#openDialog<CurriculumUnitDialogResult>(
        CurriculumUnitDialog,
        data,
        `${topic ? 'Edit' : 'Add'} Topic`,
        '40rem',
        // Only the units the topic left and joined change; the rest keep their loaded topics.
        (result) => {
          const changed = new Set([topic?.curriculumUnitId, result.unitId]);
          changed.forEach((id) => id && this.topicsOf(id)?.refresh());
        },
      );
    });
  }

  openPlanDialog(plan?: LessonPlan): void {
    const reference = forkJoin({
      assignments: this.#api.getTeachingAssignments().pipe(map((response) => response.data ?? [])),
      units: this.#allUnits(),
    });
    this.#withReference(reference, ({ assignments, units }) => {
      const data: LessonPlanDialogData = { plan, assignments, units };
      this.#openDialog(
        LessonPlanDialog,
        data,
        `${plan ? 'Edit' : 'Add'} Lesson Plan`,
        '48rem',
        () => this.plans.refresh(),
      );
    });
  }

  openDeliveryDialog(delivery?: LessonDelivery, lessonPlanId?: number): void {
    // Delivery Logs already holds every plan; elsewhere they are fetched for the dialog.
    const allPlans =
      this.selectedTab() === 'delivery-logs' && this.planLookup().length
        ? of(this.planLookup())
        : this.#allPlans();
    this.#withReference(allPlans, (plans) => {
      const data: LessonDeliveryDialogData = {
        delivery,
        lessonPlanId,
        approvedPlans: plans.filter(
          (plan) => this.statusCode(plan.workflowStatusId) === 'APPROVED',
        ),
        plans,
      };
      this.#openDialog(
        LessonDeliveryDialog,
        data,
        delivery ? 'Edit Lesson Delivery' : 'Record Lesson Delivery',
        '48rem',
        () => {
          // Recorded from a lesson plan: show the new row where it lands (the tab loads it).
          if (!delivery && lessonPlanId) this.openTab('delivery-logs');
          else this.deliveries.refresh();
        },
      );
    });
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
          this.frameworks.refresh(),
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
        command: () =>
          this.confirmDelete('topics', topic.id, topic.name, () =>
            this.topicsOf(topic.curriculumUnitId)?.refresh(),
          ),
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
          this.plans.refresh(),
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
          this.deliveries.refresh(),
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
    const plan = this.planLookup().find((item) => item.id === lessonPlanId);
    return plan ? planLabel(plan) : 'Lesson plan';
  }

  /** `refresh` updates the list the record sat in; by default the list for `path`. */
  confirmDelete(
    path: DeletePath,
    id: number,
    label: string,
    refresh: () => void = () => this.#refreshAfterDelete(path),
  ): void {
    this.#confirmationService.confirm({
      header: `Delete ${label}`,
      // The dialog renders `message` via [innerHTML], so the label is escaped before use.
      message: `Delete "${escapeHtml(label)}"? Records already in use must be removed first.`,
      icon: 'pi pi-trash text-red-400! text-xl!',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.deleteRecord(path, id, refresh),
    });
  }

  /** Fetches only what the tab shows; dialog pickers load when their dialog opens. */
  #loadTab(tab: CurriculumTab): void {
    // Workflow badges and row actions need the status codes.
    if (tab !== 'units-topics' && tab !== 'syllabus-progress') this.#loadStatuses();
    switch (tab) {
      case 'frameworks':
        this.frameworks.reload();
        break;
      case 'units-topics':
        this.#loadFrameworkOptions();
        break;
      case 'lesson-plans':
        // The framework picker sits here too: its units feed the lesson plan dialog.
        this.#loadFrameworkOptions();
        this.plans.reload();
        break;
      case 'delivery-logs':
        // Delivery rows are titled by their lesson plan.
        this.#loadPlanLookup();
        this.deliveries.reload();
        break;
      case 'syllabus-progress':
        this.progress.reload();
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
    return allPages((page) => this.#academicApi.getMasters(type, page));
  }
  /** Waits for a dialog's picker list, then opens it; a failed fetch shows the error instead. */
  #withReference<T>(reference: Observable<T>, open: (value: T) => void): void {
    reference.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: open,
      error: (error) => this.error(error),
    });
  }
  /** A newer load cancels the one in flight, so a late answer cannot reset the units again. */
  #loadFrameworkOptions(): void {
    this.#frameworkOptionsLoad?.unsubscribe();
    this.#frameworkOptionsLoad = allPages((page) => this.#api.getFrameworks(page))
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (frameworks) => {
          this.frameworkOptions.set(frameworks);
          if (!this.selectedFrameworkId() && frameworks.length)
            this.selectedFrameworkId.set(frameworks[0].id);
          this.#switchUnits();
        },
        error: (error) => this.error(error),
      });
  }
  #loadPlanLookup(): void {
    this.#allPlans()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((plans) => this.planLookup.set(plans));
  }
  /** Empties Units & Topics and, on that tab, fetches the picked framework's first page. */
  #switchUnits(): void {
    // Clearing cancels the previous framework's requests, so a late page cannot fill this one.
    this.units.clear();
    this.#syncTopics([], true);
    if (this.selectedTab() === 'units-topics' && this.selectedFrameworkId()) this.units.reload();
  }
  /** After a unit save or delete: the loaded pages again, and the picker list is stale. */
  #refreshUnits(): void {
    this.#unitOptions = undefined;
    this.units.refresh();
  }
  /**
   * Gives each newly arrived unit a topic list and fetches its first page. When `units` holds the
   * whole list (`replaced`), lists of units no longer in it are dropped, requests and all.
   */
  #syncTopics(units: CurriculumUnit[], replaced: boolean): void {
    const lists = new Map(this.#topics());
    if (replaced) {
      const kept = new Set(units.map((unit) => unit.id));
      for (const [unitId, topics] of lists)
        if (!kept.has(unitId)) {
          topics.clear();
          lists.delete(unitId);
        }
    }
    // One toast for the batch: when the topics endpoint is down, every unit's request fails.
    let told = false;
    const onError = (error: unknown): void => {
      if (!told) this.#toast(error);
      told = true;
    };
    const added = units.filter((unit) => !lists.has(unit.id));
    for (const unit of added)
      lists.set(
        unit.id,
        pagedList(
          (page) => this.#api.getTopics(unit.id, page).pipe(this.#topicRequests),
          this.#destroyRef,
          { onError },
        ),
      );
    this.#topics.set(lists);
    for (const unit of added) lists.get(unit.id)?.reload();
  }
  /** Every unit of the picked framework, for the dialog pickers; fetched once per framework. */
  #allUnits(): Observable<CurriculumUnit[]> {
    const frameworkId = this.selectedFrameworkId();
    if (!frameworkId) return of([]);
    if (this.#unitOptions?.frameworkId === frameworkId) return of(this.#unitOptions.units);
    return allPages((page) => this.#api.getUnits(frameworkId, page)).pipe(
      tap((units) => (this.#unitOptions = { frameworkId, units })),
    );
  }
  #allPlans(): Observable<LessonPlan[]> {
    return allPages((page) => this.#api.getLessonPlans(page));
  }
  #refreshAfterDelete(path: DeletePath): void {
    if (path === 'frameworks') this.frameworks.refresh();
    if (path === 'units') this.#refreshUnits();
    if (path === 'lesson-plans') this.plans.refresh();
    if (path === 'lesson-deliveries') this.deliveries.refresh();
  }
  private deleteRecord(path: DeletePath, id: number, refresh: () => void): void {
    this.#api
      .deleteRecord(path, id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          if (response.isSucceeded) refresh();
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

  /** Opens a dialog and runs `onSaved` with its close value after a successful save. */
  #openDialog<R = true>(
    component: Type<unknown>,
    data: unknown,
    header: string,
    maxWidth: string,
    onSaved: (result: R) => void,
  ): void {
    openManageDialog<R>(
      this.#dialogService,
      this.#destroyRef,
      { component, header, maxWidth, data },
      onSaved,
    );
  }
}
