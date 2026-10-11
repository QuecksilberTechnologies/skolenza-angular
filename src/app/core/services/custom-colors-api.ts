import { inject, Injectable, signal } from '@angular/core';

import { normalizeHex } from '@shared/utilities/color';

import { StorageApi } from './storage-api';

const CUSTOM_COLORS_STORAGE_KEY = 'customColors';
const MAX_CUSTOM_COLORS = 12;

@Injectable({
  providedIn: 'root',
})
export class CustomColorsApi {
  readonly #storageApi = inject(StorageApi);
  readonly #colors = signal<string[]>([]);

  readonly colors = this.#colors.asReadonly();

  async load(): Promise<void> {
    const raw = await this.#storageApi.getItem(CUSTOM_COLORS_STORAGE_KEY);
    if (!Array.isArray(raw)) {
      return;
    }

    const valid = raw
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeHex(value))
      .filter((value): value is string => value !== null);

    this.#colors.set([...new Set(valid)].slice(0, MAX_CUSTOM_COLORS));
  }

  async add(color: string): Promise<void> {
    const hex = normalizeHex(color);
    if (!hex || this.#colors().includes(hex)) {
      return;
    }

    this.#colors.update((colors) => [hex, ...colors].slice(0, MAX_CUSTOM_COLORS));
    await this.#persist();
  }

  async remove(color: string): Promise<void> {
    const hex = normalizeHex(color);
    if (!hex) {
      return;
    }

    this.#colors.update((colors) => colors.filter((value) => value !== hex));
    await this.#persist();
  }

  async #persist(): Promise<void> {
    await this.#storageApi.setItem(CUSTOM_COLORS_STORAGE_KEY, this.#colors());
  }
}
