import { formatDate } from '@angular/common';
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
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { finalize } from 'rxjs';

import { Common, StaffMemberIdentityApi } from '@core/services';
import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';
import { TrimInput } from '@shared/directives';
import { StaffMemberSensitive, LoginInfo } from '@shared/interfaces';
import {
  AADHAAR_PATTERN,
  DRIVING_LICENSE_PATTERN,
  PAN_PATTERN,
  PASSPORT_PATTERN,
  UAN_PATTERN,
  VOTER_ID_PATTERN,
} from '@shared/utilities/validation-regex';

const DOCUMENT_ALIASES: Record<string, string> = {
  AADHAR: 'AADHAAR',
  UID: 'AADHAAR',
  PANCARD: 'PAN',
  DL: 'DRIVINGLICENSE',
  DRIVINGLICENCE: 'DRIVINGLICENSE',
  EPIC: 'VOTERID',
  VOTER: 'VOTERID',
  UANNUMBER: 'UAN',
};

const DOCUMENT_PATTERNS: Record<string, RegExp> = {
  AADHAAR: AADHAAR_PATTERN,
  PAN: PAN_PATTERN,
  PASSPORT: PASSPORT_PATTERN,
  DRIVINGLICENSE: DRIVING_LICENSE_PATTERN,
  UAN: UAN_PATTERN,
  VOTERID: VOTER_ID_PATTERN,
};

const DOCUMENT_FORMAT_HINTS: Record<string, string> = {
  AADHAAR: 'must be 12 digits.',
  PAN: 'must be 5 letters, 4 digits and 1 letter, like ABCDE1234F.',
  PASSPORT: 'must be a letter followed by 5 to 8 letters or digits.',
  DRIVINGLICENSE: 'must be 8 to 20 letters, digits, spaces or hyphens.',
  UAN: 'must be 12 digits.',
  VOTERID: 'must be 3 letters followed by 7 digits, like ABC1234567.',
};

@Component({
  selector: 'app-staff-member-identity-form',
  imports: [
    ButtonModule,
    DatePickerModule,
    ReactiveFormsModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    FormFileUpload,
    TrimInput,
  ],
  templateUrl: './staff-member-identity-form.html',
  styleUrl: './staff-member-identity-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberIdentityForm implements OnInit {
  readonly #staffMemberIdentityApi = inject(StaffMemberIdentityApi);
  readonly #commonService = inject(Common);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);

  readonly documents = signal<StaffMemberSensitive[]>([]);
  readonly isSaving = this.#staffMemberIdentityApi.isSaving;
  protected readonly identityForm = new FormGroup<Record<string, FormControl<string>>>({});
  protected loginInfo!: LoginInfo;
  readonly #documentFiles = new Map<number, File>();
  /** Validity dates are offered only when the dialog edits one document. */
  protected readonly isSingle: boolean;
  protected readonly datesForm = new FormGroup(
    {
      effectiveFrom: new FormControl<Date | null>(null),
      effectiveTo: new FormControl<Date | null>(null),
    },
    { validators: dateRangeValidator },
  );

  constructor() {
    const editRow = this.#dynamicDialogConfig.data?.staffMemberSensitive as
      | StaffMemberSensitive
      | undefined;
    const catalogue = this.#staffMemberIdentityApi.staffMemberIdentities();
    const documents = editRow ? [editRow] : catalogue;

    this.documents.set(documents);
    this.isSingle = !!editRow;
    if (editRow) {
      this.datesForm.setValue(
        {
          effectiveFrom: parseDateOnly(editRow.effectiveFrom),
          effectiveTo: parseDateOnly(editRow.effectiveTo),
        },
        { emitEvent: false },
      );
      // Changed dates need a number, like an upload does (see onSelectDocument).
      this.datesForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        const control = this.identityForm.controls[this.controlName(editRow)];
        control.setValidators(this.#validatorsFor(editRow));
        control.updateValueAndValidity();
        control.markAsTouched();
      });
    }
    // Controls start empty: the API returns stored numbers masked, so pre-filling would post
    // the mask back as the real value. Only numbers the user types are sent.
    for (const document of documents) {
      this.identityForm.addControl(
        this.controlName(document),
        new FormControl('', {
          nonNullable: true,
          validators: this.#validatorsFor(document),
        }),
      );
    }
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  controlName(document: StaffMemberSensitive): string {
    return `document_${document.identityCategoryDocumentId}`;
  }

  placeholder(document: StaffMemberSensitive): string {
    return document.identityValue
      ? `On file: ${document.identityValue}`
      : `Enter ${document.documentName} number`;
  }

  isInvalid(document: StaffMemberSensitive): boolean {
    const control = this.identityForm.controls[this.controlName(document)];
    return control.invalid && control.touched;
  }

  validationMessage(document: StaffMemberSensitive): string {
    const control = this.identityForm.controls[this.controlName(document)];
    if (control.errors?.['required']) {
      if (this.#documentFiles.has(document.identityCategoryDocumentId)) {
        return `Enter the ${document.documentName} number to upload its document.`;
      }
      return this.datesForm.dirty
        ? `Enter the ${document.documentName} number to save its validity dates.`
        : `${document.documentName} is required.`;
    }
    if (control.errors?.['maxlength']) {
      return `${document.documentName} cannot exceed 100 characters.`;
    }
    const hint = DOCUMENT_FORMAT_HINTS[this.#normaliseCode(document.documentCode)];
    return hint ? `${document.documentName} ${hint}` : `Enter a valid ${document.documentName}.`;
  }

  onUpperCaseInput(document: StaffMemberSensitive, event: Event): void {
    const input = event.target as HTMLInputElement;
    const { selectionStart, selectionEnd } = input;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(selectionStart, selectionEnd);
    this.identityForm.controls[this.controlName(document)].setValue(input.value, {
      emitEvent: false,
    });
  }

  onSelectDocument(document: StaffMemberSensitive, file: File | null): void {
    const id = document.identityCategoryDocumentId;
    // The uploader has already rejected wrong types and oversized files, emitting null.
    if (file) {
      this.#documentFiles.set(id, file);
    } else {
      this.#documentFiles.delete(id);
    }

    // An upload needs its number: the stored one is masked and there is no file-only endpoint.
    const control = this.identityForm.controls[this.controlName(document)];
    control.setValidators(this.#validatorsFor(document));
    control.updateValueAndValidity();
    if (this.#documentFiles.has(id)) control.markAsTouched();
  }

  onSubmit(): void {
    if (this.identityForm.invalid || this.datesForm.invalid) {
      this.identityForm.markAllAsTouched();
      this.datesForm.markAllAsTouched();
      return;
    }

    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) {
      this.#commonService.showMessage(
        'Your session is still loading. Try again in a moment.',
        'warn',
      );
      return;
    }

    const fd = this.#buildIdentitiesBody(sessionUser.staffMemberId);
    if (!fd) return;

    this.#staffMemberIdentityApi.setIsSaving(true);
    this.#staffMemberIdentityApi
      .createStaffMemberSensitive(fd)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.#staffMemberIdentityApi.setIsSaving(false)),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res.data);
          }
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  #buildIdentitiesBody(userStaffMemberId: string): FormData | null {
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const fd = new FormData();
    let index = 0;

    for (const document of this.documents()) {
      const identityValue = this.identityForm.controls[this.controlName(document)].value.trim();
      // A picked file makes the number required (see onSelectDocument), so a blank row has none.
      if (!identityValue) continue;

      fd.append(`Identities[${index}].UserStaffMemberId`, userStaffMemberId);
      fd.append(`Identities[${index}].StaffMemberId`, queryStaffMemberId || userStaffMemberId);
      fd.append(
        `Identities[${index}].IdentityCategoryDocumentId`,
        String(document.identityCategoryDocumentId),
      );
      fd.append(`Identities[${index}].DocumnetCode`, document.documentCode);
      fd.append(`Identities[${index}].IdentityValue`, identityValue);

      const file = this.#documentFiles.get(document.identityCategoryDocumentId);
      if (file) {
        fd.append(`Identities[${index}].IdentityDocumentFile`, file);
      }
      if (this.isSingle) {
        const { effectiveFrom, effectiveTo } = this.datesForm.getRawValue();
        if (effectiveFrom) {
          fd.append(`Identities[${index}].EffectiveFrom`, toDateOnly(effectiveFrom));
        }
        if (effectiveTo) fd.append(`Identities[${index}].EffectiveTo`, toDateOnly(effectiveTo));
      }
      index++;
    }

    if (index === 0) {
      this.#commonService.showMessage('Enter at least one identity number before saving.', 'warn');
      return null;
    }

    return fd;
  }

  #validatorsFor(document: StaffMemberSensitive) {
    const validators = [Validators.maxLength(100)];
    // A mandatory document already on file is satisfied; leaving it blank keeps the stored value.
    const needsNumber =
      (document.isMandatory && !document.identityValue) ||
      this.#documentFiles.has(document.identityCategoryDocumentId) ||
      (this.isSingle && this.datesForm.dirty);
    if (needsNumber) validators.push(Validators.required);

    const pattern = DOCUMENT_PATTERNS[this.#normaliseCode(document.documentCode)];
    if (pattern) validators.push(Validators.pattern(pattern));
    return validators;
  }

  #normaliseCode(code: string | undefined): string {
    const key = (code ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    return DOCUMENT_ALIASES[key] ?? key;
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}

/** The API takes `yyyy-MM-dd`; `toISOString` would shift the day in zones east of UTC. */
function toDateOnly(date: Date): string {
  return formatDate(date, 'yyyy-MM-dd', 'en-US');
}

/** Reads the date part as a local date, so "2026-01-01" never becomes Dec 31. */
function parseDateOnly(value: string | null | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return match ? new Date(+match[1], +match[2] - 1, +match[3]) : null;
}

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const { effectiveFrom, effectiveTo } = group.value as {
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
  };
  return effectiveFrom && effectiveTo && effectiveTo < effectiveFrom ? { dateRange: true } : null;
}
