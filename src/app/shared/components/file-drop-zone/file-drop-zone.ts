import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FileSelectEvent, FileUpload, FileUploadModule } from '@openng/optimus-ui/fileupload';

/**
 * Dashed drop target with a Browse button, shared by the import dialogs.
 *
 * Validation stays with the caller: a drop skips the picker's `accept`, so whatever handles
 * {@link dropped} has to check the count and extension itself.
 *
 * Owns the `#filelabel` marker so a host template keeps its own reference names free.
 */
@Component({
  selector: 'app-file-drop-zone',
  imports: [FileUploadModule],
  template: `
    <!--
      The drop target is a convenience over the Browse button, never the only way in: it takes
      no focus and announces nothing the button does not already say.
    -->
    <div
      class="flex flex-col items-center gap-2 rounded-[0.8rem] border-2 border-dashed p-6 text-center transition-colors duration-200"
      [class]="
        isDragging()
          ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30'
          : 'border-zinc-200 dark:border-zinc-800'
      "
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200"
        [class]="
          isDragging()
            ? 'bg-primary-100 dark:bg-primary-900/50'
            : 'bg-primary-50 dark:bg-primary-900/30'
        "
      >
        <i
          class="text-lg! text-primary-700 dark:text-primary-200"
          [class]="isDragging() ? 'pi pi-arrow-down' : 'pi pi-cloud-upload'"
          aria-hidden="true"
        ></i>
      </span>
      @if (isDragging()) {
        <div class="flex flex-col gap-1" aria-live="polite">
          <p class="m-0 text-sm font-semibold text-primary-700 dark:text-primary-200">
            Drop your file to upload
          </p>
          <span class="text-xs text-zinc-500 dark:text-zinc-400">CSV or XLSX only</span>
        </div>
      } @else {
        <p class="m-0 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Drag and drop your CSV or XLSX file here
        </p>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">or</span>
        <p-fileupload
          mode="basic"
          chooseLabel="Browse file"
          chooseIcon="pi pi-folder-open"
          [auto]="false"
          [accept]="accept()"
          [multiple]="false"
          [disabled]="disabled()"
          (onSelect)="onSelect($event)"
        >
          <!--
            Basic mode prints its own "No file chosen" beside the button. A chosen file replaces
            the whole drop zone in every host, so the label only ever states the obvious.
          -->
          <ng-template #filelabel></ng-template>
        </p-fileupload>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">{{ hint() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileDropZone {
  /** Legacy .xls, macro workbooks, PDF and images are unsupported, so they are not offered. */
  readonly accept = input('.csv,.xlsx');
  readonly hint = input('Supported formats: .csv, .xlsx');
  readonly disabled = input(false);

  readonly selected = output<FileSelectEvent>();
  readonly dropped = output<FileList>();

  protected readonly isDragging = signal(false);
  private readonly fileUpload = viewChild(FileUpload);

  /**
   * The widget holds its own copy of the selection. An accepted file replaces the zone, so only a
   * rejected one is ever left behind here - clearing after every pick drops it either way.
   */
  protected onSelect(event: FileSelectEvent): void {
    this.selected.emit(event);
    this.fileUpload()?.clear();
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled()) return;

    // Without this the browser navigates to the dropped file and the dialog is gone.
    event.preventDefault();
    this.isDragging.set(true);
  }

  /** Only the zone itself leaving counts - crossing onto a child fires `dragleave` too. */
  protected onDragLeave(event: DragEvent): void {
    const zone = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (next && zone.contains(next)) return;

    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (this.disabled()) return;

    event.preventDefault();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files?.length) this.dropped.emit(files);
  }
}
