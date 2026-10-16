import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { HistoryEvent, HistoryEventType } from '@shared/interfaces';

const EVENT_META: Record<HistoryEventType, { icon: string; ring: string }> = {
  Review: { icon: 'pi pi-file-edit', ring: 'bg-blue-500' },
  Promotion: { icon: 'pi pi-arrow-up-right', ring: 'bg-purple-500' },
  Achievement: { icon: 'pi pi-check-circle', ring: 'bg-green-500' },
  Award: { icon: 'pi pi-trophy', ring: 'bg-amber-500' },
  Feedback: { icon: 'pi pi-comments', ring: 'bg-teal-500' },
};

/** Vertical performance-history timeline. */
@Component({
  selector: 'app-pms-timeline',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="relative ml-3 border-l border-gray-200 dark:border-zinc-700">
      @for (event of events(); track event.id) {
        <li class="mb-6 ml-6">
          <span
            class="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full text-white"
            [class]="meta(event.type).ring"
          >
            <i [class]="meta(event.type).icon" class="text-xs" aria-hidden="true"></i>
          </span>
          <div class="rounded-lg bg-white p-3 shadow-sm dark:bg-zinc-900">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                {{ event.title }}
              </h3>
              <time class="text-xs text-gray-400" [attr.datetime]="event.date">
                {{ event.date | date: 'mediumDate' }}
              </time>
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">{{ event.description }}</p>
            <span class="mt-1 inline-block text-xs font-medium text-primary-500">
              {{ event.staffMemberName }} · {{ event.type }}
            </span>
          </div>
        </li>
      }
    </ol>
  `,
})
export class PmsTimeline {
  readonly events = input.required<HistoryEvent[]>();
  protected meta(type: HistoryEventType) {
    return EVENT_META[type];
  }
}
