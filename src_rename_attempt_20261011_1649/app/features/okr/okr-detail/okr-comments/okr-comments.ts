import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { IOkrComment } from '@shared/interfaces';

@Component({
  selector: 'app-okr-comments',
  imports: [DatePipe, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5 flex flex-col gap-2">
      <label for="okr-comment" class="sr-only">Add a comment</label>
      <textarea
        id="okr-comment"
        rows="2"
        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition placeholder:text-text-secondary-light focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-text-secondary-dark"
        placeholder="Add a comment…"
        [value]="draft()"
        (input)="draft.set($any($event.target).value)"
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

    @if (comments().length) {
      <ul class="flex flex-col divide-y divide-gray-100 dark:divide-zinc-800">
        @for (cmt of comments(); track cmt.id) {
          <li class="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300"
            >
              {{ cmt.initials }}
            </span>
            <div class="min-w-0">
              <p class="text-sm text-gray-900 dark:text-zinc-100">
                <strong class="font-medium">{{ cmt.author }}</strong>
                <time class="ml-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  {{ cmt.createdAt | date: 'short' }}
                </time>
              </p>
              <p class="mt-0.5 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                {{ cmt.message }}
              </p>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        Be the first to comment.
      </p>
    }
  `,
})
export class OkrComments {
  readonly comments = input.required<IOkrComment[]>();
  readonly addComment = output<string>();

  readonly draft = signal('');

  submit(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.addComment.emit(text);
    this.draft.set('');
  }
}
