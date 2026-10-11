import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { Common, ReportTypeApi } from '@core/services';
import { TrimInput } from '@shared/directives';
import {
  AddReportTypeRequest,
  LoginInfo,
  ReportType,
  UpdateReportTypeRequest,
} from '@shared/interfaces';
import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

interface ReportTypeFormControls {
  typeName: FormControl<string>;
  description: FormControl<string>;
  isActive: FormControl<boolean>;
}

@Component({
  selector: 'app-report-type-manage-dialog',
  imports: [
    ReactiveFormsModule,
    AutoFocusModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    MessageModule,
    TrimInput,
  ],
  templateUrl: './report-type-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ReportTypeManageDialog implements OnInit {
  readonly #reportTypeApi = inject(ReportTypeApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  protected form!: FormGroup<ReportTypeFormControls>;
  protected reportType!: ReportType;
  protected loginInfo!: LoginInfo;
  protected isSaving = signal(false);
  readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  constructor() {
    this.reportType = this.#dynamicDialogConfig.data.reportType;
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    if (this.reportType?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.form = this.#fb.group({
      typeName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern(LABEL_PATTERN)],
      ],
      description: ['', Validators.maxLength(250)],
      isActive: [true],
    });
  }

  patchForm() {
    this.form.patchValue({
      typeName: this.reportType.typeName,
      description: this.reportType.description ?? '',
      isActive: this.reportType.isActive ?? true,
    });
  }

  isInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control?.invalid && control.touched;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.reportType?.id) {
      this.updateReportType();
    } else {
      this.addReportType();
    }
  }

  addReportType() {
    const form = this.form.value;
    const body: AddReportTypeRequest = {
      typeName: form.typeName?.trim() ?? '',
      // `/ReportingType/create` answers an empty `description` with a 500, so a blank one is omitted.
      description: form.description?.trim() || undefined,
      isActive: form.isActive ?? true,
    };

    this.isSaving.set(true);
    this.#reportTypeApi
      .addReportType(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
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

  updateReportType() {
    const form = this.form.value;
    const sessionUser = this.loginInfo?.user;
    const body: UpdateReportTypeRequest = {
      id: this.reportType.id,
      staffMemberId: 0,
      roleId: sessionUser?.primaryRole?.roleId ?? 0,
      typeName: form.typeName?.trim() ?? '',
      description: form.description?.trim() ?? '',
      isActive: form.isActive ?? true,
    };

    this.isSaving.set(true);
    this.#reportTypeApi
      .updateReportType(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
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

  onCancel() {
    this.#dialogRef.close();
  }
}
