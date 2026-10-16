import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingStore {
  readonly #busyRequestCount = signal(0);

  // Public readonly signal for components to consume
  readonly loading = computed(() => this.#busyRequestCount() > 0);

  busy() {
    this.#busyRequestCount.update((count) => count + 1);
  }

  idle() {
    this.#busyRequestCount.update((count) => Math.max(0, count - 1));
  }

  // Optional: reset all loading state
  reset() {
    this.#busyRequestCount.set(0);
  }
}
