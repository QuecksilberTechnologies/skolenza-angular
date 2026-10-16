/**
 * Appends a `<link rel="stylesheet">` once per href and resolves when it has applied.
 *
 * Lets a lazy route pull in a large vendor stylesheet at the moment it renders instead of
 * paying for it in the global `styles` bundle. No-ops outside the browser.
 */
const loaded = new Map<string, Promise<void>>();

export function loadStylesheet(href: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  const existing = loaded.get(href);
  if (existing) return existing;

  const pending = new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // Resolved against `<base href>` so a sub-path deployment still finds the file.
    link.href = new URL(href, document.baseURI).href;
    link.onload = () => resolve();
    // A missing or broken stylesheet must not wedge the caller behind an unresolved promise,
    // but it must not vanish silently either - an asset glob that stops matching is otherwise
    // invisible until someone opens the screen and finds it unstyled.
    link.onerror = () => {
      console.warn(`[loadStylesheet] failed to load ${link.href}`);
      resolve();
    };
    document.head.appendChild(link);
  });

  loaded.set(href, pending);
  return pending;
}

/** Skeleton, then theme, then palette - later rules override earlier ones. */
export function loadFullCalendarStyles(): Promise<void[]> {
  return Promise.all([
    loadStylesheet('fullcalendar/skeleton.css'),
    loadStylesheet('fullcalendar/monarch/theme.css'),
    loadStylesheet('fullcalendar/monarch/palettes/blue.css'),
  ]);
}
