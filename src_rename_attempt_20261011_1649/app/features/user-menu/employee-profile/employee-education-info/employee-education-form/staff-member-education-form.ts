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
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { RadioButtonModule } from '@openng/optimus-ui/radiobutton';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { formatISO, parseISO } from 'date-fns';
import { finalize } from 'rxjs';

import { Common, StaffMemberEducationAPI } from '@core/services';
import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';
import { TrimInput } from '@shared/directives';
import { EducationForm, IStaffMemberEducationInfo, LoginInfo, ScoreType } from '@shared/interfaces';
import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

@Component({
  selector: 'app-staffMember-education-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    SelectModule,
    RadioButtonModule,
    DatePickerModule,
    MessageModule,
    AutoFocusModule,
    TrimInput,
    FormFileUpload,
  ],
  templateUrl: './staffMember-education-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberEducationForm implements OnInit {
  readonly #staffMemberEducationAPI = inject(StaffMemberEducationAPI);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #route = inject(ActivatedRoute);
  readonly #fb = inject(NonNullableFormBuilder);
  protected educationForm!: FormGroup<EducationForm>;
  protected isSaving = signal(false);
  protected staffMemberEducation = signal<IStaffMemberEducationInfo | undefined>(undefined);
  protected scoreTypes: ScoreType[] = this.#staffMemberEducationAPI.scoreTypes();
  protected selectedFile: File | null = null;
  protected loginInfo!: LoginInfo;

  constructor() {
    this.staffMemberEducation.set(this.#dynamicDialogConfig.data.staffMemberEducation);

    this.initForm();

    effect(() => {
      this.isSaving.set(this.#staffMemberEducationAPI.isSaving());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    if (this.staffMemberEducation()?.id) {
      this.patchForm();
    }

    this.educationForm
      .get('isEducationGapBeforeDegree')!
      .valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((hasGap: boolean) => {
        const gapYears = this.educationForm.controls.gapYears;
        const reasonOfEducationGap = this.educationForm.controls.reasonOfEducationGap;
        if (hasGap) {
          gapYears.setValidators([Validators.required]);
          gapYears.enable({ emitEvent: false });
          reasonOfEducationGap.setValidators([Validators.required]);
          reasonOfEducationGap.enable({ emitEvent: false });
        } else {
          gapYears.clearValidators();
          gapYears.disable({ emitEvent: false });
          reasonOfEducationGap.clearValidators();
          reasonOfEducationGap.disable({ emitEvent: false });
        }
        gapYears.updateValueAndValidity({ emitEvent: false });
        reasonOfEducationGap.updateValueAndValidity({ emitEvent: false });
      });
  }

  initForm() {
    this.educationForm = this.#fb.group({
      degree: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern(LABEL_PATTERN)],
      ],
      instituteName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern(LABEL_PATTERN)],
      ],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      scoreType: ['', Validators.required],
      scoreValue: ['', Validators.required],
      gradeDivision: [''],
      isEducationGapBeforeDegree: [false, Validators.required],
      gapYears: [{ value: null, disabled: true }],
      reasonOfEducationGap: [{ value: '', disabled: true }],
      remark: [''],
      educationDocument: [''],
    }) as FormGroup<EducationForm>;
  }

  patchForm() {
    const startDate = this.staffMemberEducation()?.startDate
      ? parseISO(this.staffMemberEducation()!.startDate!)
      : '';

    const endDate = this.staffMemberEducation()?.endDate
      ? parseISO(this.staffMemberEducation()!.endDate!)
      : '';

    this.educationForm.patchValue({
      degree: this.staffMemberEducation()?.degree,
      instituteName: this.staffMemberEducation()?.instituteName,
      startDate: startDate,
      endDate: endDate,
      scoreType: this.staffMemberEducation()?.scoreType,
      scoreValue: this.staffMemberEducation()?.scoreValue,
      gradeDivision: this.staffMemberEducation()?.gradeDivision,
      isEducationGapBeforeDegree: this.staffMemberEducation()?.educationGap,
      gapYears: this.staffMemberEducation()?.gapYears || null,
      reasonOfEducationGap: this.staffMemberEducation()?.reasonOfEducationGap,
      remark: this.staffMemberEducation()?.remark,
      // educationDocument: this.staffMemberEducation()?.educationDocument,
    });
  }

  isInvalid(controlName: string) {
    const control = this.educationForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSelectFile(file: File | null) {
    if (file) {
      if (!(file.type === 'application/pdf')) {
        this.#commonService.showMessage('Only PDF documents are allowed!', 'error');
        return;
      }

      const validTypes = ['application/pdf'];
      if (!file.type || !validTypes.includes(file.type)) {
        const msg = 'Invalid file format. Allowed: PDF only.';
        this.#commonService.showMessage(msg, 'error');
        return;
      }
    }

    this.selectedFile = file;
  }

  async onSubmit() {
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const form = this.educationForm.getRawValue();

    const fd = new FormData();
    fd.append('UserStaffMemberId', sessionUser.staffMemberId);
    fd.append('StaffMemberId', queryStaffMemberId ? queryStaffMemberId : sessionUser.staffMemberId);
    fd.append('Degree', form.degree?.trim() || '');
    fd.append('InstituteName', form.instituteName?.trim() || '');
    fd.append('Remark', form.remark?.trim() || '');
    fd.append('StartDate', formatISO(form.startDate));
    fd.append('EndDate', formatISO(form.endDate));
    fd.append('ScoreType', form.scoreType?.toString() || '');
    fd.append('ScoreValue', form.scoreValue?.toString() || '');
    fd.append('GradeDivision', form.gradeDivision?.trim() || '');
    fd.append('IsEducationGapBeforeDegree', form.isEducationGapBeforeDegree ? 'true' : 'false');
    fd.append('GapYears', form.gapYears ? form.gapYears.toString() : '0'); // TODO: Calculate year count based on year selection
    fd.append('ReasonOfEducationGap', form.reasonOfEducationGap?.trim() || '');
    fd.append('HasEducationDocUploded', (!!this.selectedFile).toString());
    fd.append('EducationDocument', this.selectedFile || '');

    // Update payload
    if (this.staffMemberEducation()?.id) {
      fd.append('Id', (this.staffMemberEducation()?.id ?? 0).toString());
    }

    const saveRequest$ = this.staffMemberEducation()?.id
      ? this.#staffMemberEducationAPI.updateStaffMemberEducation(fd)
      : this.#staffMemberEducationAPI.createStaffMemberEducation(fd);

    this.#staffMemberEducationAPI.setIsSaving(true);
    saveRequest$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.#staffMemberEducationAPI.setIsSaving(false)),
      )
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res.data);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
