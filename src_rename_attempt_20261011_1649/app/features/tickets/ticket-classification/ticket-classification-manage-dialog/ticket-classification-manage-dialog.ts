import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { Common } from '@core/services';
import { TrimInput } from '@shared/directives';
import { TicketApi } from '@tickets/ticket-api';

import { UpsertTicketClassificationRequest, TicketClassificationForm } from '../../models';

@Component({
  selector: 'app-ticket-classification-manage-dialog',
  imports: [
    ReactiveFormsModule,
    AutoFocusModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    MessageModule,
    TrimInput,
  ],
  templateUrl: './ticket-classification-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketClassificationManageDialog implements OnInit {
  readonly #commonService = inject(Common);
  readonly #ticketMasterApi = inject(TicketApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  protected classificationForm!: FormGroup<TicketClassificationForm>;
  protected classification = this.#dynamicDialogConfig.data?.classification;
  protected isSaving = signal(false);

  constructor() {
    this.initForm();
  }

  async ngOnInit() {
    if (this.classification?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.classificationForm = this.#fb.group({
      classificationName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
    });
  }

  patchForm() {
    this.classificationForm.patchValue({
      classificationName: this.classification.classificationName,
      description: this.classification.description ?? '',
    });
  }

  isInvalid(controlName: string) {
    const control = this.classificationForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSubmit() {
    const form = this.classificationForm.getRawValue();

    const body: UpsertTicketClassificationRequest = {
      classificationName: form.classificationName,
      description: form.description,
      isActive: true,
    };

    if (this.classification?.id) {
      body.id = this.classification.id;
    }

    const saveRequest$ = this.classification?.id
      ? this.#ticketMasterApi.updateClassification(body)
      : this.#ticketMasterApi.addClassification(body);

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
