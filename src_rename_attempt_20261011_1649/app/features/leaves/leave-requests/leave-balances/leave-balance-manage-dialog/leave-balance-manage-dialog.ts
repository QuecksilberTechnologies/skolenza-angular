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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { finalize } from 'rxjs';

import { Common, StaffMembersApi } from '@core/services';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { GetAllStaffMembersReq, IStaffMember, ILeaveBalance, LoginInfo } from '@shared/interfaces';

@Component({
  selector: 'app-leave-balance-manage-dialog',
  imports: [
    UserAvatar,
    ButtonModule,
    ReactiveFormsModule,
    InputNumberModule,
    SelectModule,
    MessageModule,
  ],
  templateUrl: './leave-balance-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveBalanceManageDialog implements OnInit {
  readonly #staffMemberApi = inject(StaffMembersApi);
  readonly #commonService = inject(Common);
  readonly #fb = inject(FormBuilder);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);
  readonly staffMembers = signal<IStaffMember[]>([]);
  protected leaveBalanceForm!: FormGroup;
  protected isSubmitting = signal(false);
  protected isLoading = signal(false);
  protected leaveBalance!: ILeaveBalance;
  protected loginInfo!: LoginInfo;

  constructor() {
    this.leaveBalance = this.#dynamicDialogConfig.data.leaveBalance;

    this.leaveBalanceForm = this.#fb.group({
      staffMember: [null, [Validators.required, Validators.minLength(3)]],
      vacation: [0],
      sick: [0],
      personal: [0],
      maternity: [0],
      paternity: [0],
    });

    if (this.leaveBalance) {
      this.leaveBalanceForm.patchValue({
        vacation: this.leaveBalance.vacation,
        sick: this.leaveBalance.sick,
        personal: this.leaveBalance.personal,
        maternity: this.leaveBalance.maternity,
        paternity: this.leaveBalance.paternity,
      });
    }

    effect(() => {
      this.staffMembers.set(this.#staffMemberApi.staffMembers());
    });
  }

  isInvalid(controlName: string) {
    const control = this.leaveBalanceForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.fetchStaffMembers();
  }

  async fetchStaffMembers() {
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;

    const body: GetAllStaffMembersReq = {
      UserStaffMemberId: sessionUser.staffMemberId,
    };

    this.isLoading.set(true);
    this.#staffMemberApi
      .getAllStaffMembers(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (rs) => {
          this.#staffMemberApi.setStaffMembers(rs.data);
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async onSubmit() {
    this.#commonService.showMessage(
      'This operation is not yet implemented. Please check back later.',
      'warn',
    );
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
