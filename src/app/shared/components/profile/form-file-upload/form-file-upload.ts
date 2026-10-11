import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FileSelectEvent, FileUploadModule } from '@openng/optimus-ui/fileupload';
import { MessageModule } from '@openng/optimus-ui/message';

@Component({
  selector: 'app-form-file-upload',
  imports: [FileUploadModule, MessageModule],
  templateUrl: './form-file-upload.html',
  styleUrl: './form-file-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFileUpload {
  readonly accept = input<string>('image/*,application/pdf');
  /** Bytes. Optimus rejects anything larger before it reaches the form. */
  readonly maxFileSize = input(5_000_000);
  readonly helpMessage = input<string | null>(null);
  readonly existingFileName = input<string | null | undefined>(null);
  readonly existingFilePath = input<string | null | undefined>(null);
  readonly selectedFile = output<File | null>();

  // Auto-derive a sensible default from the accept value
  readonly defaultHelpMessage = computed(() => {
    const acceptVal = this.accept();

    if (acceptVal === 'image/*') return 'Only image files. Max size 5MB.';
    if (acceptVal === 'application/pdf') return 'Only PDF files. Max size 5MB.';
    if (acceptVal === 'image/*,application/pdf') return 'Only images or PDF files. Max size 5MB.';

    return `Accepted: ${acceptVal}. Max size 5MB.`;
  });

  // Optimus copy, with {0} as the file name. It joins summary and detail with a space.
  protected readonly invalidTypeSummary = '{0} is not a supported file type.';
  protected readonly invalidSizeSummary = '{0} is too large.';
  protected readonly invalidSizeDetail = computed(
    () => `Maximum size is ${this.maxFileSize() / 1_000_000}MB.`,
  );

  onSelectFile(event: FileSelectEvent) {
    // `files` is the raw pick; `currentFiles` holds only what passed `accept` and
    // `maxFileSize`. A rejected pick also empties the preview, so emit null to match.
    this.selectedFile.emit(event.currentFiles[0] ?? null);
  }

  onRemoveFile() {
    this.selectedFile.emit(null);
  }

  choose(event: unknown, callback: () => void): void {
    callback();
  }
}
