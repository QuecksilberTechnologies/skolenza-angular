import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { TaskComment } from '@shared/interfaces';

@Component({
  selector: 'app-task-comments',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-zinc-200">
        Comments ({{ comments().length }})
      </h3>

      @if (comments().length) {
        <ul class="flex flex-col gap-3">
          @for (c of comments(); track c.id) {
            <li class="flex gap-3">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300"
              >
                {{ c.initials }}
              </span>
              <div class="flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    {{ c.author }}
                  </span>
                  <span class="text-xs text-gray-400">{{ c.createdAt }}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-zinc-300">{{ c.message }}</p>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-gray-400">No comments yet.</p>
      }

      @if (canComment()) {
        <div class="flex flex-col gap-2">
          <textarea
            rows="2"
            class="p-inputtext w-full"
            placeholder="Add a comment…"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            aria-label="Add a comment"
          ></textarea>
          <div class="flex justify-end">
            <p-button
              label="Comment"
              icon="pi pi-send"
              size="small"
              [disabled]="!draft().trim()"
              (onClick)="submit()"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class TaskComments {
  readonly comments = input.required<TaskComment[]>();
  readonly canComment = input<boolean>(true);
  readonly add = output<string>();
  protected readonly draft = signal('');

  protected submit(): void {
    const value = this.draft().trim();
    if (!value) return;
    this.add.emit(value);
    this.draft.set('');
  }
}
