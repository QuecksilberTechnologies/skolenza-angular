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
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { Subscription } from 'rxjs';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { ListSkeleton } from '@shared/components';
import {
  AcademicMaster,
  AcademicMasterType,
  SaveAcademicMaster,
  SaveClassTeacherAssignment,
  SaveTeachingAssignment,
  StaffAcademicProfile,
  ClassTeacherAssignment,
  StaffTeachingAssignment,
  TeachingAssignmentTypeOption,
} from '@shared/interfaces';
import { localDateKey } from '@shared/utilities/date-key';
import { escapeHtml } from '@shared/utilities/escape-html';
import { pendingCounter } from '@shared/utilities/pending-counter';

@Component({
  selector: 'app-staff-academic-structure',
  imports: [
    ButtonModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    FormsModule,
    InputTextModule,
    ListSkeleton,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './staff-academic-structure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffAcademicStructure implements OnInit {
  readonly #api = inject(StaffAcademicStructureApi);
  readonly #common = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);

  readonly masterTypes = AcademicMasterType;
  readonly tabs = Object.values(AcademicMasterType);
  readonly selectedTab = signal(AcademicMasterType.Session);
  readonly records = signal<AcademicMaster[]>([]);
  readonly sessions = signal<AcademicMaster[]>([]);
  readonly programmes = signal<AcademicMaster[]>([]);
  readonly groups = signal<AcademicMaster[]>([]);
  readonly sections = signal<AcademicMaster[]>([]);
  readonly subjects = signal<AcademicMaster[]>([]);
  readonly offerings = signal<AcademicMaster[]>([]);
  readonly academicProfile = signal<StaffAcademicProfile>({
    teachingAssignments: [],
    classTeacherAssignments: [],
  });
  readonly assignmentTypes = signal<TeachingAssignmentTypeOption[]>([]);
  readonly staffMemberId = signal<string | null>(null);
  readonly #listLoad = pendingCounter();
  readonly #save = pendingCounter();
  #selectedLoad?: Subscription;
  readonly loading = this.#listLoad.active;
  readonly saving = this.#save.active;

  masterForm: SaveAcademicMaster = this.emptyMaster();
  teachingForm: SaveTeachingAssignment = this.emptyTeaching();
  classTeacherForm: SaveClassTeacherAssignment = this.emptyClassTeacher();

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
      this.teachingForm.staffMemberId = staffMemberId;
      this.classTeacherForm.staffMemberId = staffMemberId;
      this.loadProfile();
    } else {
      this.loadSelected();
    }
  }

  selectTab(type: AcademicMasterType): void {
    this.selectedTab.set(type);
    // Every tab shares `records`; clear it so the next tab shows a loading state, not stale rows.
    this.records.set([]);
    this.masterForm = this.emptyMaster();
    this.loadSelected();
  }

  edit(item: AcademicMaster): void {
    this.masterForm = { ...item };
  }

  saveMaster(): void {
    if (!this.masterForm.code.trim() || !this.masterForm.name.trim()) return;
    this.#api
      .saveMaster(this.selectedTab(), this.masterForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded) {
            this.masterForm = this.emptyMaster();
            this.loadReferences();
            this.loadSelected();
          }
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  resetMaster(): void {
    this.masterForm = this.emptyMaster();
  }

  // The backend DELETE endpoints soft-deactivate (isActive = false); nothing is hard-deleted.
  confirmDeactivate(item: AcademicMaster): void {
    this.confirmDeactivation(item.name, () => this.delete(item));
  }

  confirmDeactivateTeaching(item: StaffTeachingAssignment): void {
    this.confirmDeactivation(`${item.subjectName} - ${item.classSectionName}`, () =>
      this.deleteTeaching(item),
    );
  }

  confirmDeactivateClassTeacher(item: ClassTeacherAssignment): void {
    this.confirmDeactivation(`${item.academicGroupName} - ${item.classSectionName}`, () =>
      this.deleteClassTeacher(item),
    );
  }

  delete(item: AcademicMaster): void {
    this.#api
      .deleteMaster(this.selectedTab(), item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadReferences();
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  saveTeaching(): void {
    this.#api
      .saveTeachingAssignment(this.teachingForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded) {
            this.teachingForm = this.emptyTeaching(this.staffMemberId() ?? '');
            this.loadProfile();
          }
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  editTeaching(item: StaffTeachingAssignment): void {
    this.teachingForm = {
      id: item.id,
      staffMemberId: this.staffMemberId() ?? '',
      courseOfferingId: item.courseOfferingId,
      classSectionId: item.classSectionId,
      assignmentType: item.assignmentType,
      contributionPercent: item.contributionPercent,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      isPrimary: item.isPrimary,
      isActive: item.isActive,
    };
  }

  deleteTeaching(item: StaffTeachingAssignment): void {
    this.#api
      .deleteTeachingAssignment(item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded) this.loadProfile();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  saveClassTeacher(): void {
    this.#api
      .saveClassTeacherAssignment(this.classTeacherForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded) {
            this.classTeacherForm = this.emptyClassTeacher(this.staffMemberId() ?? '');
            this.loadProfile();
          }
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  editClassTeacher(item: ClassTeacherAssignment): void {
    this.classTeacherForm = {
      id: item.id,
      staffMemberId: this.staffMemberId() ?? '',
      classSectionId: item.classSectionId,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      isPrimary: item.isPrimary,
      isActive: item.isActive,
    };
  }

  deleteClassTeacher(item: ClassTeacherAssignment): void {
    this.#api
      .deleteClassTeacherAssignment(item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded) this.loadProfile();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  teachingSections(): AcademicMaster[] {
    const groupId = this.offerings().find(
      (item) => item.id === this.teachingForm.courseOfferingId,
    )?.academicGroupId;
    return groupId ? this.sections().filter((item) => item.academicGroupId === groupId) : [];
  }

  offeringGroups(): AcademicMaster[] {
    const sessionId = this.masterForm.academicSessionId;
    return sessionId ? this.groups().filter((item) => item.academicSessionId === sessionId) : [];
  }

  onOfferingSessionChange(): void {
    if (!this.offeringGroups().some((item) => item.id === this.masterForm.academicGroupId)) {
      this.masterForm.academicGroupId = undefined;
    }
  }

  private loadSelected(): void {
    // Cancel the previous tab's request so a late response cannot fill this tab.
    this.#selectedLoad?.unsubscribe();
    this.#selectedLoad = this.#api
      .getMasters(this.selectedTab(), false)
      .pipe(this.#listLoad.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => this.records.set(response.isSucceeded ? response.data : []));
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
        .getMasters(type)
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
        this.academicProfile.set(
          response.isSucceeded
            ? response.data
            : { teachingAssignments: [], classTeacherAssignments: [] },
        ),
      );
  }

  private confirmDeactivation(name: string, accept: () => void): void {
    this.#confirmationService.confirm({
      // The dialog renders `message` via [innerHTML], so the name is escaped before use.
      message: `Deactivate <strong>${escapeHtml(name)}</strong>?`,
      header: 'Deactivate this record',
      icon: 'pi pi-exclamation-circle text-amber-500! text-2xl!',
      acceptLabel: 'Deactivate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept,
    });
  }

  private emptyMaster(): SaveAcademicMaster {
    return { id: undefined, code: '', name: '', description: '', isActive: true, type: 1 };
  }

  emptyTeaching(staffMemberId = ''): SaveTeachingAssignment {
    return {
      staffMemberId,
      courseOfferingId: 0,
      classSectionId: 0,
      assignmentType: 1,
      contributionPercent: 100,
      effectiveFrom: localDateKey(),
      isPrimary: true,
      isActive: true,
    };
  }

  emptyClassTeacher(staffMemberId = ''): SaveClassTeacherAssignment {
    return {
      staffMemberId,
      classSectionId: 0,
      effectiveFrom: localDateKey(),
      isPrimary: true,
      isActive: true,
    };
  }
}
