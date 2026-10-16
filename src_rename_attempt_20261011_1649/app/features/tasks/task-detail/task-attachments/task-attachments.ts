import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { TaskAttachment } from '@shared/interfaces';

@Component({
  selector: 'app-task-attachments',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-zinc-200">
          Attachments ({{ attachments().length }})
        </h3>
        @if (canUpload()) {
          <p-button
            label="Upload"
            icon="pi pi-upload"
            size="small"
            [text]="true"
            (onClick)="upload.emit()"
          />
        }
      </div>

      @if (attachments().length) {
        <ul class="flex flex-col gap-2">
          @for (a of attachments(); track a.id) {
            <li
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-2.5 dark:border-zinc-700"
            >
              <i class="pi pi-file text-lg text-gray-400"></i>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {{ a.fileName }}
                </div>
                <div class="text-xs text-gray-400">
                  {{ a.sizeLabel }} · {{ a.uploadedBy }} · {{ a.uploadedAt }}
                </div>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-gray-400">No attachments.</p>
      }
    </div>
  `,
})
export class TaskAttachments {
  readonly attachments = input.required<TaskAttachment[]>();
  readonly canUpload = input<boolean>(true);
  readonly upload = output<void>();
}
