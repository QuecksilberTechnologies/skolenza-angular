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
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { finalize } from 'rxjs';

import { Common, StaffMemberBanksAPI } from '@core/services';
import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';
import { TrimInput } from '@shared/directives';
import { BankAccountType, BankForm, IStaffMemberBankInfo, LoginInfo } from '@shared/interfaces';

@Component({
  selector: 'app-staffMember-bank-form',
  imports: [
    InputTextModule,
    SelectModule,
    ButtonModule,
    CheckboxModule,
    ReactiveFormsModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    FormFileUpload,
    TrimInput,
    // JsonPipe,
  ],
  templateUrl: './staffMember-bank-form.html',
  styleUrl: './staffMember-bank-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberBankForm implements OnInit {
  readonly #staffMemberBanksAPI = inject(StaffMemberBanksAPI);
  readonly #commonService = inject(Common);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly staffMemberBank = signal<IStaffMemberBankInfo | undefined>(undefined);
  readonly isSaving = signal(false);
  protected bankForm!: FormGroup<BankForm>;
  protected selectedFile: File | null = null;
  protected loginInfo!: LoginInfo;

  protected bankAccountTypes: BankAccountType[] = [
    { name: 'Saving', value: 'saving' },
    { name: 'Current', value: 'current' },
    { name: 'Salary', value: 'salary' },
  ];

  constructor() {
    this.staffMemberBank.set(this.#dynamicDialogConfig.data.staffMemberBank);

    this.initForm();

    effect(() => {
      this.isSaving.set(this.#staffMemberBanksAPI.isSaving());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();

    if (this.staffMemberBank()?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.bankForm = this.#fb.group({
      bankName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[A-Za-z ]+$/),
        ],
      ],
      branchName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[A-Za-z0-9 ,.-]+$/),
        ],
      ],
      accountNumber: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      upiId: ['', [Validators.pattern(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)]],
      accountType: [{ value: 'saving', disabled: true }, Validators.required],
      primaryAccount: [false],
      cancelledCheque: [''],
    });
  }

  patchForm() {
    this.bankForm.patchValue({
      upiId: this.staffMemberBank()?.upiId,
      bankName: this.staffMemberBank()?.bankName,
      branchName: this.staffMemberBank()?.branchName,
      accountNumber: this.staffMemberBank()?.accountNumber,
      ifscCode: this.staffMemberBank()?.ifscCode,
      accountType: this.staffMemberBank()?.accountType,
      primaryAccount: this.staffMemberBank()?.isPrimaryAccount,
      // cancelledCheque: this.staffMemberBank()?.cancelledChequeFile,
    });
  }

  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();

    this.bankForm.get('ifscCode')?.setValue(input.value, {
      emitEvent: false,
    });
  }

  isInvalid(controlName: string) {
    const control = this.bankForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSelectFile(file: File | null) {
    if (file) {
      if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) {
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
    const form = this.bankForm.getRawValue();
    const queryStaffMemberId = this.#route.snapshot.queryParamMap.get('staffMemberId');
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;

    const fd = new FormData();
    fd.append('UserStaffMemberId', sessionUser.staffMemberId);
    fd.append('StaffMemberId', queryStaffMemberId ? queryStaffMemberId : sessionUser.staffMemberId);
    fd.append('BankName', form.bankName?.trim() || '');
    fd.append('AccountNumber', form.accountNumber?.trim() || '');
    fd.append('IFSCCode', form.ifscCode?.trim() || '');
    fd.append('BranchName', form.branchName?.trim() || '');
    fd.append('AccountType', form.accountType?.trim() || '');
    fd.append('UPIId', form.upiId?.trim() || '');
    fd.append('IsPrimaryAccount', form.primaryAccount ? 'true' : 'false');
    fd.append('CancelledChequeFile', this.selectedFile || '');

    if (this.staffMemberBank()?.id) {
      const id = this.staffMemberBank()?.id;
      if (id != null) fd.append('Id', String(id));
    }

    const saveRequest$ = this.staffMemberBank()?.id
      ? this.#staffMemberBanksAPI.updateStaffMemberBank(fd)
      : this.#staffMemberBanksAPI.createStaffMemberBank(fd);

    this.#staffMemberBanksAPI.setIsSaving(true);
    saveRequest$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.#staffMemberBanksAPI.setIsSaving(false)),
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
