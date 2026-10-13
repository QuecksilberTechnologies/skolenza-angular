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
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';

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
  StaffConversation,
  StaffTeachingAssignment,
  SubstituteWorkflow,
  TimetableEntry,
  TimetablePeriod,
} from '@shared/interfaces';

type OperationsTab = 'Timetable' | 'Substitute workflow' | 'Staff communication';
@Component({
  selector: 'app-staff-operations',
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
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
  readonly conversations = signal<StaffConversation[]>([]);
  periodForm = this.emptyPeriod();
  entryForm = this.emptyEntry();
  workflowForm = this.emptyWorkflow();
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
      .getCommunicationSetting()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => (this.setting = r.data ?? this.setting));
    this.#api
      .getConversations()
      .pipe(takeUntilDestroyed(this.#destroy))
      .subscribe((r) => this.conversations.set(r.data ?? []));
    this.#academic
      .getMasters(AcademicMasterType.Session)
      .subscribe((r) => this.sessions.set(r.data ?? []));
    this.#academic
      .getMasters(AcademicMasterType.Section)
      .subscribe((r) => this.sections.set(r.data ?? []));
    this.#academic
      .getMasters(AcademicMasterType.CourseOffering)
      .subscribe((r) => this.offerings.set(r.data ?? []));
    this.#curriculum.getTeachingAssignments().subscribe((r) => this.assignments.set(r.data ?? []));
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
}
