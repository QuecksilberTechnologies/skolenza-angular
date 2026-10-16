import {
  ChangeDetectionStrategy,
  Component,
  computed,
  debounced,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { SettledSearchTerm } from '@shared/interfaces';

/** An open debounce window: the term it waits on, and how to end it. */
interface PendingDebounce {
  term: string;
  timer: ReturnType<typeof setTimeout>;
  resolve: () => void;
}

/** `'  abc    def '` → `'abc def'`: spacing the user can't see must not change the query. */
function normalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * The one search box every list uses, and the only place search is rate-limited.
 *
 * `searchTerm` emits the normalised term (trimmed, inner whitespace runs collapsed to one space)
 * once typing settles, and never the same term twice in a row, so a consumer can hand it straight
 * to a store that fetches. Enter and clearing the box skip the wait — both are deliberate, so
 * making the user sit through the debounce buys nothing. Debounce, not throttle: a throttle would
 * still send the half-typed terms in between.
 *
 * Built on Angular's `debounced()` over the normalised term, so a keystroke that only adds a stray
 * space never even opens a debounce window.
 *
 * Cancelling an in-flight request is not this component's job: the store's `rxResource` /
 * `switchMap` already drops the stale response when a newer term arrives.
 */
@Component({
  selector: 'app-table-search-input',
  imports: [InputTextModule, IconFieldModule, InputIconModule],
  templateUrl: './table-search-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSearchInput {
  /**
   * Milliseconds typing must pause before the term is emitted. Server-backed lists keep the
   * default; lists that filter rows already in memory pass `0` — waiting saves no request there.
   */
  readonly debounceMs = input(300);
  readonly placeholder = input('Search...');
  readonly ariaLabel = input('Search');
  /** Fill the container at every breakpoint, for a box that sits in a flex row of its own. */
  readonly fullWidth = input(false);

  readonly searchTerm = output<SettledSearchTerm>();

  /** The box's raw text, written on every keystroke. */
  readonly #text = signal('');
  readonly #term = computed(() => normalise(this.#text()));

  // Timer bookkeeping, not render state: nothing in the template reads these, so they are plain
  // fields rather than signals.
  #pendingDebounce: PendingDebounce | undefined;
  /** Enter landed before `debounced` saw this term: settle it without waiting when it arrives. */
  #enterConfirmedTerm: string | undefined;

  readonly #settledTerm = debounced(this.#term, (term) => {
    // A newer term supersedes the open window; `debounced` already discards its promise.
    this.#dropPending();

    const ms = untracked(this.debounceMs);
    const settleNow = !term || !ms || term === this.#enterConfirmedTerm;
    this.#enterConfirmedTerm = undefined;
    // No wait for a cleared box, a list that filters in memory, or a term Enter already confirmed.
    if (settleNow) return undefined;

    return new Promise<void>((resolve) => {
      this.#pendingDebounce = { term, timer: setTimeout(() => this.#settlePending(), ms), resolve };
    });
  });

  constructor() {
    // The box starts empty, so '' counts as already emitted.
    let lastEmitted = '';
    effect(() => {
      const term = this.#settledTerm.value();
      if (term === lastEmitted) return;
      lastEmitted = term;
      // The one place a `SettledSearchTerm` is minted.
      untracked(() => this.searchTerm.emit(term as SettledSearchTerm));
    });

    inject(DestroyRef).onDestroy(() => this.#dropPending());
  }

  onSearch(event: Event) {
    // A keystroke after Enter replaces the term Enter confirmed; that one no longer skips the wait.
    this.#enterConfirmedTerm = undefined;
    this.#text.set(this.#valueOf(event));
  }

  onEnter(event: Event) {
    this.#text.set(this.#valueOf(event));
    const term = this.#term();
    if (this.#pendingDebounce?.term === term) {
      this.#settlePending();
    } else if (term !== untracked(this.#settledTerm.value)) {
      // `debounced` runs on the next effect flush; tell it to settle this term on arrival.
      this.#enterConfirmedTerm = term;
    }
  }

  #valueOf(event: Event): string {
    return (event.target as HTMLInputElement | null)?.value ?? '';
  }

  /** Settles the open window now. */
  #settlePending() {
    const resolve = this.#pendingDebounce?.resolve;
    this.#dropPending();
    resolve?.();
  }

  /** Drops the open window without settling it. */
  #dropPending() {
    if (this.#pendingDebounce) clearTimeout(this.#pendingDebounce.timer);
    this.#pendingDebounce = undefined;
  }
}
