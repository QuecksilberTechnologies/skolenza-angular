import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';

import { KnowledgeStore } from '../store/knowledge.store';
import { LdMarkdownPipe } from '../ui/ld-markdown.pipe';

@Component({
  selector: 'app-ld-knowledge',
  imports: [FormsModule, InputTextModule, DatePipe, LdMarkdownPipe, TableEmptyMessage],
  providers: [KnowledgeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
      <!-- Sidebar -->
      <aside
        class="flex flex-col gap-2 rounded-xl border border-border-light bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <span class="relative">
          <i
            class="pi pi-search pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400"
            aria-hidden="true"
          ></i>
          <input
            pInputText
            type="search"
            placeholder="Search articles"
            class="w-full !pl-9"
            aria-label="Search knowledge base"
            [ngModel]="store.filter().search ?? ''"
            (ngModelChange)="store.setSearch($event)"
          />
        </span>

        <h3 class="mt-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">Categories</h3>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-left text-sm transition"
          [class]="
            !store.filter().category
              ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
              : 'text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
          "
          (click)="store.setCategory(null)"
        >
          All
        </button>
        @for (cat of store.categories(); track cat) {
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-left text-sm transition"
            [class]="
              store.filter().category === cat
                ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                : 'text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
            "
            (click)="store.setCategory(cat)"
          >
            {{ cat }}
          </button>
        }

        @if (store.popular().length) {
          <h3 class="mt-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Popular</h3>
          @for (a of store.popular(); track a.id) {
            <button
              type="button"
              class="truncate rounded-lg px-3 py-1 text-left text-sm text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              (click)="store.select(a.id)"
            >
              <i class="pi pi-star-fill mr-1 text-[0.65rem] text-amber-400" aria-hidden="true"></i>
              {{ a.title }}
            </button>
          }
        }
      </aside>

      <!-- Main -->
      <section>
        @if (store.selectedArticle(); as article) {
          <article
            class="rounded-xl border border-border-light bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              class="mb-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-300"
              (click)="store.select('')"
            >
              <i class="pi pi-arrow-left text-xs" aria-hidden="true"></i>
              Back to articles
            </button>
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <span class="text-xs font-medium text-primary-600 dark:text-primary-300">
                  {{ article.category }}
                </span>
                <h1 class="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  {{ article.title }}
                </h1>
                <p class="mt-1 text-xs text-gray-400">
                  By {{ article.author }} · Updated {{ article.updatedAt | date: 'mediumDate' }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg border border-border-light px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                [attr.aria-pressed]="store.isBookmarked(article.id)"
                (click)="store.toggleBookmark(article.id)"
              >
                <i
                  [class]="
                    store.isBookmarked(article.id) ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'
                  "
                  aria-hidden="true"
                ></i>
                <span class="ml-1">{{ store.isBookmarked(article.id) ? 'Saved' : 'Save' }}</span>
              </button>
            </div>

            <div
              class="text-sm text-gray-700 dark:text-zinc-300"
              [innerHTML]="article.content | ldMarkdown"
            ></div>

            @if (article.attachments.length) {
              <div class="mt-5 border-t border-border-light pt-4 dark:border-zinc-800">
                <h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  Attachments
                </h3>
                <ul class="flex flex-wrap gap-2">
                  @for (att of article.attachments; track att.name) {
                    <li>
                      <a
                        [href]="att.url"
                        class="inline-flex items-center gap-2 rounded-lg border border-border-light px-3 py-1.5 text-sm text-primary-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-primary-300 dark:hover:bg-zinc-800"
                      >
                        <i class="pi pi-paperclip" aria-hidden="true"></i>
                        {{ att.name }}
                      </a>
                    </li>
                  }
                </ul>
              </div>
            }
          </article>
        } @else if (!store.filteredArticles().length) {
          <app-table-empty-message
            icon="pi pi-database"
            message="No articles found"
            subMessage="Try a different search or category."
          />
        } @else {
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            @for (a of store.filteredArticles(); track a.id) {
              <button
                type="button"
                class="flex flex-col rounded-xl border border-border-light bg-white p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-zinc-800 dark:bg-zinc-900"
                (click)="store.select(a.id)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-medium text-primary-600 dark:text-primary-300">
                    {{ a.category }}
                  </span>
                  @if (a.popular) {
                    <i class="pi pi-star-fill text-xs text-amber-400" aria-hidden="true"></i>
                  }
                </div>
                <h3 class="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  {{ a.title }}
                </h3>
                <p class="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-zinc-400">
                  {{ a.summary }}
                </p>
                <p class="mt-2 text-xs text-gray-400">
                  {{ a.author }} · {{ a.updatedAt | date: 'mediumDate' }}
                </p>
              </button>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export default class LdKnowledge {
  protected readonly store = inject(KnowledgeStore);
}
