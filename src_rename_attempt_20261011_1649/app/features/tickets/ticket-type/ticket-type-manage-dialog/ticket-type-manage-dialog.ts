import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { catchError, finalize, map, of } from 'rxjs';

import { Common, RolesApi } from '@core/services';
import { TrimInput } from '@shared/directives';
import { Role } from '@shared/interfaces';
import { TicketApi } from '@tickets/ticket-api';

import {
  GetTicketHeadersRequest,
  TicketClassificationDdl,
  TicketHeader,
  TicketType,
  UpsertTicketTypeRequest,
} from '../../models';

interface TicketTypeForm {
  ticketHeaderId: FormControl<number | null>;
  ticketTypeName: FormControl<string>;
  description: FormControl<string>;
  responsibleRoleId: FormControl<number | null>;
  isApprovalRequired: FormControl<boolean>;
  approvalRoleId: FormControl<number | null>;
  autoApproveIfSameRole: FormControl<boolean>;
  slaHours: FormControl<number | null>;
  isAttachmentRequired: FormControl<boolean>;
  isActiveForAllUsers: FormControl<boolean>;
}

@Component({
  selector: 'app-ticket-type-manage-dialog',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    AutoFocusModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    MessageModule,
    SelectModule,
    TrimInput,
    CheckboxModule,
  ],
  templateUrl: './ticket-type-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketTypeManageDialog {
  readonly #commonService = inject(Common);
  readonly #ticketMasterApi = inject(TicketApi);
  readonly #rolesApi = inject(RolesApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  protected type?: TicketType;
  protected isSaving = signal(false);
  readonly #initialHeaderOptions = signal<TicketHeader[]>(
    this.#dialogConfig.data?.initialHeaderOptions ?? [],
  );
  protected selectedClassificationId = signal<number | null>(
    this.#resolveInitialClassificationId(),
  );
  readonly #userStaffMemberId = signal<string | undefined>(undefined);
  readonly classificationOptions = signal<TicketClassificationDdl[]>(
    this.#dialogConfig.data?.classificationOptions ?? [],
  );

  readonly #rolesResource = rxResource({
    params: () => {
      const staffMemberId = this.#userStaffMemberId();
      return staffMemberId !== undefined ? { staffMemberId } : undefined;
    },
    stream: ({ params }) =>
      this.#rolesApi.getRoleOptions({ UserStaffMemberId: params.staffMemberId, IsActive: true }).pipe(
        map((res) => (res.isSucceeded ? res.data : [])),
        catchError(() => of([] as Role[])),
      ),
  });

  readonly roleOptions = computed<Role[]>(() => this.#rolesResource.value() ?? []);
  readonly isLoadingRoles = computed(() => this.#rolesResource.isLoading());

  readonly #headersResource = rxResource({
    params: () => {
      const classificationId = this.selectedClassificationId();
      return classificationId != null ? { classificationId } : undefined;
    },
    stream: ({ params }) => {
      const req: GetTicketHeadersRequest = {
        PageNumber: 1,
        PageSize: 1000,
        SortBy: 'headerName',
        SortOrder: 'asc',
        IsActive: true,
        TicketClassifyId: params.classificationId,
      };
      return this.#ticketMasterApi.getHeaders(req).pipe(
        map((res) => (res.isSucceeded ? res.data : [])),
        catchError(() => of([] as TicketHeader[])),
      );
    },
  });

  // Fall back to pre-loaded options while the resource hasn't fired yet
  readonly headerOptions = computed<TicketHeader[]>(
    () => this.#headersResource.value() ?? this.#initialHeaderOptions(),
  );
  readonly isLoadingHeaders = computed(() => this.#headersResource.isLoading());

  protected typeForm = new FormGroup<TicketTypeForm>({
    ticketHeaderId: new FormControl(null, Validators.required),
    ticketTypeName: new FormControl('', {
      validators: [Validators.required, Validators.minLength(2)],
      nonNullable: true,
    }),
    description: new FormControl('', { nonNullable: true }),
    responsibleRoleId: new FormControl(null),
    isApprovalRequired: new FormControl(false, { nonNullable: true }),
    approvalRoleId: new FormControl(null),
    autoApproveIfSameRole: new FormControl(false, { nonNullable: true }),
    slaHours: new FormControl(null),
    isAttachmentRequired: new FormControl(false, { nonNullable: true }),
    isActiveForAllUsers: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    this.type = this.#dialogConfig.data?.type;

    this.#commonService.getLoginInfo().then((info) => {
      this.#userStaffMemberId.set(info?.user?.staffMemberId ?? '0');
    });

    if (this.type?.id) {
      this.typeForm.patchValue({
        ticketHeaderId: this.type.ticketHeaderId ?? null,
        ticketTypeName: this.type.ticketTypeName,
        description: this.type.description ?? '',
        responsibleRoleId: this.type.responsibleRoleId ?? null,
        isApprovalRequired: this.type.isApprovalRequired ?? false,
        approvalRoleId: this.type.approvalId ?? null,
        autoApproveIfSameRole: this.type.autoApproveIfSameRole ?? false,
        slaHours: this.type.slaHours ?? null,
        isAttachmentRequired: this.type.isAttachmentRequired ?? false,
        isActiveForAllUsers: this.type.isActiveForAllUsers ?? true,
      });

      // Resolve classification when it isn't provided in the type response
      if (this.selectedClassificationId() == null && this.type.ticketHeaderId) {
        this.#resolveClassificationFromApi(this.type.ticketHeaderId);
      }
    }
  }

  isInvalid(controlName: string) {
    const control = this.typeForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onClassificationChange(classificationId: number | null) {
    this.selectedClassificationId.set(classificationId);
    this.typeForm.controls.ticketHeaderId.reset(null);
  }

  onSubmit() {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }
    if (this.type?.id) {
      this.updateType();
    } else {
      this.addType();
    }
  }

  private addType() {
    const v = this.typeForm.getRawValue();

    const body: UpsertTicketTypeRequest = {
      ticketTypeName: v.ticketTypeName,
      ticketHeaderId: v.ticketHeaderId!,
      description: v.description,
      responsibleRoleId: v.responsibleRoleId ?? undefined,
      isApprovalRequired: v.isApprovalRequired,
      approvalRoleId: v.approvalRoleId ?? undefined,
      autoApproveIfSameRole: v.autoApproveIfSameRole,
      slaHours: v.slaHours ?? undefined,
      isAttachmentRequired: v.isAttachmentRequired,
      isActiveForAllUsers: v.isActiveForAllUsers,
      isActive: true,
    };

    this.isSaving.set(true);
    this.#ticketMasterApi
      .addType(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) this.#dialogRef.close(true);
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  private updateType() {
    const v = this.typeForm.getRawValue();

    const body: UpsertTicketTypeRequest = {
      id: this.type!.id,
      ticketTypeName: v.ticketTypeName,
      ticketHeaderId: v.ticketHeaderId!,
      description: v.description,
      responsibleRoleId: v.responsibleRoleId ?? undefined,
      isApprovalRequired: v.isApprovalRequired,
      approvalRoleId: v.approvalRoleId ?? undefined,
      autoApproveIfSameRole: v.autoApproveIfSameRole,
      slaHours: v.slaHours ?? undefined,
      isAttachmentRequired: v.isAttachmentRequired,
      isActiveForAllUsers: v.isActiveForAllUsers,
      isActive: true,
    };

    this.isSaving.set(true);
    this.#ticketMasterApi
      .updateType(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) this.#dialogRef.close(true);
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  onCancel() {
    this.#dialogRef.close();
  }

  #resolveInitialClassificationId(): number | null {
    const type: TicketType | undefined = this.#dialogConfig.data?.type;
    if (type?.classificationId) return +type.classificationId;

    const fallback = this.#dialogConfig.data?.selectedClassificationId;
    if (fallback) return +fallback;

    // Derive from pre-loaded header options using the type's ticketHeaderId
    const headers: TicketHeader[] = this.#dialogConfig.data?.initialHeaderOptions ?? [];
    if (type?.ticketHeaderId && headers.length) {
      const match = headers.find((h) => +h.id === type.ticketHeaderId);
      if (match?.classificationId) return +match.classificationId;
    }

    return null;
  }

  #resolveClassificationFromApi(ticketHeaderId: number): void {
    this.#ticketMasterApi
      .getHeaders({
        PageNumber: 1,
        PageSize: 1000,
        SortBy: 'headerName',
        SortOrder: 'asc',
        IsActive: true,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((res) => {
        if (!res.isSucceeded) return;
        const match = res.data.find((h) => +h.id === ticketHeaderId);
        if (match?.classificationId) {
          this.selectedClassificationId.set(+match.classificationId);
          // Re-patch header after classification loads so the select can bind
          this.typeForm.controls.ticketHeaderId.setValue(ticketHeaderId);
        }
      });
  }
}
