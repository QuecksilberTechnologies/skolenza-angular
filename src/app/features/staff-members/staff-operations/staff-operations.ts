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
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { forkJoin } from 'rxjs';

import {
  Common,
  StaffAcademicStructureApi,
  StaffCurriculumDeliveryApi,
  StaffOperationsApi,
} from '@core/services';
import {
  AcademicMaster,
  AcademicMasterType,
  CommunicationSetting,
  CreateStaffConversation,
  StaffAbsenceImpact,
  StaffAudience,
  StaffConversation,
  StaffConversationDetail,
  StaffOperationsOption,
  StaffOperationsOptions,
  StaffQueryCategory,
  StaffTeachingAssignment,
  SubstituteWorkflow,
  TimetableEntry,
  TimetablePeriod,
  TimetableWorkflow,
} from '@shared/interfaces';
import { errorMessage } from '@shared/utilities/error-message';
import { allPages } from '@shared/utilities/paged-list';

type OperationsTab = 'Timetable' | 'Substitute workflow' | 'Staff communication';
@Component({
  selector: 'app-staff-operations',
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './staff-operations.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffOperations implements OnInit {
  readonly #api = inject(StaffOperationsApi);
  readonly #academic = inject(StaffAcademicStructureApi);
  readonly #curriculum = inject(StaffCurriculumDeliveryApi);
  readonly #common = inject(Common);
  readonly #destroy = inject(DestroyRef);
  readonly tabs: OperationsTab[] = ['Timetable', 'Substitute workflow', 'Staff communication'];
  readonly selectedTab = signal<OperationsTab>('Timetable');
  readonly periods = signal<TimetablePeriod[]>([]);
  readonly entries = signal<TimetableEntry[]>([]);
  readonly sessions = signal<AcademicMaster[]>([]);
  readonly sections = signal<AcademicMaster[]>([]);
  readonly offerings = signal<AcademicMaster[]>([]);
  readonly assignments = signal<StaffTeachingAssignment[]>([]);
  readonly workflows = signal<SubstituteWorkflow[]>([]);
  readonly timetableWorkflows = signal<TimetableWorkflow[]>([]);
  readonly absenceImpacts = signal<StaffAbsenceImpact[]>([]);
  readonly conversations = signal<StaffConversation[]>([]);
  readonly selectedConversation = signal<StaffConversationDetail | null>(null);
  readonly options = signal<StaffOperationsOptions>({
    staffMembers: [],
    campuses: [],
    departments: [],
    staffCategories: [],
    accessRoles: [],
    staffPositions: [],
    approvedLeaveRequests: [],
  });
  readonly queryCategories = signal<StaffQueryCategory[]>([]);
  periodForm = this.emptyPeriod();
  entryForm = this.emptyEntry();
  workflowForm = this.emptyWorkflow();
  timetableWorkflowForm = this.emptyTimetableWorkflow();
  setting: CommunicationSetting = {
    enableInApp: true,
    enableEmail: false,
    enableSms: false,
    enablePush: false,
    retentionDays: 365,
  };
  conversationForm: CreateStaffConversation = {
    conversationTypeCode: 'DIRECT',
    subject: '',
    initialMessage: '',
    participantStaffMemberIds: [],
    audiences: [],
  };
  queryCategoryForm: StaffQueryCategory = this.emptyQueryCategory();
  leaveRequestId?: number;
  replyBody = '';
  audienceDraft: StaffAudience = { audienceTypeCode: 'DEPARTMENT', targetId: 0 };
  readonly weekdays = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 7, name: 'Sunday' },
  ];
  readonly approverTypes = [
    { code: 'MANAGER', name: 'Reporting manager' },
    { code: 'ACCESS_ROLE', name: 'Access role' },
    { code: 'POSITION', name: 'Position' },
    { code: 'STAFF_MEMBER', name: 'Named staff member' },
  ];
  ngOnInit(): void {
    this.#common.setPageHeaderInfo({
      pageTitle: 'Timetable, Coverage & Communication',
      pageDescription:
        'Configure timetable, substitute approvals and institution staff communication',
      pageIcon: 'pi pi-calendar',
    });
    this.loadAll();
  }
  selectTab(tab: OperationsTab) {
    this.selectedTab.set(tab);
  }
  loadAll() {
    this.#api
      .getOptions()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.options.set(r.data ?? this.options()));
    this.#api
      .getPeriods()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.periods.set(r.data ?? []));
    this.#api
      .getEntries()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.entries.set(r.data ?? []));
    this.#api
      .getWorkflows()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.workflows.set(r.data ?? []));
    this.#api
      .getTimetableWorkflows()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.timetableWorkflows.set(r.data ?? []));
    this.#api
      .getAbsenceImpacts()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.absenceImpacts.set(r.data ?? []));
    this.#api
      .getCommunicationSetting()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => (this.setting = r.data ?? this.setting));
    this.#api
      .getConversations()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.conversations.set(r.data ?? []));
    const masters = (type: AcademicMasterType) =>
      allPages((page) => this.#academic.getMasters(type, page));
    forkJoin({
      sessions: masters(AcademicMasterType.Session),
      sections: masters(AcademicMasterType.Section),
      offerings: masters(AcademicMasterType.CourseOffering),
    })
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe({
        next: ({ sessions, sections, offerings }) => {
          this.sessions.set(sessions);
          this.sections.set(sections);
          this.offerings.set(offerings);
        },
        error: (error) => this.#common.showMessage(errorMessage(error), 'error'),
      });
    this.#curriculum.getTeachingAssignments().subscribe((r) => this.assignments.set(r.data ?? []));
    this.#api
      .getQueryCategories()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.queryCategories.set(r.data ?? []));
  }
  savePeriod() {
    this.#api.savePeriod(this.periodForm).subscribe((r) => {
      if (r.isSucceeded) {
        this.periodForm = this.emptyPeriod();
        this.loadAll();
      }
    });
  }
  editPeriod(x: TimetablePeriod) {
    this.periodForm = { ...x };
  }
  saveEntry() {
    this.#api.saveEntry(this.entryForm).subscribe((r) => {
      if (r.isSucceeded) {
        this.entryForm = this.emptyEntry();
        this.loadAll();
      }
    });
  }
  submitEntry(item: TimetableEntry) {
    this.#api.submitTimetableEntry(item.id).subscribe(() => this.loadAll());
  }
  timetableAction(item: TimetableEntry, actionCode: 'APPROVE' | 'REJECT' | 'PUBLISH') {
    this.#api.actOnTimetableEntry(item.id, actionCode).subscribe(() => this.loadAll());
  }
  createRevision(item: TimetableEntry) {
    this.#api.createTimetableRevision(item.id).subscribe(() => this.loadAll());
  }
  saveTimetableWorkflow() {
    this.#api.saveTimetableWorkflow(this.timetableWorkflowForm).subscribe((r) => {
      if (r.isSucceeded) {
        this.timetableWorkflowForm = this.emptyTimetableWorkflow();
        this.loadAll();
      }
    });
  }
  editTimetableWorkflow(item: TimetableWorkflow) {
    this.timetableWorkflowForm = structuredClone(item);
  }
  addTimetableStep() {
    this.timetableWorkflowForm.steps.push({
      sequence: this.timetableWorkflowForm.steps.length + 1,
      approverTypeCode: 'MANAGER',
      isActive: true,
    });
  }
  removeTimetableStep(index: number) {
    this.timetableWorkflowForm.steps.splice(index, 1);
    this.timetableWorkflowForm.steps.forEach((x, i) => (x.sequence = i + 1));
  }
  saveWorkflow() {
    this.#api.saveWorkflow(this.workflowForm).subscribe((r) => {
      if (r.isSucceeded) {
        this.workflowForm = this.emptyWorkflow();
        this.loadAll();
      }
    });
  }
  editWorkflow(x: SubstituteWorkflow) {
    this.workflowForm = structuredClone(x);
  }
  addStep() {
    this.workflowForm.steps.push({
      sequence: this.workflowForm.steps.length + 1,
      approverTypeCode: 'MANAGER',
      isActive: true,
    });
  }
  removeStep(index: number) {
    this.workflowForm.steps.splice(index, 1);
    this.workflowForm.steps.forEach((x, i) => (x.sequence = i + 1));
  }
  approverOptions(step: SubstituteWorkflow['steps'][number]): StaffOperationsOption[] {
    if (step.approverTypeCode === 'ACCESS_ROLE') return this.options().accessRoles;
    if (step.approverTypeCode === 'POSITION') return this.options().staffPositions;
    if (step.approverTypeCode === 'STAFF_MEMBER') return this.options().staffMembers;
    return [];
  }
  getStepTarget(step: SubstituteWorkflow['steps'][number]): number | undefined {
    if (step.approverTypeCode === 'ACCESS_ROLE') return step.accessRoleId;
    if (step.approverTypeCode === 'POSITION') return step.staffPositionMasterId;
    if (step.approverTypeCode === 'STAFF_MEMBER') return step.staffMemberId;
    return undefined;
  }
  setStepTarget(step: SubstituteWorkflow['steps'][number], value: number) {
    step.accessRoleId = undefined;
    step.staffPositionMasterId = undefined;
    step.staffMemberId = undefined;
    if (step.approverTypeCode === 'ACCESS_ROLE') step.accessRoleId = value;
    if (step.approverTypeCode === 'POSITION') step.staffPositionMasterId = value;
    if (step.approverTypeCode === 'STAFF_MEMBER') step.staffMemberId = value;
  }
  synchronizeLeave() {
    if (!this.leaveRequestId) return;
    this.#api.synchronizeLeaveImpacts(this.leaveRequestId).subscribe(() => this.loadAll());
  }
  assignSubstitute(impact: StaffAbsenceImpact, workflowId: number, staffMemberId: number) {
    this.#api
      .assignSubstitute({
        staffAbsenceImpactId: impact.id,
        substituteWorkflowMasterId: workflowId,
        substituteStaffMemberId: staffMemberId,
      })
      .subscribe(() => this.loadAll());
  }
  actOnSubstitute(impact: StaffAbsenceImpact, actionCode: string) {
    if (!impact.substituteAssignmentId) return;
    this.#api
      .actOnSubstitute(impact.substituteAssignmentId, actionCode)
      .subscribe(() => this.loadAll());
  }
  saveSetting() {
    this.#api.saveCommunicationSetting(this.setting).subscribe();
  }
  createConversation() {
    this.#api.createConversation(this.conversationForm).subscribe((r) => {
      if (r.isSucceeded) {
        this.conversationForm = {
          conversationTypeCode: 'DIRECT',
          subject: '',
          initialMessage: '',
          participantStaffMemberIds: [],
          audiences: [],
        };
        this.loadAll();
      }
    });
  }
  audienceOptions(): StaffOperationsOption[] {
    const type = this.audienceDraft.audienceTypeCode;
    if (type === 'CAMPUS') return this.options().campuses;
    if (type === 'DEPARTMENT') return this.options().departments;
    if (type === 'STAFF_CATEGORY') return this.options().staffCategories;
    if (type === 'ACCESS_ROLE') return this.options().accessRoles;
    return this.options().staffMembers;
  }
  addAudience() {
    if (!this.audienceDraft.targetId) return;
    this.conversationForm.audiences.push({ ...this.audienceDraft });
    this.audienceDraft.targetId = 0;
  }
  removeAudience(index: number) {
    this.conversationForm.audiences.splice(index, 1);
  }
  openConversation(id: number) {
    this.#api
      .markConversationRead(id)
      .subscribe((r) => this.selectedConversation.set(r.data ?? null));
  }
  sendReply() {
    const conversation = this.selectedConversation();
    if (!conversation || !this.replyBody.trim()) return;
    this.#api.addMessage(conversation.id, this.replyBody.trim()).subscribe(() => {
      this.replyBody = '';
      this.openConversation(conversation.id);
      this.loadAll();
    });
  }
  closeConversation() {
    const conversation = this.selectedConversation();
    if (!conversation) return;
    this.#api.closeConversation(conversation.id).subscribe((r) => {
      this.selectedConversation.set(r.data ?? null);
      this.loadAll();
    });
  }
  uploadAttachment(messageId: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.#api.uploadMessageAttachment(messageId, file).subscribe((response) => {
      if (response.isSucceeded) {
        const conversation = this.selectedConversation();
        if (conversation) this.openConversation(conversation.id);
        input.value = '';
      }
    });
  }
  saveQueryCategory() {
    this.#api.saveQueryCategory(this.queryCategoryForm).subscribe((response) => {
      if (response.isSucceeded) {
        this.queryCategoryForm = this.emptyQueryCategory();
        this.loadAll();
      }
    });
  }
  editQueryCategory(value: StaffQueryCategory) {
    this.queryCategoryForm = { ...value };
  }
  deactivateQueryCategory(id: number) {
    this.#api.deactivateQueryCategory(id).subscribe((response) => {
      if (response.isSucceeded) {
        this.loadAll();
      }
    });
  }
  emptyPeriod() {
    return {
      id: 0,
      academicSessionId: 0,
      code: '',
      name: '',
      sequence: 1,
      startTime: '08:00',
      endTime: '08:45',
      isActive: true,
    };
  }
  emptyEntry() {
    return {
      id: 0,
      academicSessionId: 0,
      classSectionId: 0,
      courseOfferingId: 0,
      timetablePeriodMasterId: 0,
      staffTeachingAssignmentId: 0,
      dayOfWeek: 1,
      roomReference: '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: undefined,
      isActive: true,
    };
  }
  emptyWorkflow(): SubstituteWorkflow {
    return {
      id: 0,
      code: '',
      name: '',
      description: '',
      requiresSubstituteAcceptance: true,
      allowSelfNomination: false,
      autoApproveWhenNoSteps: false,
      isActive: true,
      steps: [],
    };
  }
  emptyTimetableWorkflow(): TimetableWorkflow {
    return {
      id: 0,
      code: '',
      name: '',
      description: '',
      allowTeacherDraftProposal: true,
      autoPublishAfterFinalApproval: true,
      isDefault: false,
      isActive: true,
      steps: [],
    };
  }
  emptyQueryCategory(): StaffQueryCategory {
    return { id: 0, code: '', name: '', description: '', isActive: true };
  }
}
