import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';

import { Common, StaffMembersApi } from '@core/services';
import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';
import { IStaffMember } from '@shared/interfaces';
import { TicketApi } from '@tickets/ticket-api';

import {
  StaffMemberOption,
  GetTicketHeadersRequest,
  OpenTicketRequest,
  PriorityOption,
  TicketClassificationDdl,
  TicketHeader,
  TicketTypeDdl,
} from '../../models';

@Component({
  selector: 'app-ticket-manage-dialog',
  imports: [
    ButtonModule,
    TextareaModule,
    SelectModule,
    ReactiveFormsModule,
    MessageModule,
    AutoFocusModule,
    FormFileUpload,
  ],
  templateUrl: './ticket-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketManageDialog implements OnInit {
  readonly #fb = inject(FormBuilder);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #ticketApi = inject(TicketApi);
  readonly #common = inject(Common);
  readonly #staffMembersApi = inject(StaffMembersApi);
  protected isSaving = signal(false);
  protected isLoadingHeaders = signal(false);
  protected isLoadingTypes = signal(false);
  protected isLoadingClassifications = signal(false);
  protected isLoadingStaffMembers = signal(false);
  protected ticketForm!: FormGroup;

  protected readonly priorityOptions: PriorityOption[] = [
    { id: 1, label: 'Low' },
    { id: 2, label: 'Medium' },
    { id: 3, label: 'High' },
    { id: 4, label: 'Urgent' },
  ];

  // Populated from store via dialog data — DDL fallback if empty
  protected classifications = signal<TicketClassificationDdl[]>(
    this.#dialogConfig.data?.classificationOptions ?? [],
  );

  protected headers = signal<TicketHeader[]>([]);
  protected types = signal<TicketTypeDdl[]>([]);
  protected staffMembers = signal<IStaffMember[]>([]);
  protected selectedAttachment: File | null = null;

  protected staffMemberOptions = computed<StaffMemberOption[]>(() =>
    this.staffMembers().map((emp) => ({
      numericId: parseInt(emp.staffMemberId, 10),
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
    })),
  );

  private userNumericStaffMemberId = signal<number>(this.#dialogConfig.data?.requestedForUserId ?? 0);

  async ngOnInit() {
    this.initForm();

    const tasks: Promise<void>[] = [this.loadStaffMembers(), this.loadTypeDdl()];
    if (!this.classifications().length) {
      tasks.push(this.loadClassifications());
    }
    await Promise.all(tasks);

    this.ticketForm.get('ticketClassificationId')!.valueChanges.subscribe((classificationId) => {
      this.ticketForm.patchValue({ ticketHeaderId: null, ticketTypeId: null });
      this.headers.set([]);
      if (classificationId) this.loadHeaders(classificationId);
    });
  }

  private async loadClassifications() {
    this.isLoadingClassifications.set(true);
    this.#ticketApi.getClassificationDdl().subscribe({
      next: (res) => {
        this.classifications.set(res.isSucceeded ? res.data : []);
        this.isLoadingClassifications.set(false);
      },
      error: () => this.isLoadingClassifications.set(false),
    });
  }

  private loadTypeDdl(): Promise<void> {
    this.isLoadingTypes.set(true);
    return new Promise((resolve) => {
      this.#ticketApi.getTicketTypeDdl().subscribe({
        next: (res) => {
          this.types.set(res.isSucceeded ? res.data : []);
          this.isLoadingTypes.set(false);
          resolve();
        },
        error: () => {
          this.isLoadingTypes.set(false);
          resolve();
        },
      });
    });
  }

  private async loadStaffMembers() {
    const loginInfo = await this.#common.getLoginInfo();
    const staffMemberId = loginInfo?.user?.staffMemberId ?? '0';

    if (!this.userNumericStaffMemberId()) {
      this.userNumericStaffMemberId.set(parseInt(staffMemberId, 10));
      this.ticketForm.patchValue({ requestedForUserId: this.userNumericStaffMemberId() });
    }

    this.isLoadingStaffMembers.set(true);
    this.#staffMembersApi
      .getAllStaffMembers({
        UserStaffMemberId: staffMemberId,
        PageNumber: 1,
        PageSize: 200,
        SortBy: 'firstName',
        SortOrder: 'asc',
      })
      .subscribe({
        next: (res) => {
          this.staffMembers.set(res.isSucceeded ? res.data : []);
          this.isLoadingStaffMembers.set(false);
        },
        error: () => this.isLoadingStaffMembers.set(false),
      });
  }

  private loadHeaders(classificationId: number) {
    this.isLoadingHeaders.set(true);
    const req: GetTicketHeadersRequest = {
      PageNumber: 1,
      PageSize: 1000,
      SortBy: 'headerName',
      SortOrder: 'asc',
      TicketClassifyId: classificationId,
      IsActive: true,
    };
    this.#ticketApi.getHeaders(req).subscribe({
      next: (res) => {
        this.headers.set(res.isSucceeded ? res.data : []);
        this.isLoadingHeaders.set(false);
      },
      error: () => this.isLoadingHeaders.set(false),
    });
  }

  private initForm() {
    this.ticketForm = this.#fb.group({
      ticketClassificationId: [null, Validators.required],
      ticketHeaderId: [null, Validators.required],
      ticketTypeId: [null, Validators.required],
      priority: [null, Validators.required],
      description: ['', Validators.required],
      requestedForUserId: [this.userNumericStaffMemberId() || null, Validators.required],
    });
  }

  protected isInvalid(controlName: string): boolean {
    const control = this.ticketForm.get(controlName);
    return !!(control?.invalid && control.touched);
  }

  protected onAttachmentSelect(file: File | null) {
    this.selectedAttachment = file;
  }

  protected onCreate(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    const form = this.ticketForm.value;
    const body: OpenTicketRequest = {
      ticketClassificationId: form.ticketClassificationId,
      ticketHeaderId: form.ticketHeaderId,
      ticketTypeId: form.ticketTypeId,
      description: form.description,
      priority: form.priority,
      requestedForUserId: form.requestedForUserId,
      attachmentUrls: [],
    };

    this.isSaving.set(true);
    this.#ticketApi.openTicket(body).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.isSucceeded) {
          this.#common.showMessage(res.message || 'Ticket created successfully.', 'success');
          this.#dialogRef.close(true);
        } else {
          this.#common.showMessage(res.message || 'Failed to create ticket.', 'error');
        }
      },
      error: () => {
        this.isSaving.set(false);
        this.#common.showMessage('An error occurred while creating the ticket.', 'error');
      },
    });
  }

  protected onCancel(): void {
    this.#dialogRef.close();
  }
}
