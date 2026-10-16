import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize, Observable } from 'rxjs';

import { Common, StaffMemberExperienceAPI } from '@core/services';
import { TrimInput } from '@shared/directives';
import {
  EXPERIENCE_DOCUMENT_TYPE_LABELS,
  ExperienceDocumentForm,
  ExperienceDocumentType,
  ExperienceForm,
  GetStaffMemberExperienceRes,
  IStaffMemberExperienceInfo,
  IExperienceDocument,
  LoginInfo,
} from '@shared/interfaces';

@Component({
  selector: 'app-staff-member-experience-form',
  imports: [
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
    TooltipModule,
    TrimInput,
  ],
  templateUrl: './staff-member-experience-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberExperienceForm implements OnInit {
  readonly #experienceAPI = inject(StaffMemberExperienceAPI);
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly staffMemberExperience = signal<IStaffMemberExperienceInfo | undefined>(undefined);
  readonly isSaving = signal(false);
  readonly isRemovingFile = signal(false);
  protected experienceForm!: FormGroup<ExperienceForm>;
  protected loginInfo!: LoginInfo;

  readonly documentTypeOptions = Object.entries(EXPERIENCE_DOCUMENT_TYPE_LABELS).map(
    ([value, label]) => ({ label, value: Number(value) }),
  );

  constructor() {
    const experience = this.#dynamicDialogConfig.data.staffMemberExperience as
      | IStaffMemberExperienceInfo
      | undefined;
    this.staffMemberExperience.set(experience);

    this.initForm();

    if (experience) {
      this.patchFormForEdit(experience);
    }

    effect(() => {
      this.isSaving.set(this.#experienceAPI.isSaving());
    });

    effect(() => {
      this.isRemovingFile.set(this.#experienceAPI.isRemovingFile());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  initForm() {
    this.experienceForm = this.#fb.group({
      ctc: this.#fb.control<number>(0, Validators.min(0)),
      companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      previousPositionTitle: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      ],
      staffMemberIdOfCompany: [''],
      startDate: this.#fb.control<Date | null>(null, Validators.required),
      endDate: this.#fb.control<Date | null>(null),
      isForeignExperience: [false],
      isWfh: [false],
      reasonForLeaving: ['', Validators.maxLength(500)],
      remark: ['', Validators.maxLength(500)],
      colleagueName: ['', Validators.maxLength(100)],
      colleaguePositionTitle: ['', Validators.maxLength(100)],
      colleagueContactNumber: ['', Validators.pattern(/^\d{10}$/)],
      reportingManagerName: ['', Validators.maxLength(100)],
      reportingManagerNumber: ['', Validators.pattern(/^\d{10}$/)],
      verificationEmail: ['', Validators.email],
      isAnyGap: [false],
      reasonOfGap: ['', Validators.maxLength(500)],
      gapYearFrom: this.#fb.control<Date | null>(null),
      gapYearTo: this.#fb.control<Date | null>(null),
      documents: this.#fb.array<FormGroup<ExperienceDocumentForm>>([]),
    });

    this.#watchGapToggle();
  }

  #watchGapToggle() {
    this.experienceForm.controls.isAnyGap.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isGap) => {
        const { reasonOfGap, gapYearFrom, gapYearTo } = this.experienceForm.controls;
        if (isGap) {
          reasonOfGap.setValidators([Validators.required, Validators.maxLength(500)]);
          gapYearFrom.setValidators(Validators.required);
          gapYearTo.setValidators(Validators.required);
        } else {
          reasonOfGap.setValidators(Validators.maxLength(500));
          gapYearFrom.clearValidators();
          gapYearTo.clearValidators();
          reasonOfGap.reset('');
          gapYearFrom.reset(null);
          gapYearTo.reset(null);
        }
        reasonOfGap.updateValueAndValidity();
        gapYearFrom.updateValueAndValidity();
        gapYearTo.updateValueAndValidity();
      });
  }

  #createDocumentGroup(file: File): FormGroup<ExperienceDocumentForm> {
    return this.#fb.group({
      documentType: this.#fb.control<ExperienceDocumentType | null>(null, Validators.required),
      file: this.#fb.control<File | null>(file, Validators.required),
      existingId: this.#fb.control<number | null>(null),
      existingFileName: this.#fb.control(''),
      isRemoving: this.#fb.control(false),
    });
  }

  #createExistingDocumentGroup(doc: IExperienceDocument): FormGroup<ExperienceDocumentForm> {
    return this.#fb.group({
      documentType: this.#fb.control<ExperienceDocumentType | null>(
        doc.documentType,
        Validators.required,
      ),
      file: this.#fb.control<File | null>(null),
      existingId: this.#fb.control<number | null>(doc.id),
      existingFileName: this.#fb.control(doc.fileName),
      isRemoving: this.#fb.control(false),
    });
  }

  removeDocument(docIndex: number, id: number): void {
    if (id === 0) {
      this.experienceForm.controls.documents.removeAt(docIndex);
      return;
    }

    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this file? This action cannot be undone.`,
      header: 'Delete Document',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Document',
      rejectLabel: 'Keep Document',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteExperienceDocProcess(docIndex, id);
      },
    });
  }

  deleteExperienceDocProcess(docIndex: number, id: number): void {
    this.experienceForm.disable();
    this.#experienceAPI.setIsRemovingFile(true);
    this.experienceForm.controls.documents.controls[docIndex].controls.isRemoving.setValue(true);

    this.#experienceAPI
      .deleteStaffMemberExperienceDoc(id)
      .pipe(
        finalize(() => {
          this.experienceForm.enable();
          this.#experienceAPI.setIsRemovingFile(false);
          this.experienceForm.controls.documents.controls[docIndex].controls.isRemoving.setValue(
            false,
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.experienceForm.controls.documents.removeAt(docIndex);
            const experienceId = this.staffMemberExperience()?.id || 0;
            if (experienceId) {
              this.#experienceAPI.removeExperienceDocSignal(experienceId, id);
            }
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    const validTypes = ['application/pdf'];

    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type)) {
        this.#commonService.showMessage(
          `"${file.name}" is not valid. Only PDF files are allowed.`,
          'error',
        );
        continue;
      }
      this.experienceForm.controls.documents.push(this.#createDocumentGroup(file));
    }

    input.value = '';
  }

  isDetailInvalid(controlName: string): boolean {
    const control = this.experienceForm.get(controlName);
    return !!control?.invalid && control.touched;
  }

  getUsedDocumentTypes(currentDocIndex: number): number[] {
    return this.experienceForm.controls.documents.controls
      .filter((_, i) => i !== currentDocIndex)
      .map((doc) => doc.controls.documentType.value)
      .filter((v): v is number => v !== null);
  }

  getFilteredDocumentOptions(currentDocIndex: number) {
    const used = this.getUsedDocumentTypes(currentDocIndex);
    return this.documentTypeOptions.filter((opt) => !used.includes(opt.value));
  }

  patchFormForEdit(experience: IStaffMemberExperienceInfo) {
    this.experienceForm.patchValue({
      ctc: experience.ctc,
      companyName: experience.companyName ?? '',
      previousPositionTitle: experience.previousPositionTitle ?? '',
      staffMemberIdOfCompany: experience.staffMemberIdOfCompany ?? '',
      startDate: experience.startDate ? new Date(experience.startDate) : null,
      endDate: experience.endDate ? new Date(experience.endDate) : null,
      isForeignExperience: experience.isForeignExperience ?? false,
      isWfh: experience.isWFH ?? false,
      reasonForLeaving: experience.reasonForLeaving ?? '',
      remark: experience.remark ?? '',
      colleagueName: experience.colleagueName ?? '',
      colleaguePositionTitle: experience.colleaguePositionTitle ?? '',
      colleagueContactNumber: experience.colleagueContactNumber ?? '',
      reportingManagerName: experience.reportingManagerName ?? '',
      reportingManagerNumber: experience.reportingManagerNumber ?? '',
      verificationEmail: experience.verificationEmail ?? '',
      isAnyGap: experience.isAnyGap ?? false,
      reasonOfGap: experience.reasonOfGap ?? '',
      gapYearFrom: experience.gapYearFrom ? new Date(experience.gapYearFrom) : null,
      gapYearTo: experience.gapYearTo ? new Date(experience.gapYearTo) : null,
    });

    // Populate existing documents
    if (experience.documents?.length) {
      const docsArray = this.experienceForm.controls.documents;
      for (const doc of experience.documents) {
        docsArray.push(this.#createExistingDocumentGroup(doc));
      }
    }
  }

  onSubmit() {
    if (this.experienceForm.invalid) {
      this.experienceForm.markAllAsTouched();
      return;
    }

    if (this.staffMemberExperience()) {
      this.updateExperience();
    } else {
      this.createExperience();
    }
  }

  private createExperience() {
    const fd = this.#buildFormData();
    fd.append('UserStaffMemberId', this.loginInfo?.user?.staffMemberId ?? '');
    this.#submitRequest(this.#experienceAPI.createStaffMemberExperience(fd));
  }

  private updateExperience() {
    const experience = this.staffMemberExperience()!;
    const fd = this.#buildFormData();
    fd.append('Id', String(experience.id));
    fd.append('UserStaffMemberId', this.loginInfo?.user?.staffMemberId ?? '');
    this.#submitRequest(this.#experienceAPI.updateStaffMemberExperience(fd));
  }

  #buildFormData(): FormData {
    const form = this.experienceForm.getRawValue();
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;

    const fd = new FormData();
    fd.append('StaffMemberId', queryStaffMemberId ?? sessionUser?.staffMemberId ?? '');
    fd.append('Ctc', String(form.ctc));
    fd.append('CompanyName', form.companyName.trim());
    fd.append('PreviousPositionTitle', form.previousPositionTitle.trim());
    fd.append('StaffMemberIdOfCompany', form.staffMemberIdOfCompany.trim());
    fd.append('StartDate', form.startDate ? form.startDate.toISOString() : '');
    fd.append('EndDate', form.endDate ? form.endDate.toISOString() : '');
    fd.append('IsWFH', String(form.isWfh));
    fd.append('IsForeignExperience', String(form.isForeignExperience));
    fd.append('ReasonForLeaving', form.reasonForLeaving.trim());
    fd.append('Remark', form.remark.trim());
    fd.append('ColleagueName', form.colleagueName.trim());
    fd.append('ColleaguePositionTitle', form.colleaguePositionTitle.trim());
    fd.append('ColleagueContactNumber', form.colleagueContactNumber.trim());
    fd.append('ReportingManagerName', form.reportingManagerName.trim());
    fd.append('ReportingManagerNumber', form.reportingManagerNumber.trim());
    fd.append('VerificationEmail', form.verificationEmail.trim());
    fd.append('IsAnyGap', String(form.isAnyGap));
    fd.append('ReasonOfGap', form.reasonOfGap.trim());
    fd.append('GapYearFrom', form.gapYearFrom ? form.gapYearFrom.toISOString() : '');
    fd.append('GapYearTo', form.gapYearTo ? form.gapYearTo.toISOString() : '');

    // Append documents with their types
    form.documents.forEach((doc, index) => {
      fd.append(`Documents[${index}].DocumentType`, String(doc.documentType));
      if (doc.file) {
        fd.append(`Documents[${index}].File`, doc.file);
      }
      if (doc.existingId) {
        fd.append(`Documents[${index}].Id`, String(doc.existingId));
      }
    });

    return fd;
  }

  #submitRequest(request$: Observable<GetStaffMemberExperienceRes>) {
    this.#experienceAPI.setIsSaving(true);
    request$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.#experienceAPI.setIsSaving(false)),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(true);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
