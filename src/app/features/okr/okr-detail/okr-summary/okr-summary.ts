import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';

import { IOkr } from '@shared/interfaces';

import { resolveOkrOrigin } from '../../okr-nav';
import { OkrLevelBadge } from '../../ui/okr-level-badge';
import { OkrProgress } from '../../ui/okr-progress';
import { OkrStatusTag } from '../../ui/okr-status-tag';

@Component({
  selector: 'app-okr-summary',
  imports: [DatePipe, CardModule, ButtonModule, OkrLevelBadge, OkrStatusTag, OkrProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card class="mb-5 block">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="mb-2.5 flex flex-wrap items-center gap-2">
            <app-okr-level-badge [level]="okr().level" />
            <app-okr-status-tag [status]="okr().status" />
            <span
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {{ okr().quarter }}
            </span>
          </div>
          <h1
            class="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl dark:text-zinc-50"
          >
            {{ okr().title }}
          </h1>
          <p class="mt-1.5 text-sm text-text-secondary-light dark:text-text-secondary-dark">
            {{ okr().objective }}
          </p>
        </div>

        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <p-button
            label="Back to OKRs"
            icon="pi pi-arrow-left"
            [text]="true"
            severity="secondary"
            size="small"
            styleClass="w-full justify-center sm:w-auto"
            (onClick)="back()"
          />
          @if (canManage()) {
            <p-button
              label="Edit"
              icon="pi pi-pencil"
              [outlined]="true"
              size="small"
              styleClass="w-full justify-center sm:w-auto"
              (onClick)="edit.emit()"
            />
          }
        </div>
      </div>

      @if (okr().description) {
        <p class="mt-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          {{ okr().description }}
        </p>
      }

      <dl
        class="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-gray-100 pt-5 text-sm sm:gap-x-6 md:grid-cols-4 dark:border-zinc-800"
      >
        <div class="flex flex-col gap-1">
          <dt
            class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-secondary-light uppercase dark:text-text-secondary-dark"
          >
            <i class="pi pi-user text-[0.7rem]" aria-hidden="true"></i>
            Owner
          </dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">{{ okr().ownerName }}</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt
            class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-secondary-light uppercase dark:text-text-secondary-dark"
          >
            <i class="pi pi-sitemap text-[0.7rem]" aria-hidden="true"></i>
            Department
          </dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">{{ okr().department }}</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt
            class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-secondary-light uppercase dark:text-text-secondary-dark"
          >
            <i class="pi pi-calendar text-[0.7rem]" aria-hidden="true"></i>
            Timeline
          </dt>
          <dd class="font-medium text-gray-900 tabular-nums dark:text-zinc-100">
            {{ okr().startDate | date: 'mediumDate' }} – {{ okr().endDate | date: 'mediumDate' }}
          </dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt
            class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-secondary-light uppercase dark:text-text-secondary-dark"
          >
            <i class="pi pi-eye text-[0.7rem]" aria-hidden="true"></i>
            Visibility
          </dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">{{ okr().visibility }}</dd>
        </div>
      </dl>

      <div class="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-zinc-800/50">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700 dark:text-zinc-200">Overall progress</span>
          <span class="text-lg font-bold text-gray-900 tabular-nums dark:text-zinc-50">
            {{ okr().progress }}%
          </span>
        </div>
        <app-okr-progress [value]="okr().progress" [showLabel]="false" size="lg" />
      </div>
    </p-card>
  `,
})
export class OkrSummary {
  readonly okr = input.required<IOkr>();
  readonly canManage = input(false);
  readonly edit = output<void>();
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  get #from(): string | null {
    return this.#route.snapshot.queryParamMap.get('from');
  }

  back(): void {
    this.#router.navigateByUrl(resolveOkrOrigin(this.#from));
  }
}
