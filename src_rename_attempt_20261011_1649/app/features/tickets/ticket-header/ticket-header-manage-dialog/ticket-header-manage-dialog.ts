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
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { Common } from '@core/services';
import { TrimInput } from '@shared/directives';
import { TicketApi } from '@tickets/ticket-api';

import { TicketClassificationDdl, UpsertTicketHeaderRequest, TicketHeaderForm } from '../../models';

@Component({
  selector: 'app-ticket-header-manage-dialog',
  imports: [
    ReactiveFormsModule,
    AutoFocusModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    MessageModule,
    SelectModule,
    TrimInput,
  ],
  templateUrl: './ticket-header-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketHeaderManageDialog implements OnInit {
  readonly #commonService = inject(Common);
  readonly #ticketMasterApi = inject(TicketApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly classificationOptions = signal<TicketClassificationDdl[]>(
    this.#dialogConfig.data?.classificationOptions ?? [],
  );
  protected isSaving = signal(false);
  protected headerForm!: FormGroup<TicketHeaderForm>;
  protected header = this.#dialogConfig.data?.header;

  constructor() {
    this.initForm();
  }

  async ngOnInit() {
    if (this.header?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.headerForm = this.#fb.group({
      classificationId: new FormControl<number | null>(null, Validators.required),
      headerName: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
    });
  }

  patchForm() {
    this.headerForm.patchValue({
      classificationId: this.header.classificationId ? +this.header.classificationId : null,
      headerName: this.header.headerName,
      description: this.header.description ?? '',
    });
  }

  isInvalid(controlName: string) {
    const control = this.headerForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSubmit() {
    const form = this.headerForm.getRawValue();
    const selectedClassification = this.classificationOptions().find(
      (c: TicketClassificationDdl) => c.id === form.classificationId,
    );

    const body: UpsertTicketHeaderRequest = {
      headerName: form.headerName,
      ticketClassificationId: form.classificationId!,
      ticketClassificationName: selectedClassification?.classificationName ?? '',
      description: form.description,
      isActive: true,
    };

    if (this.header?.id) {
      body.id = +this.header.id;
    }

    const saveRequest$ = this.header?.id
      ? this.#ticketMasterApi.updateHeader(body)
      : this.#ticketMasterApi.addHeader(body);

    this.isSaving.set(true);
    saveRequest$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.isSaving.set(false)),
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
