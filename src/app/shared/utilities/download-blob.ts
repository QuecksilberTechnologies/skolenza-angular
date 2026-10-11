/**
 * Saves a blob to the user's machine through a synthetic anchor click.
 *
 * No-ops outside the browser: SSR has no `document` to hang the anchor off, and no
 * `URL.createObjectURL`.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
