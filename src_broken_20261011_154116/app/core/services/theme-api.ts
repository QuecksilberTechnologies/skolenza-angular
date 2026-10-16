import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

import { StorageApi } from './storage-api';

@Injectable({
  providedIn: 'root',
})
export class ThemeApi {
  readonly #document = inject(DOCUMENT);
  readonly #storageApi = inject(StorageApi);

  // Private signals
  readonly #isDarkMode = signal(false);

  // Public readonly signals for components
  readonly isDarkMode = this.#isDarkMode.asReadonly();

  private readonly allowedThemes = new Set(['light', 'dark']);

  setDarkMode(value: boolean) {
    this.#isDarkMode.set(value);
  }

  toggleThemeMode() {
    this.#isDarkMode.set(!this.isDarkMode());
  }

  setTheme(themeName: string) {
    if (!this.allowedThemes.has(themeName)) return;
    this.#document.documentElement.className = themeName;
    this.#document.documentElement.setAttribute('data-color-scheme', themeName);
    localStorage.setItem(this.#storageApi.prefixKey('theme'), themeName);
  }

  getTheme() {
    return localStorage.getItem(this.#storageApi.prefixKey('theme'));
  }
}
