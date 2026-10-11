import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Certificate } from '@shared/interfaces';

@Component({
  selector: 'app-ld-certificate-card',
  imports: [ButtonModule, TooltipModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="flex h-full flex-col overflow-hidden rounded-xl border-0 bg-white shadow transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="flex items-center gap-3 bg-primary-50/60 px-4 py-3 dark:bg-primary-900/20">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-200"
        >
          <i class="pi pi-verified text-xl" aria-hidden="true"></i>
        </span>
        <div class="min-w-0">
          <p
            class="text-[0.7rem] font-medium tracking-wide text-primary-600 uppercase dark:text-primary-300"
          >
            Certificate of Completion
          </p>
          <h3 class="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {{ certificate().courseTitle }}
          </h3>
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-2 p-4 text-xs text-gray-600 dark:text-zinc-300">
        <div class="flex justify-between gap-2">
          <span class="text-gray-400 dark:text-zinc-500">Certificate No.</span>
          <span class="font-medium tabular-nums">{{ certificate().certificateNumber }}</span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-gray-400 dark:text-zinc-500">Completed</span>
          <span class="font-medium">{{ certificate().completionDate | date: 'mediumDate' }}</span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-gray-400 dark:text-zinc-500">Instructor</span>
          <span class="font-medium">{{ certificate().instructor }}</span>
        </div>

        <div class="mt-2 flex flex-wrap gap-1">
          @for (skill of certificate().skills; track skill) {
            <span
              class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {{ skill }}
            </span>
          }
        </div>

        <div class="mt-auto flex items-center gap-2 pt-3">
          <p-button
            label="Download"
            icon="pi pi-download"
            size="small"
            styleClass="flex-1"
            (onClick)="download.emit(certificate())"
          />
          <p-button
            icon="pi pi-share-alt"
            size="small"
            severity="secondary"
            [outlined]="true"
            ariaLabel="Share certificate"
            pTooltip="Share"
            (onClick)="share.emit(certificate())"
          />
        </div>
      </div>
    </article>
  `,
})
export class LdCertificateCard {
  readonly certificate = input.required<Certificate>();
  readonly download = output<Certificate>();
  readonly share = output<Certificate>();
}
