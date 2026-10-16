import { DOCUMENT, inject } from '@angular/core';
import { NavigationError } from '@angular/router';

import { Common } from './common';

const RELOAD_FLAG = 'skolenza/chunk-reload';

/**
 * A lazy route whose chunk cannot be fetched — a stale service worker after a deploy, or a
 * corrupt browser HTTP cache entry for a Vite dep (`ERR_CACHE_READ_FAILURE`, seen in Edge).
 */
const CHUNK_LOAD_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

function readFlag(win: Window): string | null {
  try {
    return win.sessionStorage.getItem(RELOAD_FLAG);
  } catch {
    return null;
  }
}

function writeFlag(win: Window, url: string): void {
  try {
    win.sessionStorage.setItem(RELOAD_FLAG, url);
  } catch {
    // Site data blocked (Edge strict tracking prevention, InPrivate): reload without the guard.
  }
}

function removeFlag(win: Window): void {
  try {
    win.sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

/**
 * Clears the one-shot reload guard so a later genuine failure on the same URL still gets a retry.
 * Takes the window explicitly — callers run outside an injection context.
 */
export function clearChunkReloadFlag(win: Window | null): void {
  if (win) {
    removeFlag(win);
  }
}

/**
 * Router-level recovery for failed navigations. Without it a rejected lazy import only reaches
 * `GlobalErrorHandler` as a console line and the user sits on an idle-looking page.
 */
export function navigationErrorHandler(event: NavigationError): void {
  const common = inject(Common);
  const win = inject(DOCUMENT).defaultView;

  const message = event.error instanceof Error ? event.error.message : String(event.error ?? '');

  if (!win || !CHUNK_LOAD_PATTERN.test(message)) {
    common.showMessage('Navigation failed. Please try again.', 'error');
    return;
  }

  // One shot per URL: a permanently broken chunk must not become a reload loop.
  if (readFlag(win) === event.url) {
    removeFlag(win);
    common.showMessage(
      'Could not load the page. Please refresh, or clear your browser cache if it keeps happening.',
      'error',
    );
    return;
  }

  writeFlag(win, event.url);
  win.location.assign(event.url);
}
