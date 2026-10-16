import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';
import { SALES_EMAIL } from '@shared/utilities/subscription-plan';

import { FAQ_CATEGORIES, FaqCategory, FaqItem } from './faq-data';

/** A run of text, flagged when it matches the search term. */
export interface TextPart {
  text: string;
  match: boolean;
}

interface FaqItemView extends FaqItem {
  questionParts: TextPart[];
  answerParts: TextPart[];
}

interface FaqCategoryView extends Omit<FaqCategory, 'items'> {
  items: FaqItemView[];
}

/** Splits `text` into matching and non-matching runs of `term`, case-insensitively. */
export function splitMatches(text: string, term: string): TextPart[] {
  if (!term) {
    return [{ text, match: false }];
  }
  const parts: TextPart[] = [];
  const haystack = text.toLowerCase();
  let start = 0;
  let index = haystack.indexOf(term);
  while (index !== -1) {
    if (index > start) {
      parts.push({ text: text.slice(start, index), match: false });
    }
    parts.push({ text: text.slice(index, index + term.length), match: true });
    start = index + term.length;
    index = haystack.indexOf(term, start);
  }
  if (start < text.length) {
    parts.push({ text: text.slice(start), match: false });
  }
  return parts;
}

/** Element id of a question, kept apart from the bare fragment so it cannot collide with other ids. */
export const questionElementId = (id: string) => `faq-q-${id}`;

@Component({
  selector: 'app-help-support',
  imports: [ButtonModule, IconFieldModule, InputIconModule, InputTextModule, RouterLink],
  templateUrl: './help-support.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
})
export default class HelpSupport {
  readonly #commonService = inject(Common);
  readonly #authStore = inject(AuthStore);
  readonly #document = inject(DOCUMENT);

  protected readonly supportEmail = SALES_EMAIL;
  protected readonly questionElementId = questionElementId;
  protected readonly query = signal('');
  protected readonly activeCategory = signal<string | null>(null);
  /** Question named in the URL fragment; opened and scrolled to on arrival. */
  protected readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly #term = computed(() => this.query().trim().toLowerCase());

  /** Categories this role may see. An unknown role only sees the unrestricted ones. */
  readonly #visible = computed(() => {
    const role = this.#authStore.roleTypeId();
    return FAQ_CATEGORIES.filter(
      (category) => !category.roles || (role !== undefined && category.roles.includes(role)),
    );
  });

  /** Visible categories narrowed to search matches, with highlight runs; empty categories kept for counts. */
  readonly #matched = computed<FaqCategoryView[]>(() => {
    const term = this.#term();
    return this.#visible().map((category) => ({
      ...category,
      items: category.items
        .filter((item) => !term || `${item.question} ${item.answer}`.toLowerCase().includes(term))
        .map((item) => ({
          ...item,
          questionParts: splitMatches(item.question, term),
          answerParts: splitMatches(item.answer, term),
        })),
    }));
  });

  /** Category filter options with their match counts. */
  protected readonly categoryOptions = computed(() =>
    this.#matched().map(({ id, label, icon, items }) => ({ id, label, icon, count: items.length })),
  );

  protected readonly totalCount = computed(() =>
    this.#matched().reduce((total, category) => total + category.items.length, 0),
  );

  protected readonly filtered = computed(() => {
    const active = this.activeCategory();
    return this.#matched().filter(
      (category) => category.items.length > 0 && (!active || category.id === active),
    );
  });

  protected readonly resultCount = computed(() =>
    this.filtered().reduce((total, category) => total + category.items.length, 0),
  );

  /** While searching every match opens, so the answer is visible without a second click. */
  protected readonly isSearching = computed(() => this.#term() !== '');

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Help & Support',
      pageDescription: 'Answers to common questions',
      pageIcon: 'pi pi-question-circle',
      isBreadcrumbShow: false,
    });

    afterRenderEffect(() => {
      const id = this.fragment();
      if (id) {
        this.#document.getElementById(questionElementId(id))?.scrollIntoView({ block: 'start' });
      }
    });
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.query.set('');
    this.searchInput().nativeElement.focus();
  }

  protected selectCategory(id: string | null): void {
    this.activeCategory.set(id);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.query()) {
      event.preventDefault();
      this.clearSearch();
    }
  }

  /** `/` jumps to search unless the user is already typing somewhere. */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
      return;
    }
    event.preventDefault();
    this.searchInput().nativeElement.focus();
  }
}
