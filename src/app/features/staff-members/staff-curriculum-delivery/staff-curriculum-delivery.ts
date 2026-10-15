import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { Subscription } from 'rxjs';

import { Common, StaffAcademicStructureApi, StaffCurriculumDeliveryApi } from '@core/services';
import { ListSkeleton } from '@shared/components';
import {
  AcademicMaster,
  AcademicMasterType,
  AcademicWorkflowStatusOption,
  CurriculumFramework,
  CurriculumUnit,
  LessonDelivery,
  LessonPlan,
  SaveCurriculumFramework,
  SaveCurriculumTopic,
  SaveCurriculumUnit,
  SaveLessonDelivery,
  SaveLessonPlan,
  StaffTeachingAssignment,
  SyllabusProgress,
} from '@shared/interfaces';
import { localDateKey } from '@shared/utilities/date-key';
import { escapeHtml } from '@shared/utilities/escape-html';
import { pendingCounter } from '@shared/utilities/pending-counter';

type CurriculumTab =
  | 'Frameworks'
  | 'Units & Topics'
  | 'Lesson Plans'
  | 'Delivery Logs'
  | 'Syllabus Progress';

export function topicsForTeachingAssignment(
  units: CurriculumUnit[],
  assignments: StaffTeachingAssignment[],
  assignmentId: number,
): CurriculumUnit['topics'] {
  const courseOfferingId = assignments.find((item) => item.id === assignmentId)?.courseOfferingId;
  return courseOfferingId
    ? units
        .filter((unit) => unit.courseOfferingId === courseOfferingId)
        .flatMap((unit) => unit.topics)
    : [];
}

@Component({
  selector: 'app-staff-curriculum-delivery',
  imports: [
    ButtonModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    FormsModule,
    InputTextModule,
    ListSkeleton,
    MultiSelectModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './staff-curriculum-delivery.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffCurriculumDelivery implements OnInit {
  readonly #api = inject(StaffCurriculumDeliveryApi);
  readonly #academicApi = inject(StaffAcademicStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #confirmationService = inject(ConfirmationService);
  // One counter per list, so an unrelated lookup never holds a list's skeleton.
  readonly #listLoads = {
    frameworks: pendingCounter(),
    units: pendingCounter(),
    plans: pendingCounter(),
    deliveries: pendingCounter(),
    progress: pendingCounter(),
  };
  #unitsLoad?: Subscription;
  readonly #save = pendingCounter();
  readonly loading = {
    frameworks: this.#listLoads.frameworks.active,
    units: this.#listLoads.units.active,
    plans: this.#listLoads.plans.active,
    deliveries: this.#listLoads.deliveries.active,
    progress: this.#listLoads.progress.active,
  };
  readonly saving = this.#save.active;
  readonly tabs: CurriculumTab[] = [
    'Frameworks',
    'Units & Topics',
    'Lesson Plans',
    'Delivery Logs',
    'Syllabus Progress',
  ];
  readonly selectedTab = signal<CurriculumTab>('Frameworks');
  readonly statuses = signal<AcademicWorkflowStatusOption[]>([]);
  readonly sessions = signal<AcademicMaster[]>([]);
  readonly offerings = signal<AcademicMaster[]>([]);
  readonly frameworks = signal<CurriculumFramework[]>([]);
  readonly selectedFrameworkId = signal(0);
  readonly units = signal<CurriculumUnit[]>([]);
  readonly assignments = signal<StaffTeachingAssignment[]>([]);
  readonly plans = signal<LessonPlan[]>([]);
  readonly deliveries = signal<LessonDelivery[]>([]);
  readonly progress = signal<SyllabusProgress[]>([]);
  frameworkForm = this.emptyFramework();
  unitForm = this.emptyUnit();
  topicForm = this.emptyTopic();
  planForm = this.emptyPlan();
  deliveryForm = this.emptyDelivery();

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
    this.loadAll();
  }

  selectTab(tab: CurriculumTab): void {
    this.selectedTab.set(tab);
    if (tab === 'Syllabus Progress') this.loadProgress();
  }
  selectFramework(id: number): void {
    this.selectedFrameworkId.set(id);
    this.unitForm.curriculumFrameworkId = id;
    this.units.set([]);
    this.loadUnits();
  }
  saveFramework(): void {
    this.#api
      .saveFramework(this.frameworkForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          if (response.isSucceeded) {
            this.frameworkForm = this.emptyFramework();
            this.loadFrameworks();
          }
        },
        error: (error) => this.error(error),
      });
  }
  editFramework(item: CurriculumFramework): void {
    this.frameworkForm = {
      id: item.id,
      academicSessionId: item.academicSessionId,
      code: item.code,
      name: item.name,
      authorityName: item.authorityName,
      version: item.version,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      isActive: item.isActive,
    };
  }
  reviewFramework(item: CurriculumFramework, code: 'SUBMITTED' | 'APPROVED' | 'REJECTED'): void {
    const status = this.statuses().find((option) => option.code === code);
    if (!status) return;
    this.#api
      .reviewFramework(item.id, { workflowStatusId: status.id })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          this.loadFrameworks();
        },
        error: (error) => this.error(error),
      });
  }
  saveUnit(): void {
    this.#api
      .saveUnit(this.unitForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          if (response.isSucceeded) {
            this.unitForm = this.emptyUnit(this.selectedFrameworkId());
            this.loadUnits();
          }
        },
        error: (error) => this.error(error),
      });
  }
  editUnit(item: CurriculumUnit): void {
    this.unitForm = {
      id: item.id,
      curriculumFrameworkId: item.curriculumFrameworkId,
      courseOfferingId: item.courseOfferingId,
      parentCurriculumUnitId: item.parentCurriculumUnitId,
      code: item.code,
      name: item.name,
      description: item.description,
      sequence: item.sequence,
      plannedPeriods: item.plannedPeriods,
      learningOutcome: item.learningOutcome,
      isActive: item.isActive,
    };
  }
  saveTopic(): void {
    this.#api
      .saveTopic(this.topicForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          if (response.isSucceeded) {
            this.topicForm = this.emptyTopic();
            this.loadUnits();
          }
        },
        error: (error) => this.error(error),
      });
  }
  editTopic(item: CurriculumUnit['topics'][number]): void {
    this.topicForm = { ...item };
  }
  savePlan(): void {
    this.#api
      .saveLessonPlan(this.planForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          if (response.isSucceeded) {
            this.planForm = this.emptyPlan();
            this.loadPlans();
          }
        },
        error: (error) => this.error(error),
      });
  }
  editPlan(item: LessonPlan): void {
    this.planForm = {
      id: item.id,
      staffTeachingAssignmentId: item.staffTeachingAssignmentId,
      plannedDate: item.plannedDate,
      periodReference: item.periodReference,
      objectives: item.objectives,
      teachingMethod: item.teachingMethod,
      resources: item.resources,
      activities: item.activities,
      assessment: item.assessment,
      homework: item.homework,
      isActive: item.isActive,
      curriculumTopicIds: item.topics.map((topic) => topic.id),
    };
  }
  onPlanAssignmentChange(): void {
    const validTopicIds = new Set(this.availablePlanTopics().map((topic) => topic.id));
    this.planForm.curriculumTopicIds = this.planForm.curriculumTopicIds.filter((id) =>
      validTopicIds.has(id),
    );
  }
  reviewPlan(item: LessonPlan, code: 'SUBMITTED' | 'APPROVED' | 'REJECTED'): void {
    const status = this.statuses().find((option) => option.code === code);
    if (!status) return;
    this.#api
      .reviewLessonPlan(item.id, { workflowStatusId: status.id })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          this.loadPlans();
        },
        error: (error) => this.error(error),
      });
  }
  saveDelivery(): void {
    this.#api
      .saveDelivery(this.deliveryForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          if (response.isSucceeded) {
            this.deliveryForm = this.emptyDelivery();
            this.loadDeliveries();
          }
        },
        error: (error) => this.error(error),
      });
  }
  usePlanForDelivery(plan: LessonPlan): void {
    this.deliveryForm = {
      id: undefined,
      lessonPlanId: plan.id,
      deliveredDate: localDateKey(),
      coverageNotes: '',
      isActive: true,
      coverage: plan.topics.map((topic) => ({
        curriculumTopicId: topic.id,
        completionPercent: 100,
      })),
    };
    this.selectTab('Delivery Logs');
  }
  reviewDelivery(item: LessonDelivery, code: 'SUBMITTED' | 'APPROVED' | 'REJECTED'): void {
    const status = this.statuses().find((option) => option.code === code);
    if (!status) return;
    this.#api
      .reviewDelivery(item.id, { workflowStatusId: status.id })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.notify(response);
          this.loadDeliveries();
          this.loadProgress();
        },
        error: (error) => this.error(error),
      });
  }
  confirmDelete(
    path: 'frameworks' | 'units' | 'topics' | 'lesson-plans' | 'lesson-deliveries',
    id: number,
    label: string,
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
      accept: () => this.deleteRecord(path, id),
    });
  }
  allTopics(): CurriculumUnit['topics'] {
    return this.units().flatMap((unit) => unit.topics);
  }
  availablePlanTopics(): CurriculumUnit['topics'] {
    return topicsForTeachingAssignment(
      this.units(),
      this.assignments(),
      this.planForm.staffTeachingAssignmentId,
    );
  }
  approvedPlans(): LessonPlan[] {
    return this.plans().filter(
      (plan) =>
        this.statuses().find((status) => status.id === plan.workflowStatusId)?.code === 'APPROVED',
    );
  }
  assignmentLabel(item: StaffTeachingAssignment): string {
    return `${item.staffMemberName} · ${item.subjectName} · ${item.academicGroupName} / ${item.classSectionName}`;
  }
  planLabel(item: LessonPlan | undefined): string {
    return item ? `${item.courseOfferingName} · ${item.plannedDate}` : 'Lesson plan';
  }
  statusCode(id: number): string {
    return this.statuses().find((status) => status.id === id)?.code ?? '';
  }

  private loadAll(): void {
    this.loadFrameworks();
    this.loadPlans();
    this.loadDeliveries();
    this.loadProgress();
    this.#api
      .getStatuses()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.statuses.set(response.data ?? []));
    this.#api
      .getTeachingAssignments()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.assignments.set(response.data ?? []));
    this.#academicApi
      .getMasters(AcademicMasterType.Session)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.sessions.set(response.data ?? []));
    this.#academicApi
      .getMasters(AcademicMasterType.CourseOffering)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.offerings.set(response.data ?? []));
  }
  private loadFrameworks(): void {
    this.#api
      .getFrameworks()
      .pipe(this.#listLoads.frameworks.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => {
        this.frameworks.set(response.data ?? []);
        if (!this.selectedFrameworkId() && response.data?.length)
          this.selectFramework(response.data[0].id);
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
      .subscribe((response) => this.units.set(response.data ?? []));
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
  private deleteRecord(
    path: 'frameworks' | 'units' | 'topics' | 'lesson-plans' | 'lesson-deliveries',
    id: number,
  ): void {
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
          if (path === 'lesson-deliveries') {
            this.loadDeliveries();
            this.loadProgress();
          }
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
  private emptyFramework(): SaveCurriculumFramework {
    return {
      id: undefined,
      academicSessionId: 0,
      code: '',
      name: '',
      authorityName: '',
      version: '',
      effectiveFrom: '',
      effectiveTo: undefined,
      isActive: true,
    };
  }
  private emptyUnit(frameworkId = 0): SaveCurriculumUnit {
    return {
      id: undefined,
      curriculumFrameworkId: frameworkId,
      courseOfferingId: 0,
      parentCurriculumUnitId: undefined,
      code: '',
      name: '',
      description: '',
      sequence: 1,
      plannedPeriods: 1,
      learningOutcome: '',
      isActive: true,
    };
  }
  private emptyTopic(): SaveCurriculumTopic {
    return {
      id: undefined,
      curriculumUnitId: 0,
      code: '',
      name: '',
      description: '',
      sequence: 1,
      plannedPeriods: 1,
      learningOutcome: '',
      isActive: true,
    };
  }
  private emptyPlan(): SaveLessonPlan {
    return {
      id: undefined,
      staffTeachingAssignmentId: 0,
      plannedDate: '',
      objectives: '',
      isActive: true,
      curriculumTopicIds: [],
    };
  }
  private emptyDelivery(): SaveLessonDelivery {
    return {
      id: undefined,
      lessonPlanId: 0,
      deliveredDate: '',
      coverageNotes: '',
      isActive: true,
      coverage: [],
    };
  }
}
