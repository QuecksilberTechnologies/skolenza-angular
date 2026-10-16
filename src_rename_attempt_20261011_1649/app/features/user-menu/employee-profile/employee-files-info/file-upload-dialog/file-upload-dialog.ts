import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';

import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';

interface DocumentType {
  label: string;
  value: string;
}

@Component({
  selector: 'app-file-upload-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FormFileUpload,
    MessageModule,
  ],
  templateUrl: './file-upload-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadDialog {
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly isSaving = signal(false);
  readonly selectedFile = signal<File | null>(null);

  readonly documentTypes: DocumentType[] = [
    { label: 'Identity Proof', value: 'identity' },
    { label: 'Address Proof', value: 'address' },
    { label: 'Education Certificate', value: 'education' },
    { label: 'Experience Letter', value: 'experience' },
    { label: 'Offer Letter', value: 'offer_letter' },
    { label: 'Salary Slip', value: 'salary_slip' },
    { label: 'Other', value: 'other' },
  ];

  readonly uploadForm = new FormGroup({
    documentName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    documentType: new FormControl<DocumentType | null>(null, [Validators.required]),
  });

  isInvalid(controlName: string): boolean {
    const control = this.uploadForm.get(controlName);
    return !!control?.invalid && !!control?.touched;
  }

  onFileSelect(file: File | null) {
    this.selectedFile.set(file);
  }

  onCancel() {
    this.#dialogRef.close();
  }

  onUpload() {
    this.uploadForm.markAllAsTouched();
    if (this.uploadForm.invalid || !this.selectedFile()) return;

    this.isSaving.set(true);

    const result = {
      documentName: this.uploadForm.value.documentName,
      documentType: this.uploadForm.value.documentType?.value,
      file: this.selectedFile(),
    };

    // TODO: Replace with actual API call
    this.#dialogRef.close(result);
  }
}
