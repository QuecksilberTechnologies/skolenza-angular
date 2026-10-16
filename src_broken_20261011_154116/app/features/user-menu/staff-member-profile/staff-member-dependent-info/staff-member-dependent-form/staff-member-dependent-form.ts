import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { formatISO, parseISO } from 'date-fns';
import { finalize } from 'rxjs';

import { Common, StaffMemberDependentApi } from '@core/services';
import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';
import { DependentForm, StaffMemberDependent, LoginInfo, Relation } from '@shared/interfaces';
import { RELATIONS_DEPENDANT } from '@shared/utilities/common-data';
import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

@Component({
  selector: 'app-staffMember-dependent-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    DatePickerModule,
    ButtonModule,
    MessageModule,
    FormFileUpload,
  ],
  templateUrl: './staffMember-dependent-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberDependentForm implements OnInit {
  readonly #staffMemberDependentApi = inject(StaffMemberDependentApi);
  readonly #commonService = inject(Common);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #cd = inject(ChangeDetectorRef);
  readonly staffMemberDependent = signal<StaffMemberDependent | undefined>(undefined);
  readonly relationsOptions = signal<Relation[]>(RELATIONS_DEPENDANT);
  readonly today = new Date();
  readonly isSaving = signal(false);
  protected dependentForm!: FormGroup<DependentForm>;
  protected loginInfo!: LoginInfo;
  protected selectedFile: File | null = null;

  constructor() {
    this.staffMemberDependent.set(this.#dynamicDialogConfig.data.staffMemberDependent);

    this.initForm();

    effect(() => {
      this.isSaving.set(this.#staffMemberDependentApi.isSaving());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.#cd.markForCheck();

    if (this.staffMemberDependent()?.id) {
      this.patchForm();
    }

    // If the selected relation is 1 (Spouse), set isMarried to true and disable it
    this.dependentForm
      .get('relation')!
      .valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((value: number | null) => {
        const isSpouse = value === 1;
        this.dependentForm.controls.isMarried.patchValue(isSpouse, { emitEvent: false });
        if (isSpouse) {
          this.dependentForm.controls.isMarried.disable({ emitEvent: false });
        } else {
          this.dependentForm.controls.isMarried.enable({ emitEvent: false });
        }
      });
  }

  initForm() {
    this.dependentForm = this.#fb.group({
      dependentName: ['', [Validators.required, Validators.pattern(LABEL_PATTERN)]],
      relation: this.#fb.control<number | null>(null, Validators.required),
      dateOfBirth: ['', Validators.required],
      isMarried: [false],
      isCoveredInPolicy: [false],
      remark: [''],
      description: [''],
      proofFile: [''],
    }) as FormGroup<DependentForm>;
  }

  patchForm() {
    const dateOfBirth = this.staffMemberDependent()?.dateOfBirth
      ? parseISO(this.staffMemberDependent()!.dateOfBirth!)
      : '';

    this.dependentForm.patchValue({
      dependentName: this.staffMemberDependent()?.dependentName,
      relation: this.staffMemberDependent()?.relation ?? null,
      dateOfBirth: dateOfBirth,
      isMarried: this.staffMemberDependent()?.isMarried,
      isCoveredInPolicy: this.staffMemberDependent()?.isCoveredInPolicy,
      remark: this.staffMemberDependent()?.remark,
      description: this.staffMemberDependent()?.description,
    });
  }

  isInvalid(controlName: string) {
    const control = this.dependentForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSelectFile(file: File | null) {
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.#commonService.showMessage('Only image files are allowed!', 'error');
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!file.type || !validTypes.includes(file.type)) {
        const msg = 'Invalid file format. Allowed: JPG, PNG only.';
        this.#commonService.showMessage(msg, 'error');
        return;
      }
    }

    this.selectedFile = file;
  }

  onSubmit() {
    const form = this.dependentForm.getRawValue();
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;

    const fd = new FormData();
    fd.append('UserStaffMemberId', sessionUser.staffMemberId);
    fd.append('StaffMemberId', queryStaffMemberId ? queryStaffMemberId : sessionUser.staffMemberId);
    fd.append('DependentName', form.dependentName?.trim() || '');
    fd.append('Relation', String(form.relation ?? 0));
    fd.append('DateOfBirth', formatISO(form.dateOfBirth));
    fd.append('IsCoveredInPolicy', form.isCoveredInPolicy ? 'true' : 'false');
    fd.append('IsMarried', form.isMarried ? 'true' : 'false');
    fd.append('Remark', form.remark?.trim() || '');
    fd.append('Description', form.description?.trim() || '');
    fd.append('HasProofUploaded', (!!this.selectedFile).toString());

    if (this.selectedFile) {
      fd.append('ProofFile', this.selectedFile || '');
    }

    // Update payload
    if (this.staffMemberDependent()?.id) {
      fd.append('Id', (this.staffMemberDependent()?.id ?? 0).toString());
    }

    // Debuging
    // for (const [name, value] of fd) {
    // }

    const saveRequest$ = this.staffMemberDependent()?.id
      ? this.#staffMemberDependentApi.updateStaffMemberDependent(fd)
      : this.#staffMemberDependentApi.createStaffMemberDependent(fd);

    this.#staffMemberDependentApi.setIsSaving(true);
    saveRequest$
      .pipe(
        finalize(() => this.#staffMemberDependentApi.setIsSaving(false)),
        takeUntilDestroyed(this.#destroyRef),
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

  onCancel(): void {
    this.#dialogRef.close();
  }
}
