import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';

import { IOkrAttachment } from '@shared/interfaces';

@Component({
  selector: 'app-okr-attachments',
  imports: [CardModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card class="block">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-paperclip text-sm text-primary-500" aria-hidden="true"></i>
          <h2 class="text-sm font-semibold tracking-wide text-gray-900 dark:text-zinc-100">
            Attachments
          </h2>
        </div>
        <label
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium transition focus-within:ring-2 focus-within:ring-primary-500/40 hover:bg-gray-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <i class="pi pi-upload" aria-hidden="true"></i>
          Upload
          <input type="file" class="sr-only" (change)="onUpload($event)" />
        </label>
      </div>
      @if (attachments().length) {
        <ul class="flex flex-col gap-2">
          @for (att of attachments(); track att.id) {
            <li
              class="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500 dark:bg-primary-500/15 dark:text-primary-300"
              >
                <i class="pi pi-file" aria-hidden="true"></i>
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-800 dark:text-zinc-100">
                  {{ att.fileName }}
                </p>
                <p class="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  {{ att.sizeLabel }} · {{ att.uploadedBy }}
                </p>
              </div>
              <p-button
                type="button"
                icon="pi pi-download"
                [text]="true"
                size="small"
                severity="secondary"
                [ariaLabel]="'Download ' + att.fileName"
                (onClick)="download.emit(att)"
              />
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          No attachments.
        </p>
      }
    </p-card>
  `,
})
export class OkrAttachments {
  readonly attachments = input.required<IOkrAttachment[]>();
  readonly upload = output<File>();
  readonly download = output<IOkrAttachment>();

  onUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.upload.emit(file);
    input.value = '';
  }
}
